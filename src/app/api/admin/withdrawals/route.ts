import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerNotification } from "@/lib/notifications-server";
import { z } from "zod";

const schema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject", "paid"]),
  utr: z.string().optional(),
  admin_notes: z.string().optional(),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = schema.parse(await request.json());
  const statusMap = {
    approve: "approved",
    reject: "rejected",
    paid: "paid",
  } as const;

  const { data: withdrawal } = await supabase
    .from("withdrawal_requests")
    .select("author_id, amount, status")
    .eq("id", body.id)
    .single();

  if (!withdrawal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("withdrawal_requests")
    .update({
      status: statusMap[body.action],
      utr: body.utr ?? null,
      admin_notes: body.admin_notes ?? null,
      processed_by: user.id,
      processed_at: new Date().toISOString(),
    })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (body.action === "paid") {
    const { data: royalties } = await supabase
      .from("author_royalties")
      .select("available_balance")
      .eq("author_id", withdrawal.author_id)
      .single();

    if (royalties) {
      await supabase
        .from("author_royalties")
        .update({
          available_balance: Math.max(
            0,
            Number(royalties.available_balance) - Number(withdrawal.amount)
          ),
          last_payout_at: new Date().toISOString(),
        })
        .eq("author_id", withdrawal.author_id);
    }

    await supabase.from("royalty_transactions").insert({
      author_id: withdrawal.author_id,
      amount: -Number(withdrawal.amount),
      tx_type: "payout",
      description: `Withdrawal paid${body.utr ? ` — UTR: ${body.utr}` : ""}`,
      created_by: user.id,
    });
  }

  // Trigger notification
  const actionTitle = body.action === "paid"
    ? "Royalty Payout Processed"
    : body.action === "approve"
    ? "Withdrawal Approved"
    : "Withdrawal Request Rejected";

  const actionBody = body.action === "paid"
    ? `Your royalty withdrawal request for ₹${withdrawal.amount} has been paid successfully.${body.utr ? ` UTR: ${body.utr}.` : ""}`
    : body.action === "approve"
    ? `Your royalty withdrawal request for ₹${withdrawal.amount} has been approved and is now processing.`
    : `Your royalty withdrawal request for ₹${withdrawal.amount} was rejected.${body.admin_notes ? ` Reason: ${body.admin_notes}` : ""}`;

  const notifType = body.action === "paid" ? "critical" : body.action === "approve" ? "success" : "warning";

  await triggerNotification({
    userIds: [withdrawal.author_id],
    type: notifType,
    title: actionTitle,
    body: actionBody,
    link: "/author/royalties",
  });

  return NextResponse.json({ ok: true });
}
