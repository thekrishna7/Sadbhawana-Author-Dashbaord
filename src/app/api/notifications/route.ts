import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerNotification } from "@/lib/notifications-server";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

const notificationSchema = z.object({
  userIds: z.array(z.string().uuid()),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Authenticate calling user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const parsed = notificationSchema.parse(body);

    // 3. Trigger notification + email
    const result = await triggerNotification({
      userIds: parsed.userIds,
      type: parsed.type,
      title: parsed.title,
      body: parsed.body,
      link: parsed.link,
      metadata: parsed.metadata,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("API error triggering notification:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    
    // Authenticate calling user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filePath = path.join(process.cwd(), "public", "mock-emails.json");
    await fs.writeFile(filePath, JSON.stringify([], null, 2), "utf-8");

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("API error clearing mock emails:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
