import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

/** True when the server has a valid Clerk session (matches middleware / RSC). */
export async function GET() {
  const { userId } = await auth();
  return Response.json({ authenticated: Boolean(userId) });
}
