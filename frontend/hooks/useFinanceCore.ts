import { useState, useCallback } from 'react';
import { apiClient } from '../lib/api';
import toast from 'react-hot-toast';

export const useFinanceCore = () => {
    const [loading, setLoading] = useState(false);

    const fetchFiscalYears = useCallback(async () => {
        setLoading(true);
        try {
            return await apiClient.get('/finance-core/fiscal-years');
        } catch (error) {
            toast.error('Error fetching fiscal years');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            return await apiClient.get('/finance-core/employees');
        } catch (error) {
            toast.error('Error fetching employees');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createFiscalYear = useCallback(async (data: { label: string; startDate: string; endDate: string }) => {
        setLoading(true);
        try {
            const res = await apiClient.post('/finance-core/fiscal-years', data);
            toast.success(`Fiscal Year ${data.label} created successfully`);
            return res;
        } catch (error) {
            toast.error('Failed to create fiscal year');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDepartments = useCallback(async () => {
        setLoading(true);
        try {
            return await apiClient.get('/finance-core/departments');
        } catch (error) {
            toast.error('Error fetching departments');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchChartOfAccounts = useCallback(async () => {
        setLoading(true);
        try {
            return await apiClient.get('/finance-core/chart-of-accounts');
        } catch (error) {
            toast.error('Error fetching chart of accounts');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // --- P2P Methods ---

    const fetchRequisitions = useCallback(async () => {
        setLoading(true);
        try {
            return await apiClient.get('/finance-core/requisitions');
        } catch (error) {
            toast.error('Error fetching requisitions');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createRequisition = useCallback(async (data: { 
        description: string; 
        estimatedAmount: number; 
        costCenterId: string; 
        glAccountId: string;
        vendorName?: string;
        requiredByDate?: string;
        currency?: string;
        exchangeRate?: number;
    }) => {
        setLoading(true);
        try {
            const res = await apiClient.post('/finance-core/requisitions', data);
            toast.success('Requisition submitted');
            return res;
        } catch (error) {
            toast.error('Failed to submit requisition');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPurchaseOrders = useCallback(async () => {
        setLoading(true);
        try {
            return await apiClient.get('/finance-core/purchase-orders');
        } catch (error) {
            toast.error('Error fetching purchase orders');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createPurchaseOrder = useCallback(async (requisitionId: string) => {
        setLoading(true);
        try {
            const res = await apiClient.post('/finance-core/purchase-orders', { requisitionId });
            toast.success('Purchase Order issued');
            return res;
        } catch (error) {
            toast.error('Failed to issue Purchase Order');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            return await apiClient.get('/finance-core/invoices');
        } catch (error) {
            toast.error('Error fetching invoices');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createInvoice = useCallback(async (data: any) => {
        setLoading(true);
        try {
            const res = await apiClient.post('/finance-core/invoices', data);
            toast.success('Invoice recorded');
            return res;
        } catch (error) {
            toast.error('Failed to record invoice');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchBudgetConsumption = useCallback(async (costCenterId: string, glAccountId: string, fiscalPeriodId: string) => {
        setLoading(true);
        try {
            return await apiClient.get(`/finance-core/budget-consumption`, {
                params: { costCenterId, glAccountId, fiscalPeriodId }
            });
        } catch (error) {
            toast.error('Error fetching consumption data');
        } finally {
            setLoading(false);
        }
    }, []);

    // --- Payroll Methods ---

    const fetchPayrollRuns = useCallback(async () => {
        setLoading(true);
        try {
            return await apiClient.get('/finance/payroll/runs');
        } catch (error) {
            toast.error('Error fetching payroll runs');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPayrollKPIs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/finance/payroll/kpis');
            return res.data;
        } catch (error) {
            // Not toasting error here as it might be common on empty states
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const createPayrollRun = useCallback(async (data: { runIdentifier: string; fiscalPeriodId: string; runDate: string }) => {
        setLoading(true);
        try {
            const res = await apiClient.post('/finance/payroll/runs', data);
            toast.success('Payroll run initialized');
            return res;
        } catch (error) {
            toast.error('Failed to initialize payroll run');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPayrollRunDetails = useCallback(async (id: string) => {
        setLoading(true);
        try {
            return await apiClient.get(`/finance/payroll/runs/${id}`);
        } catch (error) {
            toast.error('Error fetching payroll run details');
        } finally {
            setLoading(false);
        }
    }, []);

    const addPayrollLineItem = useCallback(async (runId: string, data: any) => {
        setLoading(true);
        try {
            const res = await apiClient.post(`/finance/payroll/runs/${runId}/items`, data);
            toast.success('Line item added to payroll');
            return res;
        } catch (error) {
            toast.error('Failed to add line item');
        } finally {
            setLoading(false);
        }
    }, []);

    const approvePayrollRun = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const res = await apiClient.patch(`/finance/payroll/runs/${id}/approve`);
            toast.success('Payroll run approved');
            return res;
        } catch (error) {
            toast.error('Failed to approve payroll run');
        } finally {
            setLoading(false);
        }
    }, []);

    const postPayrollRun = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const res = await apiClient.patch(`/finance/payroll/runs/${id}/post`);
            toast.success('Payroll run posted to ledger');
            return res;
        } catch (error) {
            toast.error('Failed to post payroll run');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchOperationalAnalytics = useCallback(async (fiscalYearId: string, costCenterId?: string) => {
        setLoading(true);
        try {
            return await apiClient.get('/finance-core/operational-analytics', {
                params: { fiscalYearId, costCenterId }
            });
        } catch (error) {
            toast.error('Error fetching analytics');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCapexDashboard = useCallback(async (projectId?: string) => {
        setLoading(true);
        try {
            const res = await apiClient.get('/wbs/capex-intelligence', { params: { projectId } });
            return res;
        } catch (error) {
            toast.error('Error loading CAPEX Intelligence data');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchOpexDashboard = useCallback(async (fiscalYearId?: string) => {
        setLoading(true);
        try {
            const res = await apiClient.get('/finance-core/opex-intelligence', { params: { fiscalYearId } });
            return res;
        } catch (error) {
            toast.error('Error loading OPEX Intelligence data');
            return null;
        } finally {
            setLoading(false);
        }
        
    }, []);

    const downloadPurchaseOrderPdf = useCallback(async (id: string, poNumber: string) => {
        setLoading(true);
        try {
            const response = await apiClient.getAxiosInstance().get(`/finance-core/purchase-orders/${id}/pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `PO_${poNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Purchase Order downloaded');
        } catch (error) {
            toast.error('Failed to download Purchase Order PDF');
        } finally {
            setLoading(false);
        }
    }, []);

    const downloadInvoicePdf = useCallback(async (id: string, invNumber: string) => {
        setLoading(true);
        try {
            const response = await apiClient.getAxiosInstance().get(`/finance-core/invoices/${id}/pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice_${invNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Invoice downloaded');
        } catch (error) {
            toast.error('Failed to download Invoice PDF');
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        fetchFiscalYears,
        fetchEmployees,
        createFiscalYear,
        fetchDepartments,
        fetchChartOfAccounts,
        fetchRequisitions,
        createRequisition,
        fetchPurchaseOrders,
        createPurchaseOrder,
        fetchInvoices,
        createInvoice,
        fetchBudgetConsumption,
        fetchPayrollRuns,
        fetchPayrollKPIs,
        createPayrollRun,
        fetchPayrollRunDetails,
        addPayrollLineItem,
        approvePayrollRun,
        postPayrollRun,
        fetchOperationalAnalytics,
        fetchCapexDashboard,
        fetchOpexDashboard,
        downloadPurchaseOrderPdf,
        downloadInvoicePdf,
    };
};

