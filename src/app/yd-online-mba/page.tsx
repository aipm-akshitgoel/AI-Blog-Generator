import type { Metadata } from "next";
import { YD_ONLINE_MBA_FALLBACK_URL } from "@/lib/ydOnlineMbaMirror";

export const metadata: Metadata = {
  title: "Online MBA | YourDegree",
  description: "Online MBA courses — fee, syllabus, admissions (mirrored view).",
};

/** Full-viewport embed of the public YourDegree Online MBA page (same UI as source). */
export default function YdOnlineMbaPage() {
  return (
    <div className="fixed inset-0 z-[100] bg-white">
      <iframe
        title="YourDegree Online MBA"
        src={YD_ONLINE_MBA_FALLBACK_URL}
        className="h-full w-full border-0"
        referrerPolicy="no-referrer-when-downgrade"
        allow="clipboard-write; fullscreen"
      />
    </div>
  );
}
