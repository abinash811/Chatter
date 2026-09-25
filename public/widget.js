(function () {
  "use strict";

  // Embed snippet looks like:
  //   <script src="https://chatter.example.com/widget.js" data-bot-key="..."></script>
  // Shadow DOM per docs/architecture.md §4 — the host site's CSS can't
  // leak in, and this widget's CSS can't leak out onto their page.
  var scriptTag = document.currentScript;
  var botKey = scriptTag.getAttribute("data-bot-key");
  // Derive our own origin from where this script was loaded from, not
  // from window.location — the host page is on a different domain.
  var apiOrigin = new URL(scriptTag.src).origin;

  if (!botKey) {
    console.error("[Chatter widget] Missing data-bot-key attribute — widget not started.");
    return;
  }

  var host = document.createElement("div");
  host.id = "chatter-widget-host";
  host.style.position = "fixed";
  host.style.bottom = "20px";
  host.style.right = "20px";
  host.style.zIndex = "2147483647";
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  // KNOWN LIMITATION: conversationId lives only in memory, so a page
  // reload starts a fresh conversation. Persisting it (localStorage,
  // keyed by botKey) is a follow-up, not done here.
  var conversationId = null;
  // Matches lib/ai/botConfig.ts's DEFAULT_APPEARANCE (ADR 0008's emerald,
  // not left over from ADR 0007's violet) — this is only the fallback
  // before /api/widget/config responds with the business's real value.
  var appearance = { greeting: "Hi! How can I help you today?", accentColor: "#065f46" };

  root.innerHTML =
    '<style>' +
    '  :host { all: initial; }' +
    '  .bubble { width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer;' +
    '    display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,.2); }' +
    '  .bubble svg { width: 26px; height: 26px; fill: white; }' +
    '  .window { display: none; flex-direction: column; width: 320px; height: 440px; border-radius: 12px;' +
    '    box-shadow: 0 4px 24px rgba(0,0,0,.25); background: #fff; overflow: hidden; position: absolute; bottom: 68px; right: 0;' +
    '    font-family: system-ui, sans-serif; font-size: 14px; }' +
    '  .window.open { display: flex; }' +
    '  .header { padding: 12px 16px; color: white; font-weight: 600; }' +
    '  .messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }' +
    '  .msg { max-width: 80%; padding: 8px 12px; border-radius: 10px; line-height: 1.4; white-space: pre-wrap; }' +
    '  .msg.assistant { background: #f1f1f4; align-self: flex-start; }' +
    '  .msg.user { color: white; align-self: flex-end; }' +
    '  .composer { display: flex; border-top: 1px solid #eee; padding: 8px; gap: 6px; }' +
    '  .composer input { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 8px; font: inherit; }' +
    '  .composer button { border: none; border-radius: 8px; padding: 8px 12px; color: white; cursor: pointer; }' +
    '</style>' +
    '<div class="window" part="window">' +
    '  <div class="header" part="header"></div>' +
    '  <div class="messages" part="messages"></div>' +
    '  <form class="composer">' +
    '    <input type="text" placeholder="Type a message..." autocomplete="off" />' +
    '    <button type="submit" part="send">Send</button>' +
    '  </form>' +
    '</div>' +
    '<button class="bubble" part="bubble" aria-label="Open chat">' +
    '  <svg viewBox="0 0 24 24"><path d="M2 3h20v14H6l-4 4V3z"/></svg>' +
    '</button>';

  var bubble = root.querySelector(".bubble");
  var windowEl = root.querySelector(".window");
  var header = root.querySelector(".header");
  var messagesEl = root.querySelector(".messages");
  var form = root.querySelector(".composer");
  var input = root.querySelector("input");
  var sendButton = root.querySelector("button[type=submit]");

  function applyAppearance() {
    bubble.style.background = appearance.accentColor;
    header.style.background = appearance.accentColor;
    header.textContent = "Chat";
    sendButton.style.background = appearance.accentColor;
    if (messagesEl.children.length === 0) {
      appendMessage("assistant", appearance.greeting);
    }
  }

  function appendMessage(role, text) {
    var el = document.createElement("div");
    el.className = "msg " + role;
    el.textContent = text;
    if (role === "user") el.style.background = appearance.accentColor;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  bubble.addEventListener("click", function () {
    windowEl.classList.toggle("open");
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    appendMessage("user", text);

    try {
      var res = await fetch(apiOrigin + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botKey: botKey, conversationId: conversationId, message: text }),
      });
      if (!res.ok) throw new Error("chat request failed: " + res.status);
      var data = await res.json();
      conversationId = data.conversationId;
      appendMessage("assistant", data.reply);
    } catch (err) {
      console.error("[Chatter widget]", err);
      appendMessage("assistant", "Sorry, something went wrong. Please try again.");
    }
  });

  fetch(apiOrigin + "/api/widget/config?botKey=" + encodeURIComponent(botKey))
    .then(function (res) {
      if (!res.ok) throw new Error("config request failed: " + res.status);
      return res.json();
    })
    .then(function (config) {
      appearance = config;
      applyAppearance();
    })
    .catch(function (err) {
      console.error("[Chatter widget] Failed to load appearance config, using defaults.", err);
      applyAppearance();
    });
})();
