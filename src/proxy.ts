import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

const protectedRoutes = ["/admin", "/worker"];
const adminRoutes = ["/admin"];
const workerRoutes = ["/worker"];
const authRoutes = ["/login"];

export default async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));
  const isWorkerRoute = workerRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (!user && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single<{ role: string }>();

    const role = profile?.role;

    if (isAuthRoute && role) {
      if (role === "admin" || role === "manager") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      if (role === "worker") {
        return NextResponse.redirect(new URL("/worker", request.url));
      }
    }

    if (isAdminRoute && role !== "admin" && role !== "manager") {
      return NextResponse.redirect(new URL("/worker", request.url));
    }

    if (isWorkerRoute && role !== "worker") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
