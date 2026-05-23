import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["update-email", "update-password", "update-status", "terminate-sessions"]),
  payload: z.object({
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    status: z.enum(["active", "suspended", "locked", "disabled", "pending"]).optional(),
  }).optional(),
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

    const json = await request.json();
    const body = schema.parse(json);
    const admin = createAdminClient();

    let details = {};

    switch (body.action) {
      case "update-email": {
        if (!body.payload?.email) {
          return NextResponse.json({ error: "Email is required for this action." }, { status: 400 });
        }
        
        // Update auth table
        const { error: authErr } = await admin.auth.admin.updateUserById(body.userId, {
          email: body.payload.email,
          email_confirm: true,
        });
        if (authErr) throw authErr;

        // Sync to profiles table
        const { error: profErr } = await admin
          .from("profiles")
          .update({ email: body.payload.email, updated_at: new Date().toISOString() })
          .eq("id", body.userId);
        if (profErr) throw profErr;

        details = { target_email: body.payload.email };
        break;
      }

      case "update-password": {
        if (!body.payload?.password) {
          return NextResponse.json({ error: "Password is required for this action." }, { status: 400 });
        }
        
        const { error: authErr } = await admin.auth.admin.updateUserById(body.userId, {
          password: body.payload.password,
        });
        if (authErr) throw authErr;

        details = { info: "Reset user password" };
        break;
      }

      case "update-status": {
        if (!body.payload?.status) {
          return NextResponse.json({ error: "Status is required for this action." }, { status: 400 });
        }

        // Update profiles status
        const { error: profErr } = await admin
          .from("profiles")
          .update({ status: body.payload.status, updated_at: new Date().toISOString() })
          .eq("id", body.userId);
        if (profErr) throw profErr;

        // Apply auth ban if account is locked, suspended or disabled
        if (["suspended", "disabled", "locked"].includes(body.payload.status)) {
          const { error: banErr } = await admin.auth.admin.updateUserById(body.userId, {
            ban_duration: "87600h", // Ban for 10 years
          });
          if (banErr) throw banErr;
        } else if (body.payload.status === "active") {
          const { error: unbanErr } = await admin.auth.admin.updateUserById(body.userId, {
            ban_duration: "none",
          });
          if (unbanErr) throw unbanErr;
        }

        details = { status: body.payload.status };
        break;
      }

      case "terminate-sessions": {
        const { error: signoutErr } = await admin.auth.admin.signOut(body.userId);
        if (signoutErr) throw signoutErr;

        details = { info: "Terminated user sessions" };
        break;
      }
    }

    // Write audit event log to activity_logs table
    const { error: logErr } = await admin.from("activity_logs").insert({
      user_id: user.id,
      action: `admin_${body.action.replace("-", "_")}`,
      entity_type: "profile",
      entity_id: body.userId,
      metadata: {
        action: body.action,
        timestamp: new Date().toISOString(),
        ...details
      }
    });

    if (logErr) {
      console.error("Failed to write audit activity log:", logErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : "Failed to execute administrative operation.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
