import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerNotification } from "@/lib/notifications-server";
import { z } from "zod";

const creditSchema = z.object({
  author_id: z.string().uuid(),
  book_id: z.string().uuid().optional(),
  amount: z.number().positive(),
  description: z.string().min(1),
  tx_type: z.enum(["credit", "adjustment"]).default("credit"),
});

export async function POST(request: Request) {
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

  const body = creditSchema.parse(await request.json());

  // Upsert royalties row and increment balances
  const { data: existing } = await supabase
    .from("author_royalties")
    .select("available_balance, lifetime_earnings")
    .eq("author_id", body.author_id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("author_royalties")
      .update({
        available_balance: Number(existing.available_balance) + body.amount,
        lifetime_earnings: Number(existing.lifetime_earnings) + body.amount,
      })
      .eq("author_id", body.author_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await supabase.from("author_royalties").insert({
      author_id: body.author_id,
      available_balance: body.amount,
      pending_balance: 0,
      lifetime_earnings: body.amount,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Insert ledger entry
  await supabase.from("royalty_transactions").insert({
    author_id: body.author_id,
    book_id: body.book_id ?? null,
    amount: body.amount,
    tx_type: body.tx_type,
    description: body.description,
    created_by: user.id,
  });

  // Update book sales royalty_earned if book_id provided
  if (body.book_id) {
    const { data: sale } = await supabase
      .from("sales")
      .select("id, royalty_earned")
      .eq("book_id", body.book_id)
      .single();
    if (sale) {
      await supabase
        .from("sales")
        .update({
          royalty_earned: Number(sale.royalty_earned ?? 0) + body.amount,
          last_royalty_credit_at: new Date().toISOString(),
        })
        .eq("id", sale.id);
    }
  }

  // Notify author
  await triggerNotification({
    userIds: [body.author_id],
    type: "success",
    title: "Royalty Credited",
    body: `₹${body.amount.toLocaleString("en-IN")} has been credited to your royalty wallet. ${body.description}`,
    link: "/author/royalties",
  });

  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const authorId = searchParams.get("author_id");

  let query = supabase
    .from("author_royalties")
    .select("*, author:profiles!author_royalties_author_id_fkey(id, full_name, email, avatar_url, bank_account_name, bank_account_number, bank_ifsc, bank_upi)");

  if (authorId) query = query.eq("author_id", authorId);

  const { data, error } = await query.order("lifetime_earnings", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
