import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";



export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (path === "/") {
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = profile?.role;
      if (role === "super_admin") return NextResponse.redirect(new URL("/admin", request.url));
      if (role === "staff") return NextResponse.redirect(new URL("/staff", request.url));
      if (role === "author") return NextResponse.redirect(new URL("/author", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect old login routes to unified /login
  if (path === "/admin/login" || path === "/author/login" || path === "/staff/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (path === "/login") {
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = profile?.role;
      if (role === "super_admin") return NextResponse.redirect(new URL("/admin", request.url));
      if (role === "staff") return NextResponse.redirect(new URL("/staff", request.url));
      if (role === "author") return NextResponse.redirect(new URL("/author", request.url));
    }
    return response;
  }

  if (path === "/setup") return response;

  if (path.startsWith("/admin")) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
    if (profile?.role !== "super_admin") {
      if (profile?.role === "author") return NextResponse.redirect(new URL("/author", request.url));
      if (profile?.role === "staff") return NextResponse.redirect(new URL("/staff", request.url));
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (path.startsWith("/author")) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "author" && profile?.role !== "super_admin") {
      return NextResponse.redirect(new URL(getRedirect(profile?.role), request.url));
    }
  }

  if (path.startsWith("/staff")) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "staff" && profile?.role !== "super_admin") {
      return NextResponse.redirect(new URL(getRedirect(profile?.role), request.url));
    }
  }

  return response;
}

function getRedirect(role?: string) {
  if (role === "super_admin") return "/admin";
  if (role === "staff") return "/staff";
  if (role === "author") return "/author";
  return "/";
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
