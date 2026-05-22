import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  setup_secret: z.string(),
});

/**
 * One-time bootstrap: POST with body matching schema.
 * Set SETUP_SECRET in .env.local (e.g. a random string you delete after use).
 */
export async function POST(request: Request) {
  const expectedSecret = process.env.SETUP_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "SETUP_SECRET not configured in .env.local" },
      { status: 503 }
    );
  }

  try {
    const body = schema.parse(await request.json());
    if (body.setup_secret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid setup secret" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { count } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "super_admin");

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Super admin already exists. Use admin login." },
        { status: 409 }
      );
    }

    const { data: newUser, error } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      app_metadata: { role: "super_admin" },
      user_metadata: { full_name: body.full_name },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await admin.from("profiles").upsert({
      id: newUser.user.id,
      role: "super_admin",
      email: body.email,
      full_name: body.full_name,
      status: "active",
    });

    return NextResponse.json({
      ok: true,
      message: "Super admin created. Sign in at /login",
      email: body.email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Setup failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
