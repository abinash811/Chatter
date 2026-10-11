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
  var appearance = {
    greeting: "Hi! How can I help you today?",
    accentColor: "#065f46",
    avatarEmoji: "💬",
    position: "bottom-right",
    suggestedReplies: [],
  };

  // Applies position to the host element itself (not just CSS inside the
  // shadow root) since it controls which side of the *page* the bubble
  // sits on, not anything inside the widget's own isolated window.
  function applyPosition() {
    if (appearance.position === "bottom-left") {
      host.style.left = "20px";
      host.style.right = "";
      windowEl.style.right = "";
      windowEl.style.left = "0";
    } else {
      host.style.right = "20px";
      host.style.left = "";
      windowEl.style.left = "";
      windowEl.style.right = "0";
    }
  }

  root.innerHTML =
    '<style>' +
    '  :host { all: initial; }' +
    '  .bubble { width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer;' +
    '    display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,.2); font-size: 26px; line-height: 1; }' +
    '  .window { display: none; flex-direction: column; width: 320px; height: 440px; border-radius: 12px;' +
    '    box-shadow: 0 4px 24px rgba(0,0,0,.25); background: #fff; overflow: hidden; position: absolute; bottom: 68px;' +
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
    '  .suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 12px; }' +
    '  .suggestion { border: 1px solid #ddd; background: #fff; border-radius: 999px; padding: 6px 12px;' +
    '    font: inherit; font-size: 13px; cursor: pointer; }' +
    // ADR 0028 — an in-chat widget (form) rendered inline, styled to
    // read as part of the transcript rather than a separate surface.
    '  .widget-form { align-self: flex-start; max-width: 90%; display: flex; flex-direction: column; gap: 8px;' +
    '    background: #f1f1f4; border-radius: 10px; padding: 10px 12px; }' +
    '  .widget-field { display: flex; flex-direction: column; gap: 3px; }' +
    '  .widget-field label { font-size: 12px; font-weight: 600; }' +
    '  .widget-field input, .widget-field select { border: 1px solid #ddd; border-radius: 6px; padding: 6px 8px; font: inherit; }' +
    '  .widget-field.checkbox { flex-direction: row; align-items: center; gap: 6px; }' +
    '  .widget-submit { border: none; border-radius: 8px; padding: 8px 12px; color: white; cursor: pointer; align-self: flex-start; }' +
    '</style>' +
    '<div class="window" part="window">' +
    '  <div class="header" part="header"></div>' +
    '  <div class="messages" part="messages"></div>' +
    '  <div class="suggestions" part="suggestions"></div>' +
    '  <form class="composer">' +
    '    <input type="text" placeholder="Type a message..." autocomplete="off" />' +
    '    <button type="submit" part="send">Send</button>' +
    '  </form>' +
    '</div>' +
    '<button class="bubble" part="bubble" aria-label="Open chat"></button>';

  var bubble = root.querySelector(".bubble");
  var windowEl = root.querySelector(".window");
  var header = root.querySelector(".header");
  var messagesEl = root.querySelector(".messages");
  var suggestionsEl = root.querySelector(".suggestions");
  var form = root.querySelector(".composer");
  var input = root.querySelector("input");
  var sendButton = root.querySelector("button[type=submit]");

  function applyAppearance() {
    bubble.style.background = appearance.accentColor;
    bubble.textContent = appearance.avatarEmoji;
    header.style.background = appearance.accentColor;
    header.textContent = "Chat";
    sendButton.style.background = appearance.accentColor;
    applyPosition();
    if (messagesEl.children.length === 0) {
      appendMessage("assistant", appearance.greeting);
      renderSuggestions();
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

  // ADR 0028 — renders a form inline from the widget's JSON Schema
  // (properties/required/enum), collected values on submit sent back as
  // the visitor's own next chat message — no new endpoint, the model
  // reads the submission like any other typed reply.
  function renderWidget(payload) {
    var schema = payload.schema || {};
    var properties = schema.properties || {};
    var required = schema.required || [];

    var formEl = document.createElement("form");
    formEl.className = "widget-form";

    var inputs = {};
    Object.keys(properties).forEach(function (name) {
      var prop = properties[name];
      var fieldWrap = document.createElement("div");
      fieldWrap.className = "widget-field" + (prop.type === "boolean" ? " checkbox" : "");

      var label = document.createElement("label");
      var inputId = "widget-field-" + name;
      label.setAttribute("for", inputId);
      label.textContent = (prop.title || name) + (required.indexOf(name) !== -1 ? " *" : "");

      var input;
      if (prop.enum) {
        input = document.createElement("select");
        prop.enum.forEach(function (option) {
          var optionEl = document.createElement("option");
          optionEl.value = option;
          optionEl.textContent = option;
          input.appendChild(optionEl);
        });
      } else if (prop.type === "boolean") {
        input = document.createElement("input");
        input.type = "checkbox";
      } else if (prop.type === "number") {
        input = document.createElement("input");
        input.type = "number";
      } else {
        input = document.createElement("input");
        input.type = "text";
      }
      input.id = inputId;
      input.name = name;
      if (required.indexOf(name) !== -1 && prop.type !== "boolean") input.required = true;

      if (prop.type === "boolean") {
        fieldWrap.appendChild(input);
        fieldWrap.appendChild(label);
      } else {
        fieldWrap.appendChild(label);
        fieldWrap.appendChild(input);
      }
      formEl.appendChild(fieldWrap);
      inputs[name] = { el: input, prop: prop };
    });

    var submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "widget-submit";
    submitButton.textContent = payload.submitLabel || "Submit";
    submitButton.style.background = appearance.accentColor;
    formEl.appendChild(submitButton);

    formEl.addEventListener("submit", function (e) {
      e.preventDefault();
      var parts = [];
      Object.keys(inputs).forEach(function (name) {
        var entry = inputs[name];
        var value = entry.prop.type === "boolean" ? entry.el.checked : entry.el.value;
        if (value === "" || value === false) return;
        parts.push((entry.prop.title || name) + ": " + value);
      });
      formEl.remove();
      sendText(parts.join(", "));
    });

    messagesEl.appendChild(formEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Shown once, under the greeting, so a first-time visitor has
  // something to tap instead of a blank input — cleared the moment a
  // real conversation starts (own click or typed message), same as the
  // reference product's own suggested-reply chips.
  function renderSuggestions() {
    suggestionsEl.innerHTML = "";
    appearance.suggestedReplies.forEach(function (reply) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "suggestion";
      btn.textContent = reply;
      btn.addEventListener("click", function () {
        sendText(reply);
      });
      suggestionsEl.appendChild(btn);
    });
  }

  async function sendText(text) {
    if (!text) return;
    suggestionsEl.innerHTML = "";
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
      // data.reply is null when a business owner has paused this
      // conversation from the console (ADR 0027) — the message above was
      // still recorded, there's just no AI reply to show for this turn.
      if (data.reply) appendMessage("assistant", data.reply);
      if (data.widget) renderWidget(data.widget);
    } catch (err) {
      console.error("[Chatter widget]", err);
      appendMessage("assistant", "Sorry, something went wrong. Please try again.");
    }
  }

  bubble.addEventListener("click", function () {
    windowEl.classList.toggle("open");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendText(text);
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
