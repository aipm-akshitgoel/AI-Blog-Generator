import { SignIn } from "@clerk/nextjs";
import { CLERK_AFTER_AUTH_URL } from "@/lib/clerkAuth";
import { clerkAuthAppearance } from "@/lib/clerkAppearance";
import { SignInGate } from "@/components/SignInGate";

export default function SignInPage() {
  return (
    <main className="clerk-auth-page flex min-h-[calc(100vh-3.5rem)] w-full items-center justify-center bg-neutral-950 p-4">
      <div className="mx-auto flex w-full max-w-[420px] flex-col items-center justify-center [&_.cl-rootBox]:mx-auto [&_.cl-rootBox]:w-full">
        <SignInGate>
          <SignIn
            forceRedirectUrl={CLERK_AFTER_AUTH_URL}
            fallbackRedirectUrl={CLERK_AFTER_AUTH_URL}
            appearance={clerkAuthAppearance}
          />
        </SignInGate>
      </div>
    </main>
  );
}
