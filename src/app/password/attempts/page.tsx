import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listUnlockPatterns, passwordViewerEmails } from "@/lib/unlockPatternStore";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unlock pattern attempts", robots: { index: false, follow: false } };

function PatternGrid({ pattern }: { pattern: number[] }) {
  const pt = (i: number) => ({ x: 20 + 30 * (i % 3), y: 20 + 30 * Math.floor(i / 3) });
  const points = pattern.map((i) => `${pt(i).x},${pt(i).y}`).join(" ");
  const start = pt(pattern[0]);
  return (
    <svg viewBox="0 0 100 100" width={96} height={96} style={{ background: "#161a21", borderRadius: 10, flex: "none" }}>
      <polyline points={points} fill="none" stroke="#6aa8ff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={pt(i).x} cy={pt(i).y} r={pattern.includes(i) ? 5 : 3.5} fill={pattern.includes(i) ? "#6aa8ff" : "#5b6170"} />
      ))}
      <circle cx={start.x} cy={start.y} r={9} fill="none" stroke="#3ccf8e" strokeWidth={2} />
    </svg>
  );
}

const seq = (p: number[]) => p.map((i) => i + 1).join(" → ");

export default async function PasswordAttemptsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const allowed = passwordViewerEmails();
  const emails = user.emailAddresses.map((e) => e.emailAddress.toLowerCase());
  if (!emails.some((e) => allowed.includes(e))) {
    return <main style={{ padding: 24, fontFamily: "system-ui" }}>Not authorised.</main>;
  }

  const records = await listUnlockPatterns();

  return (
    <main style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaf0", fontFamily: "system-ui", padding: "24px 16px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, margin: "0 0 4px" }}>Unlock pattern attempts</h1>
        <p style={{ color: "#a6abb8", margin: "0 0 20px" }}>
          Dots: 1-2-3 top row, 4-5-6 middle, 7-8-9 bottom. Green ring = start. Newest visitor first. Refresh for new attempts.
        </p>
        {records.length === 0 && <p>No attempts yet.</p>}
        {records.map((r) => (
          <section key={r.session} style={{ background: "#1b1f27", borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "#a6abb8", marginBottom: 12 }}>
              Last activity {new Date(r.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
              {r.country ? ` · ${r.country}` : ""} · {r.userAgent?.slice(0, 80)}
            </div>
            <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Saved tries ({r.saved.length})</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              {r.saved.length === 0 && <span style={{ color: "#a6abb8" }}>None saved yet</span>}
              {r.saved.map((p, k) => (
                <div key={k} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <PatternGrid pattern={p} />
                  <div>
                    <div>Try {k + 1}</div>
                    <div style={{ fontSize: 13, color: "#a6abb8" }}>{seq(p)}</div>
                  </div>
                </div>
              ))}
            </div>
            <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Every pattern drawn ({r.drawn.length})</h2>
            <ol style={{ margin: 0, paddingLeft: 22, fontSize: 14, lineHeight: 1.7 }}>
              {r.drawn.map((p, k) => (
                <li key={k}>{seq(p)}</li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}
