import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

/**
 * POST /api/storage/signed-url
 *
 * Body: { bucket: string, path: string, expiresIn?: number }
 *
 * Returns a signed URL for the given storage path.
 * Uses the service role admin client so it bypasses storage RLS policies
 * that may block the client-side anon key from reading private buckets.
 *
 * Requires authenticated session — returns 401 if not logged in.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Verify the user is authenticated using the server client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized — please sign in." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { bucket, path, expiresIn = 86400 } = body; // default: 24h

    if (!bucket || !path) {
      return NextResponse.json(
        { error: "Missing required fields: bucket and path." },
        { status: 400 }
      );
    }

    // Use admin client with service role key to generate signed URL
    // This bypasses storage RLS and always works for valid paths
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error("[signed-url] Error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to generate signed URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err: any) {
    console.error("[signed-url] Unexpected error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}
