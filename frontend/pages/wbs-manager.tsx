import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import PageContainer from '../components/Layout/PageContainer';
import { TrendingUp, Plus, Trash2, Edit3, Save, X, AlertTriangle, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import Card from '../components/common/Card';
import { useSecuredApi } from '../components/hooks/useSecuredApi';
import { useAuth, RoleEnum as Role } from '../components/context/AuthContext';
import useToast from '../store/toastStore';
import { formatCurrency, getWBSColor } from '../lib/utils';

interface WBSItem {
  wbs_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  total_cost_budgeted: number;
}

const WBSManagerPage: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const api = useSecuredApi();
  const addToast = useToast(state => state.addToast);
  
  const [items, setItems] = useState<WBSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // State for Add/Edit
  const [actionNode, setActionNode] = useState<{ type: 'add' | 'edit', parentId: string | null, node?: WBSItem } | null>(null);
  const [formData, setFormData] = useState({ code: '', description: '', amount: 0 });

  const canManage = hasAnyRole([Role.Admin, Role.Finance]);

  const fetchWBSData = useCallback(async () => {
    setLoading(true);
    try {
      // Use the rollup endpoint to get ALL items for the tenant
      const response = await api.get<WBSItem[]>('/wbs/budget/rollup');
      setItems(response.data);
      
      // Auto-expand root nodes
      const roots = response.data.filter(i => !i.parent_wbs_id);
      setExpandedNodes(new Set(roots.map(r => r.wbs_id)));
    } catch (e: any) {
      addToast(`Failed to fetch WBS: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [api, addToast]);

  useEffect(() => {
    fetchWBSData();
  }, [fetchWBSData]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedNodes(newExpanded);
  };

  const handleAction = (type: 'add' | 'edit', parentId: string | null = null, node?: WBSItem) => {
    setActionNode({ type, parentId, node });
    setFormData({
      code: node?.wbs_code || (parentId ? items.find(i => i.wbs_id === parentId)?.wbs_code + '.' : ''),
      description: node?.description || '',
      amount: node?.total_cost_budgeted || 0
    });
  };

  const saveAction = async () => {
    if (!formData.code || !formData.description) return;
    
    setLoading(true);
    try {
      if (actionNode?.type === 'add') {
        // Find a project_id - in a real app, this would be selected. 
        // For now, we'll try to find any existing project_id or use a global one
        const projectId = items.length > 0 ? (items[0] as any).project_id : null;
        
        await api.post('/wbs/budget-draft', {
          wbs_code: formData.code,
          description: formData.description,
          total_cost_budgeted: formData.amount,
          parent_wbs_id: actionNode.parentId,
          project_id: projectId // Placeholder logic
        });
        addToast('Item added successfully', 'success');
      } else if (actionNode?.type === 'edit' && actionNode.node) {
        await api.patch(`/wbs/budget-draft/${actionNode.node.wbs_id}`, {
          wbs_code: formData.code,
          description: formData.description,
          total_cost_budgeted: formData.amount
        });
        addToast('Item updated successfully', 'success');
      }
      setActionNode(null);
      fetchWBSData();
    } catch (e: any) {
      addToast(`Action failed: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure? This will delete the item and all its children.')) return;
    
    setLoading(true);
    try {
      await api.delete(`/wbs/budget-draft/${id}?recursive=true`);
      addToast('Deleted successfully', 'success');
      fetchWBSData();
    } catch (e: any) {
      addToast(`Delete failed: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderTree = (parentId: string | null = null, level: number = 0) => {
    const children = items.filter(i => i.parent_wbs_id === parentId)
      .sort((a, b) => a.wbs_code.localeCompare(b.wbs_code, undefined, { numeric: true }));

    return children.map(item => {
      const isExpanded = expandedNodes.has(item.wbs_id);
      const hasChildren = items.some(i => i.parent_wbs_id === item.wbs_id);
      const wbsColor = getWBSColor(item.wbs_code.split('.')[0]);

      return (
        <React.Fragment key={item.wbs_id}>
          <div 
            className={`group flex items-center p-3 border-b border-gray-800 hover:bg-white/5 transition-all ${level > 0 ? 'ml-4 border-l-2' : ''}`}
            style={{ borderLeftColor: level > 0 ? wbsColor : 'transparent' }}
          >
            <div className="flex items-center flex-grow min-w-0">
               {hasChildren ? (
                 <button onClick={() => toggleExpand(item.wbs_id)} className="mr-2">
                   {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                 </button>
               ) : <div className="w-6" />}
               
               <div className="flex flex-col truncate">
                 <span className="font-mono text-xs font-bold" style={{ color: wbsColor }}>{item.wbs_code}</span>
                 <span className="text-gray-200 truncate pr-4">{item.description}</span>
               </div>
            </div>

            <div className="text-right mr-6 font-semibold text-sm text-gray-400">
              {formatCurrency(item.total_cost_budgeted)}
            </div>

            {canManage && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleAction('add', item.wbs_id)} className="p-1.5 text-brand-primary hover:bg-brand-primary/20 rounded" title="Add Child">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => handleAction('edit', item.parent_wbs_id, item)} className="p-1.5 text-gray-400 hover:bg-gray-700 rounded" title="Edit">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(item.wbs_id)} className="p-1.5 text-red-500 hover:bg-red-900/40 rounded" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {isExpanded && renderTree(item.wbs_id, level + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <>
      <Head><title>WBS Master Builder | SentinelFi</title></Head>
      <PageContainer 
        title="WBS Master Builder"
        subtitle="Construct and manage your project's hierarchical cost structure with precision."
        headerContent={<Layers className="w-8 h-8 text-brand-primary" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          <div className="lg:col-span-3">
            <Card title="WBS Architecture" subtitle="Hierarchical view of all projects and costs. Hover over items to manage." borderTopColor="primary">
               {loading && items.length === 0 ? (
                 <div className="flex flex-col items-center justify-center p-12">
                   <TrendingUp className="w-12 h-12 text-gray-700 animate-pulse mb-4" />
                   <p className="text-gray-500">Loading WBS structure...</p>
                 </div>
               ) : (
                 <div className="bg-brand-dark/40 rounded-lg overflow-hidden min-h-[400px]">
                    <div className="bg-gray-800/50 p-3 border-b border-gray-700 flex text-xs font-bold text-gray-400 uppercase">
                        <div className="flex-grow">Structure & Description</div>
                        <div className="w-32 text-right mr-20">Amount</div>
                        {canManage && <div className="w-24">Actions</div>}
                    </div>
                    {items.length === 0 ? (
                      <div className="p-12 text-center text-gray-500">
                        No items found. Start by creating a Top-Level element.
                        <br />
                        <button onClick={() => handleAction('add')} className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-lg">Create First WBS</button>
                      </div>
                    ) : renderTree(null)}
                 </div>
               )}
            </Card>
          </div>

          <div className="lg:col-span-1">
            {actionNode ? (
              <Card 
                title={actionNode.type === 'add' ? 'Add WBS Element' : 'Edit WBS Element'} 
                borderTopColor={actionNode.type === 'add' ? 'positive' : 'secondary'}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WBS Code</label>
                    <input 
                      type="text" 
                      value={formData.code} 
                      onChange={e => setFormData({...formData, code: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 p-2 rounded text-white font-mono"
                      placeholder="e.g. 1.1.2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                    <textarea 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 p-2 rounded text-white h-24"
                      placeholder="Enter detailed description..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Budgeted Amount (NGN)</label>
                    <input 
                      type="number" 
                      value={formData.amount} 
                      onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                      className="w-full bg-gray-800 border border-gray-700 p-2 rounded text-white"
                    />
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button 
                      onClick={saveAction}
                      disabled={loading}
                      className="flex-grow flex items-center justify-center py-2 bg-brand-primary text-white rounded font-bold hover:bg-brand-primary/80 transition"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save
                    </button>
                    <button 
                      onClick={() => setActionNode(null)}
                      className="px-4 py-2 bg-gray-700 text-gray-300 rounded font-bold hover:bg-gray-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card title="WBS Controls" borderTopColor="alert">
                <div className="space-y-4">
                   <p className="text-sm text-gray-400">Select an item in the tree to edit or add children.</p>
                   {canManage && (
                     <button 
                       onClick={() => handleAction('add')}
                       className="w-full flex items-center justify-center p-3 border-2 border-dashed border-gray-700 rounded-lg text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 transition"
                     >
                       <Plus className="w-5 h-5 mr-2" /> Add Top-Level Node
                     </button>
                   )}
                   <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                      <p className="text-xs text-yellow-300 flex items-start">
                        <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                        Deleting a node recursively deletes ALL sub-items. This action is irreversible.
                      </p>
                   </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default WBSManagerPage;