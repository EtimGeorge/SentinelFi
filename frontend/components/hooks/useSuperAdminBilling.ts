import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuth } from '../context/AuthContext';
import { BillingOverviewDto, InvoiceDto } from 'shared/types/billing';

export interface SuperAdminBillingData {
  overview: BillingOverviewDto;
  invoices: InvoiceDto[];
}

const useSuperAdminBilling = () => {
  const [data, setData] = useState<SuperAdminBillingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    const fetchBillingData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [overviewRes, invoicesRes] = await Promise.all([
          api.get('/super/billing/overview', { signal: controller.signal }),
          api.get('/super/billing/invoices', { signal: controller.signal }),
        ]);

        if (!controller.signal.aborted) {
          setData({
            overview: overviewRes.data,
            invoices: invoicesRes.data,
          });
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
        if (!controller.signal.aborted) {
            setError(err.response?.data?.message || err.message || 'An error occurred while fetching billing data.');
            console.error("Error fetching billing data:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
            setLoading(false);
        }
      }
    };

    fetchBillingData();

    return () => controller.abort();
  }, [user]);

  return { data, loading, error };
};

export default useSuperAdminBilling;
