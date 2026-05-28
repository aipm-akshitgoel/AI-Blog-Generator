import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { clerkEmbeddedSignUpProps } from "@/lib/clerkAuth";
import { clerkAuthAppearance } from "@/lib/clerkAppearance";

type SignUpPageProps = {
  searchParams: Promise<{ deleted?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { deleted } = await searchParams;
  if (deleted === "1") {
    redirect("/?deleted=1");
  }

  return (
    <main className="clerk-auth-page flex min-h-[calc(100vh-3.5rem)] w-full flex-col items-center justify-center bg-neutral-950 p-4">
      <div className="mx-auto flex w-full max-w-[420px] justify-center [&_.cl-rootBox]:mx-auto [&_.cl-rootBox]:w-full">
        <SignUp {...clerkEmbeddedSignUpProps} appearance={clerkAuthAppearance} />
      </div>
    </main>
  );
}
