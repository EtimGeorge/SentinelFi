### STEP 108 - Create WBS Hierarchy Tree Component

**GUIDANCE:** This component is vital for visualising the WBS data. It processes the raw, flat data returned by the backend's Recursive CTE (`/wbs/budget/rollup`) and renders it as a nested tree. Color-coding is applied to WBS Level 1 based on the **WBS Category Palette** for immediate visual segmentation. The component uses a `Grid/Flex` layout for professional spacing and includes a basic variance column.

**FILE PATH:** `./frontend/components/dashboard/WBSHierarchyTree.tsx` (Create this file and directory)

```tsx
import React from 'react';
import { Minus, Plus } from 'lucide-react';
import Tooltip from '../common/Tooltip';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getWBSColor } from '../../lib/utils'; // <- Utility functions to be created next

// Interface for the data returned from the production-ready Recursive CTE endpoint
export interface RollupData {
  wbs_id: string;
  parent_wbs_id: string | null;
  wbs_code: string;
  description: string;
  total_cost_budgeted: string; // From DB (NUMERIC)
  total_paid_rollup: string;   // From DB (NUMERIC)
  total_paid_self: string;     // From DB (NUMERIC)
}

interface WBSHierarchyTreeProps {
  data: RollupData[];
}

// Helper component for a single WBS Node
const WBSNode: React.FC<{ node: RollupData, level: number, children: RollupData[] }> = ({ node, level, children }) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const router = useRouter(); // Import useRouter here

  const budgeted = Number(node.total_cost_budgeted);
  const spent = Number(node.total_paid_rollup);
  const variance = budgeted - spent;
  const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;
  
  // Get color for Level 1 WBS (e.g., '1.0', '2.0', etc.)
  const wbsColor = getWBSColor(node.wbs_code.split('.')[0]);

  const toggleExpand = () => setIsExpanded(!isExpanded);
  
  // Custom Class based on level for indent/font weight
  const depthClass = level === 0 ? 'font-bold text-lg' : (level === 1 ? 'font-semibold' : 'text-sm');
  const indentStyle = { paddingLeft: `${level * 1.5}rem` };
  
  // Variance display logic
  const varianceClass = variancePercent <= -10 ? 'text-alert-critical' : (variancePercent > 0 ? 'text-alert-positive' : 'text-brand-charcoal');
  const varianceIcon = variancePercent <= -10 ? '🔴' : (variancePercent > 0 ? '🟢' : '⚫');

  return (
    <div>
      <div 
        className={`flex items-center text-brand-dark hover:bg-gray-100 py-2 transition-colors duration-100 ${depthClass}`} 
        style={indentStyle}
      >
        {/* Toggle Button/WBS Code */}
        <div className="w-1/6 flex items-center min-w-[70px]">
          {children.length > 0 ? (
            <button onClick={toggleExpand} className="p-1 text-gray-500 hover:text-brand-dark">
              {isExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-5 h-5 block"></span>
          )}
          <span className="ml-1" style={{ color: wbsColor }}>{node.wbs_code}</span>
        </div>
        
        {/* Description/Bar (Dynamic Element) */}
        <div className="w-2/5 min-w-[120px] text-left whitespace-nowrap overflow-hidden text-ellipsis mr-2">
          <Tooltip content={node.description}>
             {node.description}
          </Tooltip>
        </div>

        {/* Budgeted Cost */}
        <div className="w-1/6 text-right min-w-[100px] text-brand-dark font-medium">
          {formatCurrency(budgeted)}
        </div>
        
        {/* Actual Paid (Rollup) */}
        <div className="w-1/6 text-right min-w-[100px] text-brand-dark font-medium">
          {formatCurrency(spent)}
        </div>

        {/* Variance (%) */}
        <div className={`w-1/6 text-right min-w-[80px] font-semibold ${varianceClass}`}>
          <Tooltip content={`Variance: ${formatCurrency(variance)}`}>
            {varianceIcon} {variancePercent.toFixed(1)}%
          </Tooltip>
        </div>
        
      </div>
      
      {/* Recursively render children */}
      {isExpanded && children.length > 0 && (
        <div className="pl-4">
          {children.map(child => (
            <WBSNode 
              key={child.wbs_id} 
              node={child} 
              level={level + 1} 
              children={data.filter(i => i.parent_wbs_id === child.wbs_id)} 
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
const WBSHierarchyTree: React.FC<WBSHierarchyTreeProps> = ({ data }) => {
  const { user } = useAuth();
  
  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-gray-500">No WBS/Budget data found. Please create a draft.</div>;
  }

  // Build the hierarchical structure starting with root nodes
  const rootNodes = data.filter(item => !item.parent_wbs_id);

  // Fallback if all items have a parent (flat structure without root)
  const renderableNodes = rootNodes.length > 0 ? rootNodes : data;
  
  // Renderable nodes are nodes that are either root or have a parent that exists.
  // We use rootNodes/data here for simplicity, the recursive component handles the rest.

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      
      {/* Table Header (Grid Layout) */}
      <div className="flex bg-gray-100 text-brand-dark text-xs font-semibold uppercase px-4 py-3 border-b">
        <div className="w-1/6 min-w-[70px]">Code</div>
        <div className="w-2/5 min-w-[120px] text-left">Description</div>
        <div className="w-1/6 text-right min-w-[100px]">Budget</div>
        <div className="w-1/6 text-right min-w-[100px]">Actual (Rollup)</div>
        <div className="w-1/6 text-right min-w-[80px]">Variance</div>
      </div>

      {/* WBS Tree Body */}
      <div className="p-4 space-y-1">
        {renderableNodes.map(node => {
          // Only start rendering from the absolute root (no parent)
          if (node.parent_wbs_id === null) {
            return (
              <WBSNode 
                key={node.wbs_id} 
                node={node} 
                level={0} 
                children={data.filter(i => i.parent_wbs_id === node.wbs_id)} 
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default WBSHierarchyTree;
```

NEXT ACTION: Save the file as `./frontend/components/dashboard/WBSHierarchyTree.tsx`. We must now create the utility functions it relies on.

---