import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import PageContainer from '../../../components/Layout/PageContainer';
import Card from '../../../components/common/Card';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import EmptyState from '../../../components/common/EmptyState';
import { TableSkeleton } from '../../../components/common/LoadingSkeleton';
import { useFinanceCore } from '../../../hooks/useFinanceCore';
import { useAuth, Role } from '../../../components/context/AuthContext';
import { AccountClassType, ACCOUNT_CLASS_NORMAL_BALANCE } from '@shared/types';
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  RefreshCcw,
  ChevronRight,
  ChevronDown,
  Layers,
  Hash,
  Sparkles,
  CheckCircle,
  Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface GlAccount {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  account_group_id: string;
}

interface AccountGroup {
  id: string;
  name: string;
  code: string;
  account_class_id: string;
  glAccounts?: GlAccount[];
}

interface AccountClass {
  id: string;
  name: string;
  code: string;
  base_type: AccountClassType;
  accountGroups?: AccountGroup[];
}

const BASE_TYPE_OPTIONS = (Object.values(AccountClassType) as AccountClassType[]).map((t) => ({
  value: t,
  label: `${t} (debit-normal: ${ACCOUNT_CLASS_NORMAL_BALANCE[t] === 'DEBIT' ? 'yes' : 'no'})`,
}));

const emptyClassForm = { name: '', code: '', baseType: AccountClassType.EXPENSE };
const emptyGroupForm = { name: '', code: '', accountClassId: '' };
const emptyAccountForm = {
  name: '',
  code: '',
  accountGroupId: '',
  description: '',
  isActive: true,
};

const baseTypeBadge: Record<AccountClassType, string> = {
  [AccountClassType.ASSET]: 'bg-teal-900/30 text-teal-400',
  [AccountClassType.LIABILITY]: 'bg-blue-900/30 text-blue-400',
  [AccountClassType.EQUITY]: 'bg-purple-900/30 text-purple-400',
  [AccountClassType.REVENUE]: 'bg-green-900/30 text-green-400',
  [AccountClassType.EXPENSE]: 'bg-orange-900/30 text-orange-400',
};

// Mirrors the backend RBAC in chart-of-accounts.controller.ts. Seeding is
// additive/idempotent so the CEO (who can view this page) may bootstrap the
// chart; destructive CRUD stays finance/admin only.
const COA_MANAGE_ROLES: Role[] = [
  Role.CFO,
  Role.FinanceManager,
  Role.AdminDirector,
  Role.AdminManager,
];
const COA_SEED_ROLES: Role[] = [...COA_MANAGE_ROLES, Role.CEO];

