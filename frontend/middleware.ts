import { NextResponse, NextRequest } from 'next/server';

// Edge RBAC — supplements client RouteGuard (P0 fix). Reads httpOnly cookie set by backend.
// PUBLIC_ROUTES mirrors AuthContext.PUBLIC_ROUTES but edge-evaluated (no React).
const PUBLIC_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/login$/,
  /^\/register$/,
  /^\/forgot-password$/,
  /^\/reset-password$/,
  /^\/about$/,
  /^\/training$/,
  /^\/contact$/,
  /^\/404$/,
  /^\/500$/,
  /^\/_error$/,
  /^\/landing\/.*$/,
  /^\/auth\/accept-invitation$/,
  /^\/auth\/setup$/,
  /^\/auth\/check-email$/,
  /^\/billing\/success$/,
  /^\/legal\/terms$/,
  /^\/legal\/privacy$/,
  /^\/landing\/testimonials$/,
  /^\/api\/health$/,
  // Public API routes (must not be redirected to /login)
  /^\/api\/v1\/auth\/(login|register|forgot-password|reset-password|invitation|health)(\/|$)/,
  /^\/api\/v1\/health(\/|$)/,
];

const SUPER_PREFIX = /^\/super(\/|$)/;
const ADMIN_PREFIX = /^\/admin(\/|$)/;

function isPublic(pathname: string): boolean {
  return PUBLIC_PATTERNS.some((re) => re.test(pathname));
}

// Minimal JWT payload decode (no verify — verified by backend). Only for role hint to avoid leaking /super shell.
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(b64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function hasSuperAdminRole(payload: any): boolean {
  const roles: string[] = payload?.roles ?? payload?.authorities ?? [];
  if (!Array.isArray(roles)) return false;
  return roles.some((r: any) => (typeof r === 'string' ? r : r?.name) === 'SuperAdmin');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow Next internals and static
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get('access_token')?.value ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('returnUrl', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Super/admin prefix check — best-effort edge block; backend is authoritative (TenantAccessGuard/RolesGuard)
  const payload = decodeJwtPayload(token);
  if (SUPER_PREFIX.test(pathname) && !hasSuperAdminRole(payload)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard/home';
    return NextResponse.redirect(url);
  }

  // Attach correlation id if absent (propagated to backend via rewrite)
  const res = NextResponse.next();
  if (!request.headers.get('x-correlation-id')) {
    res.headers.set('x-correlation-id', `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
