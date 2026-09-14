import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PageContainer from '../../components/Layout/PageContainer';
import Button from '../../components/common/Button';
import { DOCS, DocMeta } from '../../lib/userDocs';
import { ChevronLeft, FileText } from 'lucide-react';

interface Props {
  doc: DocMeta;
  content: string;
}

const mdComponents = {
  h1: (props: any) => (
    <h1
      className="text-2xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2"
      {...props}
    />
  ), h2: (props: any) => (
    <h2 className="text-xl font-bold text-white mt-8 mb-3" {...props} />
  ), h3: (props: any) => (
    <h3 className="text-lg font-semibold text-white mt-6 mb-2" {...props} />
  ), h4: (props: any) => (
    <h4 className="text-base font-semibold text-gray-100 mt-4 mb-2" {...props} />
  ), p: (props: any) => (
    <p className="text-sm text-gray-300 leading-relaxed my-3" {...props} />
  ), ul: (props: any) => (
    <ul className="list-disc pl-6 space-y-1 my-3" {...props} />
  ), ol: (props: any) => (
    <ol className="list-decimal pl-6 space-y-1 my-3" {...props} />
  ), li: (props: any) => <li className="text-sm text-gray-300" {...props} />, a: (props: any) => (
    <a
      className="text-brand-primary underline hover:opacity-80"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ), strong: (props: any) => (
    <strong className="font-semibold text-white" {...props} />
  ), em: (props: any) => <em className="italic text-gray-200" {...props} />, code: (props: any) => (
    <code
      className="bg-gray-800/80 rounded px-1.5 py-0.5 font-mono text-xs text-brand-primary"
      {...props}
    />
  ), pre: (props: any) => (
    <pre
      className="bg-gray-900 rounded-lg p-4 overflow-x-auto my-4 font-mono text-xs text-gray-300"
      {...props}
    />
  ), table: (props: any) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-white/10">
      <table className="w-full text-sm text-gray-300" {...props} />
    </div>
  ), thead: (props: any) => (
    <thead className="bg-gray-800/60 text-left text-gray-100" {...props} />
  ), th: (props: any) => (
    <th className="px-4 py-2 font-semibold" {...props} />
  ), td: (props: any) => (
    <td className="px-4 py-2 border-t border-white/5 align-top" {...props} />
  ), tr: (props: any) => (
    <tr className="hover:bg-white/[0.02]" {...props} />
  ), blockquote: (props: any) => (
    <blockquote
      className="border-l-4 border-brand-primary/40 pl-4 italic text-gray-400 my-4"
      {...props}
    />
  ), hr: () => <hr className="border-white/10 my-6" />,
};

const DocViewer: React.FC<Props> = ({ doc, content }) => {
  return (
    <>
      <Head>
        <title>{doc.title} - SentinelFi Docs</title>
      </Head>

      <PageContainer className="max-w-4xl space-y-6">
        <nav>
          <Link href="/docs" passHref>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 px-0 hover:text-gray-200"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              All documentation
            </Button>
          </Link>
        </nav>

        <header className="flex items-start gap-3 border-b border-white/10 pb-4">
          <FileText className="w-6 h-6 text-brand-primary mt-1" />
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">
              {doc.category}
            </p>
            <h1 className="text-2xl font-bold text-white mt-1">{doc.title}</h1>
          </div>
        </header>

        <article className="min-w-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {content}
          </ReactMarkdown>
        </article>
      </PageContainer>
    </>
  );
};

export default DocViewer;

export const getStaticPaths = async () => {
  return {
    paths: DOCS.map((doc) => ({ params: { slug: doc.slug } })), fallback: 'blocking',
  };
};

export const getStaticProps = async ({ params }: any) => {
  const doc = DOCS.find((d) => d.slug === params.slug);
  if (!doc) return { notFound: true };

  try {
    const filePath = path.join(process.cwd(), '..', 'docs', doc.filePath);
    let content = fs.readFileSync(filePath, 'utf8');

    // Strip YAML front matter if present: --- ... ---
    const frontmatter = /^---[\s\S]*?---\r?\n?/.exec(content);
    if (frontmatter) {
      content = content.slice(frontmatter[0].length);
    }

    return { props: { doc, content } };
  } catch {
    return { notFound: true };
  }
};