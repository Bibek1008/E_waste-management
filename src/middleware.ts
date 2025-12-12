import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/_next", "/favicon.ico"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  const token = req.cookies.get("auth")?.value;

  if (isPublic) {
    if (pathname.startsWith("/login") && token) {
      try { await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || "dev"), { algorithms: ["HS256"] }); return NextResponse.redirect(new URL("/", req.url)); } catch {}
    }
    return NextResponse.next();
  }

  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  try { await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || "dev"), { algorithms: ["HS256"] }); return NextResponse.next(); } catch { return NextResponse.redirect(new URL("/login", req.url)); }
}

export const config = {
  matcher: ["/((?!api/auth).*)"],
};
