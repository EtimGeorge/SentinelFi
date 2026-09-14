import React, { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PageContainer from '../../components/Layout/PageContainer';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { DOCS, DOC_CATEGORIES, DocMeta } from '../../lib/userDocs';
import { Search, BookOpen, FolderOpen } from 'lucide-react';

interface Props {
  docs: DocMeta[];
}

const DocIndex: React.FC<Props> = ({ docs }) => {
  const [filter, setFilter] = useState('');

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? docs.filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            d.description.toLowerCase().includes(q)
        )
      : docs;

    const map = new Map<string, DocMeta[]>();
    for (const d of filtered) {
      const arr = map.get(d.category) || [];
      arr.push(d);
      map.set(d.category, arr);
    }
    return map;
  }, [docs, filter]);

  return (
    <>
      <Head>
        <title>Documentation - SentinelFi</title>
      </Head>

      <PageContainer className="max-w-6xl space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-brand-primary" />
            <h1 className="text-2xl font-bold text-white">Documentation</h1>
          </div>
          <p className="text-sm text-gray-400 max-w-2xl">
            User guides, process walkthroughs, and the full product manual for
            every SentinelFi module.
          </p>
        </header>

        <div className="relative max-w-md">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search titles or descriptions..."
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>

        {DOC_CATEGORIES.map((cat) => {
          const items = grouped.get(cat);
          if (!items || items.length === 0) return null;

          return (
            <section key={cat} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <FolderOpen className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-400 uppercase">
                  {cat}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((doc) => (
                  <Link key={doc.slug} href={`/docs/${doc.slug}`} passHref>
                    <Card className="h-full hover:border-white/10 transition-colors cursor-pointer">
                      <h3 className="text-sm font-bold text-white mb-1">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {doc.description}
                      </p>
                      <div className="mt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-brand-primary text-xs font-semibold px-0"
                        >
                          Read more →
                        </Button>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {grouped.size === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            No documentation matches your search.
          </div>
        )}
      </PageContainer>
    </>
  );
};

export default DocIndex;

export const getStaticProps = async () => {
  return { props: { docs: DOCS } };
};
