import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { BillingOverviewDto, InvoiceDto } from 'shared/types/billing';

export interface SuperAdminBillingData {
  overview: BillingOverviewDto;
  invoices: InvoiceDto[];
}

const useSuperAdminBilling = () => {
  const [data, setData] = useState<SuperAdminBillingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillingData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [overviewRes, invoicesRes] = await Promise.all([
          api.get('/super/billing/overview'),
          api.get('/super/billing/invoices'),
        ]);

        setData({
          overview: overviewRes.data,
          invoices: invoicesRes.data,
        });
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'An error occurred while fetching billing data.');
        console.error("Error fetching billing data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  return { data, loading, error };
};

export default useSuperAdminBilling;
