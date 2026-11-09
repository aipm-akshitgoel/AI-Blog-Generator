import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUnlockState, passwordViewerEmails, resetUnlockState } from "@/lib/unlockPatternStore";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unlock pattern admin", robots: { index: false, follow: false } };

async function isOwner(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  const allowed = passwordViewerEmails();
  return user.emailAddresses.some((e) => allowed.includes(e.emailAddress.toLowerCase()));
}

async function resetAction() {
  "use server";
  if (!(await isOwner())) return;
  await resetUnlockState();
  revalidatePath("/password/attempts");
}

/** Owner-only admin: everyone sees tries live on /password; this page only adds a reset. */
export default async function PasswordAdminPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!(await isOwner())) return <main style={{ padding: 24, fontFamily: "system-ui" }}>Not authorised.</main>;

  const state = await getUnlockState();
  const visitors = Object.values(state.sessions).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaf0", fontFamily: "system-ui", padding: "24px 16px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Unlock pattern admin</h1>
        <p style={{ color: "#a6abb8" }}>
          Tries used: {state.tries.length} of 3 · patterns drawn: {state.drawn.length}. The live view is at{" "}
          <a href="/password" style={{ color: "#6aa8ff" }}>/password</a>.
        </p>
        <form action={resetAction}>
          <button
            type="submit"
            style={{ padding: "12px 16px", borderRadius: 10, border: "none", background: "#e5484d", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Reset — clear all tries and drawings
          </button>
        </form>
        <h2 style={{ fontSize: 15, color: "#a6abb8", marginTop: 24 }}>Visitors</h2>
        {visitors.length === 0 && <p style={{ color: "#6b7180" }}>None yet</p>}
        <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: "#a6abb8" }}>
          {visitors.map((v) => (
            <li key={v.session}>
              {new Date(v.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
              {v.country ? ` · ${v.country}` : ""} · {v.userAgent}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
