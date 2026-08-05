import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PAGES = ["/admin", "/tft/admin"];
const PROTECTED_API_WRITES = ["/api/players", "/api/tft/players"];

function needsAuth(req: NextRequest): boolean {
  const { pathname } = req.nextUrl;
  if (PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (PROTECTED_API_WRITES.includes(pathname) && req.method !== "GET") {
    return true;
  }
  return false;
}

export function middleware(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !needsAuth(req)) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const [, password] = decoded.split(":");
    if (password === adminPassword) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Autenticación requerida", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/tft/admin/:path*", "/api/players", "/api/tft/players"],
};
