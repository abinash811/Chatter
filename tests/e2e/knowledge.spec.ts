import { test, expect } from "@playwright/test";
import { signUpAndCreateBot } from "./helpers";

// Coverage note: creating a real Q&A/file/URL entry requires a working
// embeddings call (lib/ai/embeddings.ts, Voyage AI) — VOYAGE_API_KEY is
// a placeholder in every environment this suite runs in (dev sandbox
// and CI alike, same class of gap as the documented missing
// ANTHROPIC_API_KEY), so the happy path here is deterministically the
// error path. list-rendering and delete were verified for real instead
// against a real Postgres instance with a directly-seeded entry — see
// docs/business-logic.md's Knowledge base ingestion section. The SSRF
// guard test below (ADR 0013) is a real, deterministic exception — it
// fails before ever reaching the embeddings call, so it verifies actual
// behavior, not just that the error path is hit.

async function openAddMenu(page: import("@playwright/test").Page, item: "Add Q&A" | "Upload file" | "Add URL") {
  await page.click('button:has-text("Add")');
  await page.click(`div[role="menu"] >> text="${item}"`);
}

test("knowledge page shows the empty state before any entry exists", async ({ page }) => {
  await signUpAndCreateBot(page, "Empty KB Bot");
  await page.goto(page.url() + "/knowledge");
  await expect(page.getByText("No knowledge yet")).toBeVisible();
});

test("the Add menu offers Q&A, file, and URL entry points", async ({ page }) => {
  await signUpAndCreateBot(page, "Add Menu KB Bot");
  await page.goto(page.url() + "/knowledge");

  await page.click('button:has-text("Add")');
  await expect(page.getByRole("menuitem", { name: "Add Q&A" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Upload file" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Add URL" })).toBeVisible();
});

test("Add Q&A dialog opens with Question/Answer fields and Cancel closes it without saving", async ({ page }) => {
  await signUpAndCreateBot(page, "Cancel KB Bot");
  await page.goto(page.url() + "/knowledge");

  await openAddMenu(page, "Add Q&A");
  await expect(page.getByRole("heading", { name: "Add a question and answer" })).toBeVisible();
  await expect(page.locator("#question")).toBeVisible();
  await expect(page.locator("#answer")).toBeVisible();

  await page.click('div[role="dialog"] button:has-text("Cancel")');
  await expect(page.getByRole("heading", { name: "Add a question and answer" })).toBeHidden();
  await expect(page.getByText("No knowledge yet")).toBeVisible();
});

test("a failed Q&A save shows a plain-language error toast and preserves the typed question/answer", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "Failed Save KB Bot");
  await page.goto(page.url() + "/knowledge");

  await openAddMenu(page, "Add Q&A");
  await page.fill("#question", "What is your return policy?");
  await page.fill("#answer", "You can return any item within 30 days.");
  await page.click('button[form="add-qa-form"]');

  // Real fix, real regression test: a Server Action's <form> resets its
  // uncontrolled fields on completion regardless of success/failure —
  // caught by actually checking inputValue() after a failed submit, not
  // assumed from a screenshot. actions.ts now echoes question/answer
  // back in the error state so AddQaDialog.tsx can re-seed them via
  // defaultValue.
  await expect(page.getByText(/Couldn't save that entry/)).toBeVisible();
  await expect(page.locator("#question")).toHaveValue("What is your return policy?");
  await expect(page.locator("#answer")).toHaveValue("You can return any item within 30 days.");
});

test("Upload file dialog opens with a file input and Cancel closes it without saving", async ({ page }) => {
  await signUpAndCreateBot(page, "Cancel File KB Bot");
  await page.goto(page.url() + "/knowledge");

  await openAddMenu(page, "Upload file");
  await expect(page.getByRole("heading", { name: "Upload a file" })).toBeVisible();
  await expect(page.locator("#file")).toBeVisible();

  await page.click('div[role="dialog"] button:has-text("Cancel")');
  await expect(page.getByRole("heading", { name: "Upload a file" })).toBeHidden();
  await expect(page.getByText("No knowledge yet")).toBeVisible();
});

test("uploading a real .txt file extracts+chunks it for real, then fails at the (placeholder-keyed) embeddings call", async ({
  page,
}) => {
  await signUpAndCreateBot(page, "Failed Upload KB Bot");
  await page.goto(page.url() + "/knowledge");

  await openAddMenu(page, "Upload file");
  await page.setInputFiles("#file", {
    name: "hours.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Our store is open Monday to Friday, 9am to 5pm."),
  });
  await page.click('button[form="add-file-form"]');

  await expect(page.getByText(/Couldn't process that file/)).toBeVisible();
  await expect(page.getByText("No knowledge yet")).toBeVisible();
});

test("Add URL dialog opens with a URL input and Cancel closes it without saving", async ({ page }) => {
  await signUpAndCreateBot(page, "Cancel URL KB Bot");
  await page.goto(page.url() + "/knowledge");

  await openAddMenu(page, "Add URL");
  await expect(page.getByRole("heading", { name: "Add a URL" })).toBeVisible();
  await expect(page.locator("#url")).toBeVisible();

  await page.click('div[role="dialog"] button:has-text("Cancel")');
  await expect(page.getByRole("heading", { name: "Add a URL" })).toBeHidden();
  await expect(page.getByText("No knowledge yet")).toBeVisible();
});

test("a private/local URL is rejected by the real SSRF guard before any fetch (ADR 0013)", async ({ page }) => {
  await signUpAndCreateBot(page, "SSRF KB Bot");
  await page.goto(page.url() + "/knowledge");

  await openAddMenu(page, "Add URL");
  await page.fill("#url", "http://localhost/admin");
  await page.click('button[form="add-url-form"]');

  await expect(page.getByText(/private or local address/)).toBeVisible();
  await expect(page.locator("#url")).toHaveValue("http://localhost/admin");
});

test("a bot's knowledge is reachable from the bot editor's top bar", async ({ page }) => {
  await signUpAndCreateBot(page, "Nav KB Bot");
  await page.click('a:has-text("Knowledge")');
  await expect(page).toHaveURL(/\/knowledge$/);
  await expect(page.getByText("Knowledge base")).toBeVisible();
});
