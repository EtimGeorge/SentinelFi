import { RollupData } from '../components/dashboard/WBSHierarchyTree';

export interface WBSNode {
  id: string;
  code: string;
  description: string;
  parentId: string | null;
  children: WBSNode[];
}

/**
 * Transforms a flat list of WBS items (from the backend CTE) into a nested, hierarchical array.
 */
export const buildWBSHierarchy = (flatData: RollupData[]): WBSNode[] => {
  const nodes: { [id: string]: WBSNode } = {};

  // 1. Convert flat array to a map and initialize children array
  for (const item of flatData) {
    nodes[item.wbs_id] = {
      id: item.wbs_id,
      code: item.wbs_code,
      description: item.description,
      parentId: item.parent_wbs_id,
      children: [],
    };
  }

  const tree: WBSNode[] = [];

  // 2. Build the tree structure
  for (const id in nodes) {
    const node = nodes[id];
    if (node.parentId) {
      // Find parent and add self to parent's children array
      const parent = nodes[node.parentId];
      if (parent) {
        parent.children.push(node);
      } else {
        // Handle orphaned nodes by treating them as root (if parent is missing)
        tree.push(node);
      }
    } else {
      // Add root nodes to the final tree array
      tree.push(node);
    }
  }
  
  // Sort the final tree by WBS code for correct ordering (e.g., 1.0, 1.1, 2.0)
  const sortTree = (nodes: WBSNode[]): WBSNode[] => {
    nodes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    for (const node of nodes) {
      sortTree(node.children);
    }
    return nodes;
  };

  return sortTree(tree);
};


/**
 * Flattens the hierarchy into a display-ready array with indentation.
 * @param nodes The hierarchical array of WBS nodes.
 * @param level The current indentation level.
 */
export const flattenWBSForDisplay = (nodes: WBSNode[], level: number = 0): { id: string, label: string }[] => {
    let result: { id: string, label: string }[] = [];
    
    for (const node of nodes) {
        const indent = '—'.repeat(level);
        // Use a space and the WBS Code for a clear, indented display
        result.push({ 
            id: node.id, 
            label: `${indent} ${node.code} - ${node.description}`.trim()
        });
        
        if (node.children.length > 0) {
            result = result.concat(flattenWBSForDisplay(node.children, level + 1));
        }
    }
    return result;
};

// Interface for WBS items returned by the AI agent (mirrors Python's WBSItemBase)
export interface WBSItemBase {
  wbs_code: string;
  description: string;
  unit_cost_budgeted: number;
  quantity_budgeted: number;
  parent_wbs_id: string | null;
  duration_days_budgeted: number | null;
}