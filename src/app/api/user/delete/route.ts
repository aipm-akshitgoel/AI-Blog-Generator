import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { deleteAllUserData } from "@/lib/deleteUserAccount";

export async function DELETE() {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const deletedData = await deleteAllUserData(userId);

        const client = await clerkClient();
        await client.users.deleteUser(userId);

        return NextResponse.json({
            success: true,
            deleted: deletedData,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete account";
        console.error("[user/delete]", err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
