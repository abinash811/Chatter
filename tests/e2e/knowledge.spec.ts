import { test, expect } from "@playwright/test";
import { signUpAndCreateBot } from "./helpers";

// Coverage note: creating a real Q&A entry requires a working embeddings
// call (lib/ai/embeddings.ts, Voyage AI) — VOYAGE_API_KEY is a
// placeholder in every environment this suite runs in (dev sandbox and
// CI alike, same class of gap as the documented missing
// ANTHROPIC_API_KEY), so the happy path here is deterministically the
// error path. list-rendering and delete were verified for real instead
// against a real Postgres instance with a directly-seeded entry — see
// docs/business-logic.md's Knowledge base ingestion section.

test("knowledge page shows the empty state before any entry exists", async ({ page }) => {
  await signUpAndCreateBot(page, "Empty KB Bot");
  await page.goto(page.url() + "/knowledge");
  await expect(page.getByText("No knowledge yet")).toBeVisible();
});

test("Add Q&A dialog opens with Question/Answer fields and Cancel closes it without saving", async ({ page }) => {
  await signUpAndCreateBot(page, "Cancel KB Bot");
  await page.goto(page.url() + "/knowledge");

  await page.click('button:has-text("Add Q&A")');
  await expect(page.getByRole("heading", { name: "Add a question and answer" })).toBeVisible();
  await expect(page.locator("#question")).toBeVisible();
  await expect(page.locator("#answer")).toBeVisible();

  await page.click('div[role="dialog"] button:has-text("Cancel")');
  await expect(page.getByRole("heading", { name: "Add a question and answer" })).toBeHidden();
  await expect(page.getByText("No knowledge yet")).toBeVisible();
});

test("a failed save shows a plain-language error toast and preserves the typed question/answer", async ({ page }) => {
  await signUpAndCreateBot(page, "Failed Save KB Bot");
  await page.goto(page.url() + "/knowledge");

  await page.click('button:has-text("Add Q&A")');
  await page.fill("#question", "What is your return policy?");
  await page.fill("#answer", "You can return any item within 30 days.");
  await page.click('button[form="add-qa-form"]');

  // Real fix, real regression test: a Server Action's <form> resets its
  // uncontrolled fields on completion regardless of success/failure —
  // caught by actually checking inputValue() after a failed submit, not
  // assumed from a screenshot. actions.ts now echoes question/answer
  // back in the error state so KnowledgeForm.tsx can re-seed them via
  // defaultValue.
  await expect(page.getByText(/Couldn't save that entry/)).toBeVisible();
  await expect(page.locator("#question")).toHaveValue("What is your return policy?");
  await expect(page.locator("#answer")).toHaveValue("You can return any item within 30 days.");
});

test("a bot's knowledge is reachable from the bot editor's top bar", async ({ page }) => {
  await signUpAndCreateBot(page, "Nav KB Bot");
  await page.click('a:has-text("Knowledge")');
  await expect(page).toHaveURL(/\/knowledge$/);
  await expect(page.getByText("Knowledge base")).toBeVisible();
});
