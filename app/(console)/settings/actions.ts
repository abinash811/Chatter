"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import { withOrgContext } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export interface SettingsState {
  status: "idle" | "success" | "error";
  message: string | null;
}

// A "use server" file may only export async functions — the idle-state
// constant lives in SettingsForm.tsx instead (learned the hard way on
// the knowledge feature: exporting one from here 500's every render).

// Same useActionState + toast pattern as every other console form
// (BotEditorForm.tsx, KnowledgeForm.tsx). The API key field is never
// pre-filled with the real decrypted value — SettingsForm.tsx shows
// "A key is set" instead and a blank field means "no change," so a
// save here only touches anthropicApiKeyEncrypted when a new value was
// actually typed.
export async function saveSettingsAction(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const orgName = String(formData.get("orgName") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!orgName) {
    return { status: "error", message: "Workspace name can't be empty." };
  }

  try {
    const session = await getCurrentSession();
    await withOrgContext(session.orgId, (tx) =>
      tx.org.update({
        where: { id: session.orgId },
        data: {
          name: orgName,
          ...(apiKey ? { anthropicApiKeyEncrypted: encrypt(apiKey) } : {}),
        },
      }),
    );
    revalidatePath("/settings");
    return { status: "success", message: apiKey ? "Settings saved — now using your own API key." : "Settings saved." };
  } catch (err) {
    console.error("[saveSettingsAction]", err);
    return { status: "error", message: "Couldn't save your changes. Please try again." };
  }
}

export async function removeApiKeyAction(_prevState: SettingsState): Promise<SettingsState> {
  try {
    const session = await getCurrentSession();
    await withOrgContext(session.orgId, (tx) =>
      tx.org.update({ where: { id: session.orgId }, data: { anthropicApiKeyEncrypted: null } }),
    );
    revalidatePath("/settings");
    return { status: "success", message: "Removed — back to our managed API key." };
  } catch (err) {
    console.error("[removeApiKeyAction]", err);
    return { status: "error", message: "Couldn't remove the key. Please try again." };
  }
}
