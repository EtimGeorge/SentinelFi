import React, { useState } from 'react';
import { Minus, Plus, MessageSquare } from 'lucide-react';
import Tooltip from '../common/Tooltip';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getWBSColor } from '../../lib/utils';
import { useCurrency } from '../context/CurrencyContext';

// Interface for the data returned from the production-ready Recursive CTE endpoint
export interface RollupData {
  wbs_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  total_cost_budgeted: string | number;
  total_paid_rollup: string | number;
  total_paid_self: string | number;
  status?: string;
}

interface WBSHierarchyTreeProps {
  data: RollupData[];
  onWBSClick?: (wbsId: string, wbsCode: string, description: string) => void;
  sourceCurrency?: string;
}

// Helper component for a single WBS Node
const WBSNode: React.FC<{
  node: RollupData,
  level: number,
  childNodes: RollupData[],
  data: RollupData[],
  onWBSClick?: (wbsId: string, wbsCode: string, description: string) => void,
  sourceCurrency: string
}> = ({ node, level, childNodes, data, onWBSClick, sourceCurrency }) => {
  const { convertToDisplay } = useCurrency();
  const [isExpanded, setIsExpanded] = useState(level === 0);

  const budgeted = Number(node.total_cost_budgeted || 0);
  const spent = Number(node.total_paid_rollup || 0);
  const variance = budgeted - spent;
  const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

  // Get color for Level 1 WBS (e.g., '1.0', '2.0', etc.)
  const wbsColor = getWBSColor(node.wbs_code.split('.')[0]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  // Custom Class based on level for indent/font weight
  const depthClass = level === 0 ? 'font-bold text-lg' : (level === 1 ? 'font-semibold' : 'text-sm');
  const indentStyle = { paddingLeft: `${level * 1.5}rem` };

  // Variance display logic
  const varianceClass = variancePercent <= -10 ? 'text-alert-critical' : (variancePercent > 0 ? 'text-alert-positive' : 'text-gray-400');
  const varianceIcon = variancePercent <= -10 ? '🔴' : (variancePercent > 0 ? '🟢' : '⚫');

  return (
    <div>
      <div
        className={`flex items-center py-2 transition-colors duration-100 ${depthClass} ${level % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-800/40'}`}
        style={indentStyle}
      >
        {/* Toggle Button/WBS Code */}
        <div className="w-1/6 flex items-center min-w-[70px]">
          {childNodes.length > 0 ? (
            <button onClick={toggleExpand} className="p-1 text-gray-400 hover:text-white">
              {isExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-5 h-5 block"></span>
          )}
          <span
            className="ml-1 cursor-pointer hover:underline flex items-center gap-1"
            style={{ color: wbsColor }}
            onClick={() => onWBSClick && onWBSClick(node.wbs_id, node.wbs_code, node.description)}
          >
            {node.wbs_code}
            <MessageSquare className="w-3 h-3 opacity-40 hover:opacity-100 transition-opacity" />
          </span>
        </div>

        {/* Description/Bar (Dynamic Element) */}
        <div
          className="w-2/5 min-w-[120px] text-left whitespace-nowrap overflow-hidden text-ellipsis mr-2 cursor-pointer hover:underline text-gray-200"
          onClick={() => onWBSClick && onWBSClick(node.wbs_id, node.wbs_code, node.description)}
        >
          <Tooltip content={node.description}>
            {node.description}
          </Tooltip>
        </div>

        {/* Budgeted Cost */}
        <div className="w-1/6 text-right min-w-[100px] text-gray-200 font-medium">
          {convertToDisplay(budgeted, sourceCurrency)}
        </div>

        {/* Actual Paid (Rollup) */}
        <div className="w-1/6 text-right min-w-[100px] text-gray-200 font-medium">
          {convertToDisplay(spent, sourceCurrency)}
        </div>

        {/* Variance (%) */}
        <div className={`w-1/6 text-right min-w-[80px] font-semibold ${varianceClass}`}>
          <Tooltip content={`Variance: ${convertToDisplay(variance, sourceCurrency)}`}>
            {varianceIcon} {variancePercent.toFixed(1)}%
          </Tooltip>
        </div>

      </div>

      {/* Recursively render childNodes */}
      {isExpanded && childNodes.length > 0 && (
        <div className="">
          {childNodes.map(child => (
            <WBSNode
              key={child.wbs_id}
              node={child}
              level={level + 1}
              childNodes={data.filter(i => i.parent_wbs_id === child.wbs_id)}
              data={data}
              onWBSClick={onWBSClick}
              sourceCurrency={sourceCurrency}
            />
          ))}
        </div>
      )}
    </div>
  );
};


/**
 * Main component to render the WBS hierarchy table structure.
 */
const WBSHierarchyTree: React.FC<WBSHierarchyTreeProps> = ({ data, onWBSClick, sourceCurrency = 'NGN' }) => {
  const { userCurrency } = useCurrency();

  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-gray-500">No WBS/Budget data found for the selected period.</div>;
  }

  // Build the hierarchical structure starting with root nodes
  const rootNodes = data.filter(item => !item.parent_wbs_id);

  return (
    <div className="bg-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-700">

      {/* Table Header (Grid Layout) */}
      <div className="flex bg-brand-dark/50 text-gray-300 text-xs font-semibold uppercase px-4 py-3 border-b border-gray-700">
        <div className="w-1/6 min-w-[70px]">Code</div>
        <div className="w-2/5 min-w-[120px] text-left">Description</div>
        <div className="w-1/6 text-right min-w-[100px]">Budget</div>
        <div className="w-1/6 text-right min-w-[100px]">Actual (Rollup)</div>
        <div className="w-1/6 text-right min-w-[80px]">Variance</div>
      </div>

      {/* WBS Tree Body */}
      <div className="p-4 space-y-1">
        {rootNodes.map(node => {
          return (
            <WBSNode
              key={node.wbs_id}
              node={node}
              level={0}
              childNodes={data.filter(i => i.parent_wbs_id === node.wbs_id)}
              data={data}
              onWBSClick={onWBSClick}
              sourceCurrency={sourceCurrency}
            />
          );
        })}
      </div>
    </div>
  );
};

export default WBSHierarchyTree;