import { useState, useCallback } from 'react';
import { apiClient } from '../lib/api';
import toast from 'react-hot-toast';
import { OpexAnalytics } from '@shared/types/operational-budget';
import { OpexNeedsAttentionResult } from '@shared/types/operational-budget';
import { ThreeWayMatchResult } from '@shared/types/operational-budget';

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

    // --- Chart of Accounts management (classes / groups / accounts) ---
    const coaBase = '/finance-core/chart-of-accounts';

    const fetchGlAccounts = useCallback(async () => {
        setLoading(true);
        try {
            return await apiClient.get(`${coaBase}/accounts`);
        } catch (error) {
            toast.error('Error fetching GL accounts');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const seedDefaultChartOfAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.post(`${coaBase}/seed-defaults`);
            toast.success('Default chart of accounts seeded');
            return res;
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to seed default chart');
        } finally {
            setLoading(false);
        }
    }, []);

    const createAccountClass = useCallback(
        async (data: { name: string; code: string; baseType: string }) => {
            setLoading(true);
            try {
                const res = await apiClient.post(`${coaBase}/classes`, data);
                toast.success('Account class created');
                return res;
            } catch (error: any) {
                toast.error(error?.response?.data?.message || 'Failed to create account class');
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    const updateAccountClass = useCallback(
        async (id: string, data: { name?: string; code?: string; baseType?: string }) => {
            setLoading(true);
            try {
                const res = await apiClient.patch(`${coaBase}/classes/${id}`, data);
                toast.success('Account class updated');
                return res;
            } catch (error: any) {
                toast.error(error?.response?.data?.message || 'Failed to update account class');
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    const deleteAccountClass = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const res = await apiClient.delete(`${coaBase}/classes/${id}`);
            toast.success('Account class deleted');
            return res;
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete account class');
        } finally {
            setLoading(false);
        }
    }, []);

    const createAccountGroup = useCallback(
        async (data: { name: string; code: string; accountClassId: string }) => {
            setLoading(true);
            try {
                const res = await apiClient.post(`${coaBase}/groups`, data);
                toast.success('Account group created');
                return res;
            } catch (error: any) {
                toast.error(error?.response?.data?.message || 'Failed to create account group');
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    const updateAccountGroup = useCallback(
        async (
            id: string,
            data: { name?: string; code?: string; accountClassId?: string },
        ) => {
            setLoading(true);
            try {
                const res = await apiClient.patch(`${coaBase}/groups/${id}`, data);
                toast.success('Account group updated');
                return res;
            } catch (error: any) {
                toast.error(error?.response?.data?.message || 'Failed to update account group');
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    const deleteAccountGroup = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const res = await apiClient.delete(`${coaBase}/groups/${id}`);
            toast.success('Account group deleted');
            return res;
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete account group');
        } finally {
            setLoading(false);
        }
    }, []);

    const createGlAccount = useCallback(
        async (data: {
            name: string;
            code: string;
            accountGroupId: string;
            description?: string;
            isActive?: boolean;
        }) => {
            setLoading(true);
            try {
                const res = await apiClient.post(`${coaBase}/accounts`, data);
                toast.success('GL account created');
                return res;
            } catch (error: any) {
                toast.error(error?.response?.data?.message || 'Failed to create GL account');
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    const updateGlAccount = useCallback(
        async (
            id: string,
            data: {
                name?: string;
                code?: string;
                accountGroupId?: string;
                description?: string;
                isActive?: boolean;
            },
        ) => {
            setLoading(true);
            try {
                const res = await apiClient.patch(`${coaBase}/accounts/${id}`, data);
                toast.success('GL account updated');
                return res;
            } catch (error: any) {
                toast.error(error?.response?.data?.message || 'Failed to update GL account');
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    const deleteGlAccount = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const res = await apiClient.delete(`${coaBase}/accounts/${id}`);
            toast.success('GL account deleted');
            return res;
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete GL account');
        } finally {
            setLoading(false);
        }
    }, []);

    // --- GL Reports ---

    const glReportsBase = '/finance-core/general-ledger/reports';

    const fetchTrialBalance = useCallback(
        async (range?: { from?: string; to?: string }) => {
            setLoading(true);
            try {
                const res = await apiClient.get(`${glReportsBase}/trial-balance`, {
                    params: range,
                });
                return res;
            } catch (error) {
                toast.error('Error fetching trial balance');
                return { rows: [], totalDebit: 0, totalCredit: 0, balanced: true };
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    const fetchAccountLedger = useCallback(
        async (accountId: string, range?: { from?: string; to?: string }) => {
            setLoading(true);
            try {
                const res = await apiClient.get(
                    `/finance-core/general-ledger/accounts/${accountId}/ledger`,
                    { params: range },
                );
                return res;
            } catch (error) {
                toast.error('Error fetching account ledger');
                return { account: null, openingBalance: 0, closingBalance: 0, entries: [] };
            } finally {
                setLoading(false);
            }
        },
        [],
    );

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
        vendorId?: string;
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

    const createPurchaseOrder = useCallback(async (
        requisitionId: string,
        lines?: Array<{ description: string; quantity: number; unitAmount: number; glAccountId?: string | null; costCenterId?: string | null }>,
    ) => {
        setLoading(true);
        try {
            const res = await apiClient.post('/finance-core/purchase-orders', { requisitionId, lines });
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

    // --- Vendor Master ---

    const fetchVendors = useCallback(async (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
        setLoading(true);
        try {
            return await apiClient.get('/finance-core/vendors', { params });
        } catch (error) {
            toast.error('Error fetching vendors');
            return { data: [], total: 0, page: 1, limit: 10 };
        } finally {
            setLoading(false);
        }
    }, []);

    const createVendor = useCallback(async (data: {
        code: string;
        name: string;
        taxId?: string;
        contactName?: string;
        email?: string;
        phone?: string;
        address?: string;
        paymentTermsDays?: number;
        currency?: string;
        notes?: string;
    }) => {
        setLoading(true);
        try {
            const res = await apiClient.post('/finance-core/vendors', data);
            toast.success('Vendor created');
            return res;
        } catch (error) {
            toast.error('Failed to create vendor');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateVendor = useCallback(async (id: string, data: Partial<{
        name: string;
        taxId: string;
        contactName: string;
        email: string;
        phone: string;
        address: string;
        paymentTermsDays: number;
        currency: string;
        notes: string;
    }>) => {
        setLoading(true);
        try {
            const res = await apiClient.patch(`/finance-core/vendors/${id}`, data);
            toast.success('Vendor updated');
            return res;
        } catch (error) {
            toast.error('Failed to update vendor');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const setVendorStatus = useCallback(async (id: string, status: 'ACTIVE' | 'INACTIVE') => {
        setLoading(true);
        try {
            const action = status === 'ACTIVE' ? 'activate' : 'deactivate';
            const res = await apiClient.post(`/finance-core/vendors/${id}/${action}`);
            toast.success(status === 'ACTIVE' ? 'Vendor activated' : 'Vendor deactivated');
            return res;
        } catch (error) {
            toast.error('Failed to update vendor status');
            throw error;
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
            return res;
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

    // --- OPEX Budgets (canonical analytics + management) ---

    const getOpexAnalytics = useCallback(async (params?: { fiscalYearId?: string; costCenterId?: string }) => {
        setLoading(true);
        try {
            const data = await apiClient.get<OpexAnalytics>('/operational-budgets/analytics', { params });
            // `api` sets validateStatus to `status < 500`, so 4xx responses
            // resolve as successes and hand back NestJS's error envelope
            // ({ statusCode, message, error }) instead of a payload. Without this
            // check the caller receives a truthy object with no `totals` and
            // crashes on first dereference. Treat a non-conforming body as the
            // failure it actually is.
            if (!data || typeof data !== 'object' || !data.totals) {
                const message = (data as { message?: string } | null)?.message;
                toast.error(message || 'Error fetching OPEX analytics');
                return null;
            }
            return data;
        } catch (error) {
            toast.error('Error fetching OPEX analytics');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchOperationalBudgets = useCallback(async () => {
        setLoading(true);
        try {
            return await apiClient.get('/operational-budgets');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchOperationalExpenses = useCallback(async (budgetId: string, status?: string) => {
        setLoading(true);
        try {
            return await apiClient.get('/operational-budgets/expense/all', {
                params: { budget_id: budgetId, ...(status ? { status } : {}) }
            });
        } finally {
            setLoading(false);
        }
    }, []);

    const updateOperationalExpense = useCallback(async (id: string, data: { amount: number; item_description: string }) => {
        setLoading(true);
        try {
            return await apiClient.patch(`/operational-budgets/expense/${id}`, data);
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteOperationalExpense = useCallback(async (id: string) => {
        setLoading(true);
        try {
            return await apiClient.delete(`/operational-budgets/expense/${id}`);
        } finally {
            setLoading(false);
        }
    }, []);

    const approveOperationalExpense = useCallback(async (id: string, payload: { tenant_id?: string; actor_user_id?: string }) => {
        setLoading(true);
        try {
            return await apiClient.post(`/operational-budgets/expense/${id}/approve`, payload);
        } finally {
            setLoading(false);
        }
    }, []);

    const rejectOperationalExpense = useCallback(async (id: string, payload: { tenant_id?: string; actor_user_id?: string; reason: string }) => {
        setLoading(true);
        try {
            return await apiClient.post(`/operational-budgets/expense/${id}/reject`, payload);
        } finally {
            setLoading(false);
        }
    }, []);

    const submitOperationalBudgetToGovernance = useCallback(async (budgetId: string, payload: { tenant_id?: string; actor_user_id?: string }) => {
        setLoading(true);
        try {
            return await apiClient.post(`/operational-budgets/${budgetId}/submit-to-governance`, payload);
        } finally {
            setLoading(false);
        }
    }, []);

    const payInvoice = useCallback(async (id: string, payload: { tenant_id?: string }) => {
        setLoading(true);
        try {
            return await apiClient.post(`/finance-core/invoices/${id}/pay`, payload);
        } finally {
            setLoading(false);
        }
    }, []);

    const deletePayrollLineItem = useCallback(async (runId: string, itemId: string, params?: { tenant_id?: string }) => {
        setLoading(true);
        try {
            return await apiClient.delete(`/finance/payroll/runs/${runId}/items/${itemId}`, { params });
        } finally {
            setLoading(false);
        }
    }, []);

    const createDepartment = useCallback(async (data: { name: string; code: string; parentId?: string }) => {
        setLoading(true);
        try {
            return await apiClient.post('/finance-core/departments', data);
        } finally {
            setLoading(false);
        }
    }, []);

    const createCostCenter = useCallback(async (data: { name: string; code: string; departmentId: string }) => {
        setLoading(true);
        try {
            return await apiClient.post('/finance-core/cost-centers', data);
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

    const fetchReportBlob = useCallback(async (endpoint: string) => {
        setLoading(true);
        try {
            const response = await apiClient.getAxiosInstance().get(endpoint, {
                responseType: 'blob'
            });
            return new Blob([response.data], { type: 'application/pdf' });
        } catch (error) {
            toast.error('Error generating report');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const fetchWBSForExpense = useCallback(async (projectId: string) => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/wbs/budget/rollup?projectId=${projectId}`);
            return res || [];
        } catch (error) {
            toast.error('Error fetching WBS for expense');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createLiveExpense = useCallback(async (data: {
        wbs_id: string;
        amount: number;
        description: string;
        quantity?: number;
        days?: number;
        expense_date: string;
    }) => {
        setLoading(true);
        try {
            const res = await apiClient.post('/wbs/expense/live-entry', data);
            toast.success('Expense logged successfully');
            return res;
        } catch (error) {
            toast.error('Failed to log expense');
        } finally {
            setLoading(false);
        }
    }, []);

    // --- Phase 4: Encumbrance, Receipts, 3-Way Match, Needs-Attention ---

    const reverseOperationalExpense = useCallback(async (id: string, reason?: string) => {
        setLoading(true);
        try {
            return await apiClient.post(`/operational-budgets/expense/${id}/reverse`, { reason });
        } finally {
            setLoading(false);
        }
    }, []);

    const getOpexNeedsAttention = useCallback(async (limit?: number): Promise<OpexNeedsAttentionResult | null> => {
        setLoading(true);
        try {
            const res = await apiClient.get<OpexNeedsAttentionResult>('/operational-budgets/needs-attention', {
                params: limit ? { limit } : {},
            });
            return res;
        } catch (error) {
            toast.error('Error fetching OPEX needs-attention queue');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const getProcurementNeedsAttention = useCallback(async () => {
        setLoading(true);
        try {
            return await apiClient.get('/finance-core/procurement-needs-attention');
        } catch (error) {
            toast.error('Error fetching procurement needs-attention queue');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const getBudgetForecastBridge = useCallback(async (budgetId: string) => {
        setLoading(true);
        try {
            const res = await apiClient.get(
                `/operational-budgets/${budgetId}/forecast-bridge`,
            );
            return Array.isArray(res) ? res : (res?.data ?? []);
        } catch (error) {
            toast.error('Error fetching forecast bridge');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const recordReceipt = useCallback(async (data: {
        purchaseOrderId: string;
        receivedDate: string;
        quantity?: number;
        unitAmount?: number;
        notes?: string;
        currency?: string;
        exchangeRate?: number;
        lines?: Array<{ purchaseOrderLineId: string; quantity: number; unitAmount?: number }>;
    }) => {
        setLoading(true);
        try {
            const res = await apiClient.post('/finance-core/receipts', data);
            toast.success('Receipt recorded');
            return res;
        } catch (error) {
            toast.error('Failed to record receipt');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const getPurchaseOrderReceipts = useCallback(async (purchaseOrderId: string) => {
        setLoading(true);
        try {
            return await apiClient.get(`/finance-core/purchase-orders/${purchaseOrderId}/receipts`);
        } catch (error) {
            toast.error('Error fetching receipts');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const getThreeWayMatch = useCallback(async (purchaseOrderId: string): Promise<ThreeWayMatchResult | null> => {
        setLoading(true);
        try {
            const res = await apiClient.get<ThreeWayMatchResult>(
                `/finance-core/purchase-orders/${purchaseOrderId}/three-way-match`,
            );
            return res;
        } catch (error) {
            toast.error('Error running three-way match');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading, fetchFiscalYears, fetchEmployees, createFiscalYear, fetchDepartments, fetchChartOfAccounts, fetchRequisitions, createRequisition, fetchPurchaseOrders, createPurchaseOrder, fetchInvoices, createInvoice, fetchVendors, createVendor, updateVendor, setVendorStatus, fetchBudgetConsumption, fetchPayrollRuns, fetchPayrollKPIs, createPayrollRun, fetchPayrollRunDetails, addPayrollLineItem, approvePayrollRun, postPayrollRun, fetchOperationalAnalytics, fetchCapexDashboard, fetchOpexDashboard, downloadPurchaseOrderPdf, downloadInvoicePdf, fetchReportBlob, downloadBlob, fetchWBSForExpense, createLiveExpense, getOpexAnalytics, fetchOperationalBudgets, fetchOperationalExpenses, updateOperationalExpense, deleteOperationalExpense, approveOperationalExpense, rejectOperationalExpense, submitOperationalBudgetToGovernance, payInvoice, deletePayrollLineItem, createDepartment, createCostCenter, reverseOperationalExpense, getOpexNeedsAttention, getProcurementNeedsAttention,         getBudgetForecastBridge, recordReceipt, getPurchaseOrderReceipts, getThreeWayMatch, fetchGlAccounts, seedDefaultChartOfAccounts, createAccountClass, updateAccountClass, deleteAccountClass, createAccountGroup, updateAccountGroup, deleteAccountGroup, createGlAccount, updateGlAccount, deleteGlAccount, fetchTrialBalance, fetchAccountLedger,
    };
};

