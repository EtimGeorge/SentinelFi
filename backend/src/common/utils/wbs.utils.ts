/**
 * Utility for handling WBS (Work Breakdown Structure) logic.
 */
export class WbsUtils {
  /**
   * Sorts an array of objects containing a WBS code in hierarchical order.
   * Example: 1.0, 1.1, 1.2, 1.2.1, 1.2.2, 2.0...
   */
  static sortHierarchically<T extends { wbs_code: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
      const aParts = a.wbs_code.split('.').map(Number);
      const bParts = b.wbs_code.split('.').map(Number);
      
      const maxLength = Math.max(aParts.length, bParts.length);
      
      for (let i = 0; i < maxLength; i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        
        if (aVal !== bVal) {
          return aVal - bVal;
        }
      }
      
      return 0;
    });
  }

  /**
   * Groups items into a tree structure based on WBS codes.
   * Useful for internal processing if needed, though most reports 
   * expect a flattened but sorted list.
   */
  static toTree<T extends { wbs_code: string }>(items: T[]): any[] {
    const sorted = this.sortHierarchically(items);
    // Simple tree logic can be added here if complex nesting is required for Word/PDF
    return sorted; // For now, flattened sorted is preferred by current Utils
  }
}
