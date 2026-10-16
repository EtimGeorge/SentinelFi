import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { useSecuredApi } from '../hooks/useSecuredApi';

export interface ReportBranding {
  tenantName: string;
  brandLogoBase64: string | null;
  brandPrimaryColorHex: string;
  companyAddress: string | null;
}

export const DEFAULT_BRAND: ReportBranding = {
  tenantName: '',
  brandLogoBase64: null,
  brandPrimaryColorHex: '#0D9488',
  companyAddress: null,
};

/**
 * FE-1: single source of tenant report identity. Reads the least-privilege
 * display endpoint (every tenant member may call it) and degrades to neutral
 * defaults when branding was never configured or the call fails.
 */
export function useReportBranding(): ReportBranding {
  const api = useSecuredApi();
  const [branding, setBranding] = useState<ReportBranding>(DEFAULT_BRAND);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get('/admin/tenants/my/display-profile');
        const d = resp.data || {};
        if (!cancelled) {
          setBranding({
            tenantName: d.name || '',
            brandLogoBase64: d.brandLogoBase64 || null,
            brandPrimaryColorHex: d.brandPrimaryColorHex || DEFAULT_BRAND.brandPrimaryColorHex,
            companyAddress: d.companyAddress || null,
          });
        }
      } catch {
        if (!cancelled) setBranding(DEFAULT_BRAND);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return branding;
}

/** Merges tenant branding into the report export context sent to /reporting/generate. */
export function buildReportContext<T extends Record<string, unknown>>(
  base: T,
  branding: ReportBranding,
): T & {
  tenantName: string;
  companyAddress: string;
  brandPrimaryColorHex: string;
  brandLogoBase64: string;
} {
  return {
    ...base,
    tenantName: branding.tenantName,
    companyAddress: branding.companyAddress || '',
    brandPrimaryColorHex: branding.brandPrimaryColorHex,
    brandLogoBase64: branding.brandLogoBase64 || '',
  };
}

/** FE-2: real SHA-256 over the exact bytes the user downloads. */
export async function sha256Hex(data: Blob | ArrayBuffer): Promise<string> {
  const buf = data instanceof Blob ? await data.arrayBuffer() : data;
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function shortHash(hash: string | null): string {
  if (!hash) return 'NULL_VOID';
  return `${hash.slice(0, 4)}...${hash.slice(-4)}`;
}

export interface ReportHeaderMeta {
  label: string;
  value: string;
}

/**
 * FE-1: shared white-paper report header. Tenant logo + name + address,
 * brand-color accent rule, title block, and meta row. Replaces the
 * per-page duplicated headers (which hardcoded a slate bar and no identity).
 */
export const ReportHeader: React.FC<{
  title: React.ReactNode;
  meta: ReportHeaderMeta[];
  branding: ReportBranding;
}> = ({ title, meta, branding }) => (
  <header className="text-center space-y-4 border-b-2 border-slate-100 pb-12">
    <div
      className="mx-auto w-16 h-1 rounded-full mb-6"
      style={{ backgroundColor: `${branding.brandPrimaryColorHex}33` }}
    />
    {(branding.brandLogoBase64 || branding.tenantName) && (
      <div className="flex items-center justify-center gap-3 pb-2">
        {branding.brandLogoBase64 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.brandLogoBase64}
            alt={`${branding.tenantName || 'Tenant'} logo`}
            className="h-10 w-auto object-contain"
          />
        )}
        <div className="text-left">
          {branding.tenantName && (
            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
              {branding.tenantName}
            </p>
          )}
          {branding.companyAddress && (
            <p className="text-xs text-slate-400 font-medium">{branding.companyAddress}</p>
          )}
        </div>
      </div>
    )}
    <h2 className="text-3xl font-black uppercase tracking-tighter leading-tight">{title}</h2>
    {meta.length > 0 && (
      <div className="flex items-center justify-center gap-6 text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex-wrap">
        {meta.map((m, i) => (
          <React.Fragment key={m.label}>
            {i > 0 && <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
            <span className="flex items-center gap-2">
              {m.label}: {m.value}
            </span>
          </React.Fragment>
        ))}
      </div>
    )}
  </header>
);

/**
 * FE-1/FE-2: shared white-paper report footer. Left block carries the REAL
 * SHA-256 of the generated file (no more hardcoded placeholders); right
 * block carries the valuation model + tenant identity.
 */
export const ReportFooter: React.FC<{
  hash: string | null;
  branding: ReportBranding;
  valuationCode: string;
}> = ({ hash, branding, valuationCode }) => (
  <footer className="pt-12 border-t border-slate-200 mt-20 flex flex-col md:flex-row justify-between items-center gap-8">
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: branding.brandPrimaryColorHex }}
        >
          <Shield className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-black text-slate-900 leading-none">Cryptographic Integrity</p>
          <p
            className="font-mono text-xs text-slate-400 tracking-tighter mt-1 truncate max-w-[280px]"
            title={hash || undefined}
          >
            SHA256: {shortHash(hash)}
          </p>
        </div>
      </div>
    </div>
    <div className="text-center md:text-right space-y-1">
      <p className="text-xs font-black text-slate-950">{valuationCode} Valuation Model</p>
      <p className="text-xs text-slate-400 font-medium tracking-tight">
        {branding.tenantName || 'SentinelFi Financial Intelligence Systems'}
      </p>
      <div className="flex items-center justify-center md:justify-end gap-1 mt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-1 h-1 bg-slate-200 rounded-full" />
        ))}
      </div>
    </div>
  </footer>
);