const ChartOfAccountsPage: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const canManageCoa = hasAnyRole(COA_MANAGE_ROLES);
  const canSeedCoa = hasAnyRole(COA_SEED_ROLES);

  const {
    fetchChartOfAccounts,
    seedDefaultChartOfAccounts,
    createAccountClass,
    updateAccountClass,
    deleteAccountClass,
    createAccountGroup,
    updateAccountGroup,
    deleteAccountGroup,
    createGlAccount,
    updateGlAccount,
    deleteGlAccount,
  } = useFinanceCore();

  const [tree, setTree] = useState<AccountClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [search, setSearch] = useState('');

  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [isClassOpen, setIsClassOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<AccountClass | null>(null);
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [classSaving, setClassSaving] = useState(false);

  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AccountGroup | null>(null);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [groupSaving, setGroupSaving] = useState(false);

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<GlAccount | null>(null);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [accountSaving, setAccountSaving] = useState(false);

  const [confirm, setConfirm] = useState<{
    kind: 'class' | 'group' | 'account';
    id: string;
    title: string;
    message: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await fetchChartOfAccounts();
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setTree(list);
    } finally {
      setLoading(false);
    }
  }, [fetchChartOfAccounts]);

  useEffect(() => {
    load();
  }, [load]);

  const totalAccounts = useMemo(
    () =>
      tree.reduce(
        (sum, c) => sum + (c.accountGroups ?? []).reduce((s, g) => s + (g.glAccounts?.length ?? 0), 0),
        0,
      ),
    [tree],
  );

  const matches = useCallback(
    (value?: string) =>
      !search.trim() || (value ?? '').toLowerCase().includes(search.trim().toLowerCase()),
    [search],
  );

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    return tree
      .map((c) => {
        const groups = (c.accountGroups ?? [])
          .map((g) => {
            const accounts = (g.glAccounts ?? []).filter(
              (a) => matches(a.name) || matches(a.code),
            );
            const groupHit = matches(g.name) || matches(g.code);
            if (!groupHit && accounts.length === 0) return null;
            return { ...g, glAccounts: groupHit ? (g.glAccounts ?? []) : accounts };
          })
          .filter(Boolean) as AccountGroup[];
        const classHit = matches(c.name) || matches(c.code);
        if (!classHit && groups.length === 0) return null;
        return { ...c, accountGroups: classHit ? (c.accountGroups ?? []) : groups };
      })
      .filter(Boolean) as AccountClass[];
  }, [tree, search, matches]);

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    id: string,
  ) =>
    setter((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

  // --- Class handlers ---
  const openCreateClass = () => {
    setEditingClass(null);
    setClassForm(emptyClassForm);
    setIsClassOpen(true);
  };

  const openEditClass = (c: AccountClass) => {
    setEditingClass(c);
    setClassForm({ name: c.name, code: c.code, baseType: c.base_type });
    setIsClassOpen(true);
  };

  const saveClass = async () => {
    if (!classForm.name.trim() || !classForm.code.trim()) {
      toast.error('Class name and code are required.');
      return;
    }
    setClassSaving(true);
    try {
      const payload = {
        name: classForm.name.trim(),
        code: classForm.code.trim(),
        baseType: classForm.baseType,
      };
      if (editingClass) await updateAccountClass(editingClass.id, payload);
      else await createAccountClass(payload);
      setIsClassOpen(false);
      load();
    } catch {
      // Hook already toasted the failure.
    } finally {
      setClassSaving(false);
    }
  };

  // --- Group handlers ---
  const openCreateGroup = (classId: string) => {
    setEditingGroup(null);
    setGroupForm({ ...emptyGroupForm, accountClassId: classId });
    setIsGroupOpen(true);
  };

  const openEditGroup = (g: AccountGroup) => {
    setEditingGroup(g);
    setGroupForm({ name: g.name, code: g.code, accountClassId: g.account_class_id });
    setIsGroupOpen(true);
  };

  const saveGroup = async () => {
    if (!groupForm.name.trim() || !groupForm.code.trim() || !groupForm.accountClassId) {
      toast.error('Group name, code, and parent class are required.');
      return;
    }
    setGroupSaving(true);
    try {
      const payload = {
        name: groupForm.name.trim(),
        code: groupForm.code.trim(),
        accountClassId: groupForm.accountClassId,
      };
      if (editingGroup) await updateAccountGroup(editingGroup.id, payload);
      else await createAccountGroup(payload);
      setIsGroupOpen(false);
      load();
    } catch {
      // Hook already toasted the failure.
    } finally {
      setGroupSaving(false);
    }
  };

  // --- Account handlers ---
  const openCreateAccount = (groupId: string) => {
    setEditingAccount(null);
    setAccountForm({ ...emptyAccountForm, accountGroupId: groupId });
    setIsAccountOpen(true);
  };

  const openEditAccount = (a: GlAccount) => {
    setEditingAccount(a);
    setAccountForm({
      name: a.name,
      code: a.code,
      accountGroupId: a.account_group_id,
      description: a.description ?? '',
      isActive: a.is_active,
    });
    setIsAccountOpen(true);
  };

  const saveAccount = async () => {
    if (!accountForm.name.trim() || !accountForm.code.trim() || !accountForm.accountGroupId) {
      toast.error('Account name, code, and parent group are required.');
      return;
    }
    setAccountSaving(true);
    try {
      const payload = {
        name: accountForm.name.trim(),
        code: accountForm.code.trim(),
        accountGroupId: accountForm.accountGroupId,
        description: accountForm.description.trim() || undefined,
        isActive: accountForm.isActive,
      };
      if (editingAccount) await updateGlAccount(editingAccount.id, payload);
      else await createGlAccount(payload);
      setIsAccountOpen(false);
      load();
    } catch {
      // Hook already toasted the failure.
    } finally {
      setAccountSaving(false);
    }
  };

  const handleSeed = async () => {
    if (isSeeding || !canSeedCoa) return;
    setIsSeeding(true);
    try {
      await seedDefaultChartOfAccounts();
      await load();
    } catch {
      // Hook already toasted the failure.
    } finally {
      setIsSeeding(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirm) return;
    try {
      if (confirm.kind === 'class') await deleteAccountClass(confirm.id);
      else if (confirm.kind === 'group') await deleteAccountGroup(confirm.id);
      else await deleteGlAccount(confirm.id);
      setConfirm(null);
      load();
    } catch {
      setConfirm(null);
    }
  };

  const setClassField =
    (key: keyof typeof emptyClassForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setClassForm((f) => ({ ...f, [key]: e.target.value }));

  const setGroupField =
    (key: keyof typeof emptyGroupForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setGroupForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <Head>
        <title>Chart of Accounts | SentinelFi</title>
      </Head>
      <PageContainer
        title="Chart of Accounts"
        subtitle="Double-entry account master backing every journal posting — classes, groups, and GL accounts."
        headerContent={<BookOpen className="w-8 h-8 text-brand-primary" />}
      >
        <Card title="Controls" accent="primary" className="border border-gray-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Search"
              placeholder="Name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="md:col-span-3 flex flex-wrap items-end gap-2">
              {canManageCoa && (
                <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateClass}>
                  New Class
                </Button>
              )}
              <Button
                variant="secondary"
                icon={<Sparkles className="w-4 h-4" />}
                onClick={handleSeed}
                isLoading={isSeeding}
                disabled={!canSeedCoa}
                title={
                  canSeedCoa
                    ? 'Create the standard chart of accounts if it does not exist yet'
                    : 'Your role can view the chart but not seed it'
                }
              >
                Seed Default Chart
              </Button>
              <Button variant="outline" icon={<RefreshCcw className="w-4 h-4" />} onClick={load}>
                Refresh
              </Button>
              <span className="ml-auto text-xs text-gray-400 self-end pb-1">
                {tree.length} classes A� {totalAccounts} GL accounts
              </span>
            </div>
          </div>
        </Card>

        {!canManageCoa && (
          <p className="mb-4 text-xs text-gray-400">
            Read-only view — your role can review the chart of accounts but cannot modify it.
          </p>
        )}

        <Card title="Account Hierarchy" accent="secondary" className="border border-gray-700">
          {loading ? (
            <TableSkeleton columns={4} rows={8} />
          ) : filteredTree.length === 0 ? (
            <EmptyState
              pathname="/financials/operations/chart-of-accounts"
              title={search ? 'No matching accounts' : 'No chart of accounts yet'}
              subtitle={
                search
                  ? 'Try a different name or code.'
                  : canSeedCoa
                    ? 'Seed the default chart to get started.'
                    : 'No chart has been set up yet. Ask a finance administrator to seed it.'
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredTree.map((cls) => {
                const clsOpen = expandedClasses[cls.id] ?? false;
                return (
                  <div key={cls.id} className="rounded-lg border border-gray-700 bg-brand-dark/60">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggle(setExpandedClasses, cls.id)}
                        className="flex items-center gap-2 text-left flex-1 min-w-0"
                      >
                        {clsOpen ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="font-mono text-xs font-black text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded">
                          {cls.code}
                        </span>
                        <span className="text-sm font-bold text-gray-200 truncate">{cls.name}</span>
                        <span
                          className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                            baseTypeBadge[cls.base_type] ?? 'bg-gray-700/50 text-gray-400'
                          }`}
                        >
                          {cls.base_type}
                        </span>
                      </button>
                      {canManageCoa && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            icon={<Plus className="w-4 h-4" />}
                            onClick={() => openCreateGroup(cls.id)}
                          >
                            Group
                          </Button>
                          <button
                            type="button"
                            onClick={() => openEditClass(cls)}
                            className="p-2 text-gray-400 hover:text-brand-primary"
                            title="Edit class"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({
                                kind: 'class',
                                id: cls.id,
                                title: 'Delete Account Class',
                                message: `"${cls.name}" and all of its groups and accounts will be removed.`,
                              })
                            }
                            className="p-2 text-gray-400 hover:text-red-400"
                            title="Delete class"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {clsOpen && (
                      <div className="px-4 pb-4 space-y-2">
                        {(cls.accountGroups ?? []).length === 0 ? (
                          <p className="text-sm text-gray-500 pl-6">No account groups yet.</p>
                        ) : (
                          (cls.accountGroups ?? []).map((grp) => {
                            const grpOpen = expandedGroups[grp.id] ?? false;
                            return (
                              <div
                                key={grp.id}
                                className="rounded-md border border-gray-800 bg-brand-darker/60 ml-6"
                              >
                                <div className="flex items-center gap-3 px-3 py-2">
                                  <button
                                    type="button"
                                    onClick={() => toggle(setExpandedGroups, grp.id)}
                                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                                  >
                                    {grpOpen ? (
                                      <ChevronDown className="w-4 h-4 text-gray-600" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-600" />
                                    )}
                                    <Layers className="w-4 h-4 text-gray-500" />
                                    <span className="font-mono text-[11px] font-bold text-gray-400">
                                      {grp.code}
                                    </span>
                                    <span className="text-sm text-gray-300 truncate">{grp.name}</span>
                                    <span className="text-xs text-gray-500">
                                      {grp.glAccounts?.length ?? 0} accounts
                                    </span>
                                  </button>
                                  {canManageCoa && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => openCreateAccount(grp.id)}
                                        className="p-2 text-gray-500 hover:text-brand-primary"
                                        title="Add GL account"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openEditGroup(grp)}
                                        className="p-2 text-gray-500 hover:text-brand-primary"
                                        title="Edit group"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirm({
                                            kind: 'group',
                                            id: grp.id,
                                            title: 'Delete Account Group',
                                            message: `"${grp.name}" and all of its GL accounts will be removed.`,
                                          })
                                        }
                                        className="p-2 text-gray-500 hover:text-red-400"
                                        title="Delete group"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {grpOpen && (
                                  <div className="border-t border-gray-800 px-3 py-2 space-y-1">
                                    {(grp.glAccounts ?? []).length === 0 ? (
                                      <p className="text-sm text-gray-600 pl-6">No GL accounts yet.</p>
                                    ) : (
                                      (grp.glAccounts ?? []).map((acc) => (
                                        <div
                                          key={acc.id}
                                          className="flex items-center gap-3 px-3 py-1.5 rounded hover:bg-gray-800/40"
                                        >
                                          <Hash className="w-3.5 h-3.5 text-gray-600" />
                                          <span className="font-mono text-[11px] font-bold text-gray-400 w-14">
                                            {acc.code}
                                          </span>
                                          <span className="text-sm text-gray-300 flex-1 truncate">
                                            {acc.name}
                                          </span>
                                          {acc.description && (
                                            <span className="text-xs text-gray-600 truncate max-w-[16rem] hidden md:block">
                                              {acc.description}
                                            </span>
                                          )}
                                          <span
                                            className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                                              acc.is_active
                                                ? 'bg-green-900/30 text-green-400'
                                                : 'bg-gray-700/50 text-gray-400'
                                            }`}
                                          >
                                            {acc.is_active ? (
                                              <CheckCircle className="w-3 h-3" />
                                            ) : (
                                              <Ban className="w-3 h-3" />
                                            )}
                                            {acc.is_active ? 'Active' : 'Inactive'}
                                          </span>
                                          {canManageCoa && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => openEditAccount(acc)}
                                                className="p-1.5 text-gray-500 hover:text-brand-primary"
                                                title="Edit account"
                                              >
                                                <Edit3 className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setConfirm({
                                                    kind: 'account',
                                                    id: acc.id,
                                                    title: 'Delete GL Account',
                                                    message: `"${acc.name}" will be removed from the chart.`,
                                                  })
                                                }
                                                className="p-1.5 text-gray-500 hover:text-red-400"
                                                title="Delete account"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Class modal */}
        <Modal
          isOpen={isClassOpen}
          onClose={() => setIsClassOpen(false)}
          title={editingClass ? 'Edit Account Class' : 'New Account Class'}
        >
          <div className="grid grid-cols-1 gap-4 pt-4">
            <Input
              label="Class Name"
              placeholder="e.g. Operating Expenses"
              value={classForm.name}
              onChange={setClassField('name')}
            />
            <Input
              label="Class Code"
              placeholder="e.g. 5000"
              value={classForm.code}
              onChange={setClassField('code')}
            />
            <Select
              label="Base Type"
              value={classForm.baseType}
              onChange={setClassField('baseType')}
              options={BASE_TYPE_OPTIONS}
            />
          </div>
          <div className="flex gap-3 justify-end pt-6">
            <Button variant="secondary" onClick={() => setIsClassOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveClass} isLoading={classSaving}>
              {editingClass ? 'Save Changes' : 'Create Class'}
            </Button>
          </div>
        </Modal>

        {/* Group modal */}
        <Modal
          isOpen={isGroupOpen}
          onClose={() => setIsGroupOpen(false)}
          title={editingGroup ? 'Edit Account Group' : 'New Account Group'}
        >
          <div className="grid grid-cols-1 gap-4 pt-4">
            <Input
              label="Group Name"
              placeholder="e.g. Payroll & Benefits"
              value={groupForm.name}
              onChange={setGroupField('name')}
            />
            <Input
              label="Group Code"
              placeholder="e.g. 5100"
              value={groupForm.code}
              onChange={setGroupField('code')}
            />
            <Select
              label="Parent Class"
              value={groupForm.accountClassId}
              onChange={setGroupField('accountClassId')}
              options={[
                { value: '', label: 'Select a class...' },
                ...tree.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
              ]}
            />
          </div>
          <div className="flex gap-3 justify-end pt-6">
            <Button variant="secondary" onClick={() => setIsGroupOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveGroup} isLoading={groupSaving}>
              {editingGroup ? 'Save Changes' : 'Create Group'}
            </Button>
          </div>
        </Modal>

        {/* Account modal */}
        <Modal
          isOpen={isAccountOpen}
          onClose={() => setIsAccountOpen(false)}
          title={editingAccount ? 'Edit GL Account' : 'New GL Account'}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <Input
              label="Account Name"
              placeholder="e.g. Salaries and Wages"
              value={accountForm.name}
              onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Account Code"
              placeholder="e.g. 5110"
              value={accountForm.code}
              onChange={(e) => setAccountForm((f) => ({ ...f, code: e.target.value }))}
            />
            <Select
              label="Parent Group"
              value={accountForm.accountGroupId}
              onChange={(e) =>
                setAccountForm((f) => ({ ...f, accountGroupId: e.target.value }))
              }
              options={[
                { value: '', label: 'Select a group...' },
                ...tree.flatMap((c) =>
                  (c.accountGroups ?? []).map((g) => ({
                    value: g.id,
                    label: `${c.code}.${g.code} — ${g.name}`,
                  })),
                ),
              ]}
            />
            <Input
              label="Description"
              placeholder="Optional"
              value={accountForm.description}
              onChange={(e) => setAccountForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Select
              label="Status"
              value={accountForm.isActive ? 'true' : 'false'}
              onChange={(e) =>
                setAccountForm((f) => ({ ...f, isActive: e.target.value === 'true' }))
              }
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
            />
          </div>
          <div className="flex gap-3 justify-end pt-6">
            <Button variant="secondary" onClick={() => setIsAccountOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveAccount} isLoading={accountSaving}>
              {editingAccount ? 'Save Changes' : 'Create Account'}
            </Button>
          </div>
        </Modal>

        <ConfirmDialog
          open={!!confirm}
          title={confirm?.title ?? ''}
          message={confirm?.message ?? ''}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          tone="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirm(null)}
        />
      </PageContainer>
    </>
  );
};

export default ChartOfAccountsPage;
