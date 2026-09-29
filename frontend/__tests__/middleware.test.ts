/**
 * @jest-environment node
 */
// ─── Edge middleware regression tests ────────────────────────────────────────
// Proves the public-media fix stays public and the auth wall stays intact:
//   • /demos/*.{webm,mp4} must be served anonymously (Academy lesson videos)
//   • non-media paths under /demos/ stay protected (namespace scoping)
//   • unauthenticated app routes still redirect to /login
// The original production incident: /demos/*.webm fell through to the auth
// redirect, so <video> received text/html → FFmpegDemuxer: open context failed.

import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

const at = (path: string) => new NextRequest(`http://localhost:3000${path}`);

const isRedirectToLogin = (res: Response): boolean =>
  res.status === 307 && (res.headers.get('location') ?? '').includes('/login');

const isPassedThrough = (res: Response): boolean =>
  res.status === 200 && res.headers.get('location') === null;

describe('public demo media (Academy lesson videos)', () => {
  it.each([
    '/demos/demo-sandbox-ceo.webm',
    '/demos/demo-sandbox-pm.webm',
    '/demos/demo-sandbox-audit.webm',
    '/demos/demo-sandbox-walkthrough.webm',
    '/demos/sovereign-onboarding.mp4',
  ])('serves %s anonymously (no /login redirect)', (path) => {
    const res = middleware(at(path));
    expect(isPassedThrough(res)).toBe(true);
    expect(isRedirectToLogin(res)).toBe(false);
  });

  it('serves demo posters/images anonymously', () => {
    expect(isPassedThrough(middleware(at('/demos/demo-sandbox-ceo.png')))).toBe(true);
  });

  it('keeps non-media paths under /demos/ behind auth', () => {
    expect(isRedirectToLogin(middleware(at('/demos/not-a-video')))).toBe(true);
    expect(isRedirectToLogin(middleware(at('/demos/page.webm/extra')))).toBe(true);
    expect(isRedirectToLogin(middleware(at('/demos/x.exe')))).toBe(true);
  });
});

describe('auth wall still intact', () => {
  it('redirects unauthenticated app routes to /login with returnUrl', () => {
    const res = middleware(at('/dashboard/home?tab=2'));
    expect(isRedirectToLogin(res)).toBe(true);
    expect(res.headers.get('location')).toContain('returnUrl=%2Fdashboard%2Fhome');
  });

  it('keeps the marketing sandbox public', () => {
    expect(isPassedThrough(middleware(at('/landing/workflows')))).toBe(true);
  });
});
