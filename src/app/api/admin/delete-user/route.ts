import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminProfile?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = schema.parse(await request.json());
    const admin = createAdminClient();

    // 1. Delete all books owned by this author (cascades to manuscripts, conversations, etc.)
    const { error: booksErr } = await admin
      .from("books")
      .delete()
      .eq("author_id", body.userId);
      
    if (booksErr) {
      return NextResponse.json({ error: `Failed to delete user's books: ${booksErr.message}` }, { status: 400 });
    }

    // 2. Delete royalties, transactions, and notifications
    await admin.from("author_royalties").delete().eq("author_id", body.userId);
    await admin.from("withdrawal_requests").delete().eq("author_id", body.userId);
    await admin.from("royalty_transactions").delete().eq("author_id", body.userId);
    await admin.from("conversation_participants").delete().eq("user_id", body.userId);
    await admin.from("notifications").delete().eq("user_id", body.userId);
    await admin.from("book_staff_assignments").delete().eq("staff_id", body.userId);

    // 3. Delete the auth user account (this cascades to delete the profiles row)
    const { error: authErr } = await admin.auth.admin.deleteUser(body.userId);
    if (authErr) {
      // If auth deletion fails, try deleting the profile directly as fallback
      const { error: profErr } = await admin.from("profiles").delete().eq("id", body.userId);
      if (profErr) {
        return NextResponse.json({ error: `Failed to delete user: ${authErr.message} (Profile fallback error: ${profErr.message})` }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
