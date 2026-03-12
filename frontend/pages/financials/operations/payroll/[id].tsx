import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import PageContainer from '../../../../components/Layout/PageContainer';
import Card from '../../../../components/common/Card';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import { useFinanceCore } from '../../../../hooks/useFinanceCore';
import { useCurrency } from '../../../../components/context/CurrencyContext';
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  Users,
  Settings,
  ShieldCheck,
  Send,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

const PayrollRunDetailsPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { convertToDisplay } = useCurrency();
  const {
    loading,
    fetchPayrollRunDetails,
    addPayrollLineItem,
    approvePayrollRun,
    postPayrollRun,
    fetchDepartments,
    fetchChartOfAccounts,
    fetchEmployees
  } = useFinanceCore();

  const [run, setRun] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // New Item Form
  const [employeeId, setEmployeeId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [glAccountId, setGlAccountId] = useState('');
  const [itemType, setItemType] = useState('BASE_SALARY');
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    const data = await fetchPayrollRunDetails(id as string);
    if (data) setRun(data.data);

    const [depts, accounts, emps] = await Promise.all([
      fetchDepartments(),
      fetchChartOfAccounts(),
      fetchEmployees()
    ]);
    setDepartments(depts.data || []);
    setCoa(accounts.data || []);
    setEmployees(emps || []);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !costCenterId || !glAccountId || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const res = await addPayrollLineItem(id as string, {
      employeeId,
      costCenterId,
      glAccountId,
      itemType,
      amount
    });

    if (res) {
      setShowAddItemModal(false);
      loadData();
      // Reset form
      setEmployeeId('');
      setAmount(0);
    }
  };

  const handleApprove = async () => {
    if (confirm('Are you sure you want to approve this payroll run? This will lock it from further editing.')) {
      await approvePayrollRun(id as string);
      loadData();
    }
  };

  const handlePost = async () => {
    if (confirm('POST TO LEDGER? This will finalize the expenditure and subtract from departmental budgets.')) {
      await postPayrollRun(id as string);
      loadData();
    }
  };

  if (!run && loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="w-8 h-8 text-gray-700 animate-pulse" />
        </div>
      </>
    );
  }

  if (!run) return null;

  const statusConfig: any = {
    DRAFT: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-800', icon: Clock },
    REVIEW: { label: 'Reviewing', color: 'text-yellow-400', bg: 'bg-yellow-900/30', icon: AlertCircle },
    APPROVED: { label: 'Approved', color: 'text-brand-primary', bg: 'bg-brand-primary/10', icon: CheckCircle2 },
    POSTED: { label: 'Posted', color: 'text-green-400', bg: 'bg-green-900/30', icon: ShieldCheck },
  };

  const currentCfg = statusConfig[run.status] || statusConfig.DRAFT;
  const StatusIcon = currentCfg.icon;

  return (
    <>
      <Head>
        <title>{run.run_identifier} | SentinelFi</title>
      </Head>

      <PageContainer
        title={run.run_identifier}
        subtitle={`Payroll cycle for ${run.fiscalPeriod?.period_name} ${new Date(run.fiscalPeriod?.start_date).getFullYear()}`}
        headerContent={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/financials/operations/payroll')}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            {run.status === 'DRAFT' && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Approve Run
              </Button>
            )}
            {run.status === 'APPROVED' && (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePost}
                icon={<ShieldCheck className="w-4 h-4" />}
                className="bg-green-600 hover:bg-green-700"
              >
                Post to Ledger
              </Button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Line Items */}
          <div className="lg:col-span-3 space-y-6">
            <Card
              title="Employee Line Items"
              subtitle="Individual salary and benefit breakdowns for this cycle."
              headerContent={
                run.status === 'DRAFT' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowAddItemModal(true)}
                    icon={<Plus className="w-3 h-3" />}
                  >
                    Add Employee
                  </Button>
                )
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-800 font-black text-[10px] text-gray-500 uppercase tracking-widest">
                      <th className="p-4">Employee</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Cost Center</th>
                      <th className="p-4 text-right">Amount</th>
                      {run.status === 'DRAFT' && <th className="p-4"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {run.lineItems?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-gray-600 italic text-sm">
                          No line items added yet. Click 'Add Employee' to begin.
                        </td>
                      </tr>
                    ) : run.lineItems?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-brand-primary">
                              <User size={14} />
                            </div>
                            <div>
                              <div className="font-bold text-gray-200">
                                {item.employee?.full_name || 'System Generated'}
                              </div>
                              <div className="text-[10px] text-gray-500 font-medium">EMP-ID: {item.employee_id.substring(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                            {item.item_type}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-bold text-gray-300">{item.costCenter?.name}</div>
                          <div className="text-[10px] text-gray-500">{item.costCenter?.code}</div>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-gray-100">
                          {convertToDisplay(item.amount, 'NGN')}
                        </td>
                        {run.status === 'DRAFT' && (
                          <td className="p-4 text-right">
                            <button className="text-gray-600 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right Column: Run Summary */}
          <div className="lg:col-span-1 space-y-6">
            <Card title="Cycle Summary" borderTopColor="primary">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-800/40 rounded-xl border border-gray-700">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${currentCfg.bg} ${currentCfg.color}`}>
                    <StatusIcon size={12} />
                    {currentCfg.label}
                  </span>
                </div>

                <div className="space-y-2 px-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Gross Salaries</span>
                    <span className="font-bold text-gray-200">{convertToDisplay(run.total_gross_pay, 'NGN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Employer Tax</span>
                    <span className="font-bold text-gray-200">{convertToDisplay(run.total_taxes_employer, 'NGN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Employer Benefits</span>
                    <span className="font-bold text-gray-200">{convertToDisplay(run.total_benefits_employer, 'NGN')}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-gray-800 flex justify-between">
                    <span className="font-black text-gray-400 uppercase text-[10px]">Total Burden</span>
                    <span className="font-black text-brand-primary">
                      {convertToDisplay(Number(run.total_gross_pay) + Number(run.total_taxes_employer) + Number(run.total_benefits_employer), 'NGN')}
                    </span>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-xl">
                    <p className="text-[10px] text-brand-primary font-black uppercase mb-1 flex items-center gap-1">
                      <DollarSign size={10} /> Funding Impact
                    </p>
                    <p className="text-xs text-gray-400 leading-relaxed italic">
                      Posting this run will permanently debit departmental OPEX budgets for the {run.fiscalPeriod?.period_name} period.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Approval Trail">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={12} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-300">Run Initialized</p>
                    <p className="text-[10px] text-gray-500">{new Date(run.created_at).toLocaleString()}</p>
                  </div>
                </div>
                {run.status !== 'DRAFT' && (
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
                      <Send size={12} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-300">Run Approved</p>
                      <p className="text-[10px] text-gray-500">Submitted by Finance Mgr</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Add Item Modal */}
        {showAddItemModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Plus className="text-brand-primary" />
                  Add Payroll Expenditure
                </h2>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Employee</label>
                    <select
                      className="w-full bg-brand-dark/60 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Item Type</label>
                    <select
                      className="w-full bg-brand-dark/60 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none"
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value)}
                      required
                    >
                      <option value="BASE_SALARY">Base Salary</option>
                      <option value="BONUS">Special Bonus</option>
                      <option value="COMMISSION">Sales Commission</option>
                      <option value="EMPLOYER_TAX">Employer Tax (Pension/Social)</option>
                      <option value="EMPLOYER_BENEFIT">Employer Benefit</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Accounting Allocation (Cost Center)</label>
                  <select
                    className="w-full bg-brand-dark/60 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none"
                    value={costCenterId}
                    onChange={(e) => setCostCenterId(e.target.value)}
                    required
                  >
                    <option value="">Select Cost Center</option>
                    {departments.map(dept => (
                      <optgroup key={dept.id} label={dept.name}>
                        {dept.costCenters?.map((cc: any) => (
                          <option key={cc.id} value={cc.id}>{cc.name} ({cc.code})</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">GL Account (Chart of Accounts)</label>
                  <select
                    className="w-full bg-brand-dark/60 border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-brand-primary outline-none"
                    value={glAccountId}
                    onChange={(e) => setGlAccountId(e.target.value)}
                    required
                  >
                    <option value="">Select GL Account</option>
                    {coa.map(aclass => (
                      <optgroup key={aclass.id} label={aclass.name}>
                        {aclass.accountGroups?.map((group: any) => (
                          group.glAccounts?.map((gl: any) => (
                            <option key={gl.id} value={gl.id}>{gl.code} - {gl.name}</option>
                          ))
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <Input
                  type="number"
                  label="Amount"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  required
                />

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setShowAddItemModal(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={loading}>Add Entry</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
};

export default PayrollRunDetailsPage;
