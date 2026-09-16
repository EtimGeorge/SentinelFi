// ─── Legacy facade — docs catalog ───────────────────────────────────────────
// New canonical source: lib/curriculum/guides.ts (via the registry). This
// module preserves the legacy DocMeta shape so /docs pages keep working.

import { CURRICULUM_GUIDES } from './curriculum/guides';

export interface DocMeta {
  slug: string;
  title: string;
  category: string;
  description: string;
  filePath: string;
}

export const DOCS: DocMeta[] = CURRICULUM_GUIDES.map((g) => ({
  slug: g.slug,
  title: g.title,
  category: g.category,
  description: g.description,
  filePath: g.filePath,
}));

export const DOC_CATEGORIES: string[] = Array.from(
  new Set(DOCS.map((d) => d.category)),
);

export default DOCS;