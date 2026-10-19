import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const PlanningMatrixPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/financials/operations/planning');
  }, [router]);

  return (
    <>
      <Head>
        <title>OPEX Planning Matrix | SentinelFi</title>
      </Head>
      <div className="p-10 flex flex-col items-center justify-center gap-3">
        <p className="text-xs text-slate-400 font-black uppercase tracking-tighter">Redirecting…</p>
      </div>
    </>
  );
};

export default PlanningMatrixPage;
