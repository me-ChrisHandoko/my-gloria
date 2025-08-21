import { HierarchyNode } from '@/types/organization';

/**
 * Type-safe hierarchy utilities
 */

export type NodeType = 'school' | 'department' | 'position' | 'user';

export interface HierarchyStats {
  totalNodes: number;
  nodesByType: Record<NodeType, number>;
  maxDepth: number;
  activeNodes: number;
  inactiveNodes: number;
}

/**
 * Calculate statistics for a hierarchy tree
 */
export function calculateHierarchyStats(node: HierarchyNode | null): HierarchyStats {
  const stats: HierarchyStats = {
    totalNodes: 0,
    nodesByType: {
      school: 0,
      department: 0,
      position: 0,
      user: 0,
    },
    maxDepth: 0,
    activeNodes: 0,
    inactiveNodes: 0,
  };

  if (!node) return stats;

  function traverse(currentNode: HierarchyNode, depth: number = 0) {
    stats.totalNodes++;
    stats.nodesByType[currentNode.type]++;
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    if (currentNode.metadata?.isActive !== false) {
      stats.activeNodes++;
    } else {
      stats.inactiveNodes++;
    }

    currentNode.children?.forEach(child => traverse(child, depth + 1));
  }

  traverse(node);
  return stats;
}

/**
 * Find a node by ID in the hierarchy tree
 */
export function findNodeById(
  root: HierarchyNode | null,
  targetId: string
): HierarchyNode | null {
  if (!root) return null;
  if (root.id === targetId) return root;

  for (const child of root.children || []) {
    const found = findNodeById(child, targetId);
    if (found) return found;
  }

  return null;
}

/**
 * Get the path from root to a specific node
 */
export function getNodePath(
  root: HierarchyNode | null,
  targetId: string
): HierarchyNode[] {
  if (!root) return [];

  function findPath(node: HierarchyNode, path: HierarchyNode[] = []): HierarchyNode[] | null {
    const currentPath = [...path, node];
    
    if (node.id === targetId) {
      return currentPath;
    }

    for (const child of node.children || []) {
      const result = findPath(child, currentPath);
      if (result) return result;
    }

    return null;
  }

  return findPath(root) || [];
}

/**
 * Flatten hierarchy tree to a list
 */
export function flattenHierarchy(node: HierarchyNode | null): HierarchyNode[] {
  if (!node) return [];

  const result: HierarchyNode[] = [node];
  
  node.children?.forEach(child => {
    result.push(...flattenHierarchy(child));
  });

  return result;
}

/**
 * Filter nodes by type
 */
export function filterNodesByType(
  node: HierarchyNode | null,
  type: NodeType
): HierarchyNode[] {
  return flattenHierarchy(node).filter(n => n.type === type);
}

/**
 * Search nodes by name or code
 */
export function searchNodes(
  node: HierarchyNode | null,
  searchTerm: string
): HierarchyNode[] {
  if (!searchTerm) return flattenHierarchy(node);

  const term = searchTerm.toLowerCase();
  return flattenHierarchy(node).filter(n => 
    n.name.toLowerCase().includes(term) ||
    (n.code && n.code.toLowerCase().includes(term))
  );
}

/**
 * Check if a node has any active children
 */
export function hasActiveChildren(node: HierarchyNode): boolean {
  if (!node.children || node.children.length === 0) return false;

  return node.children.some(child => 
    child.metadata?.isActive !== false || hasActiveChildren(child)
  );
}

/**
 * Get node color scheme based on type
 */
export function getNodeColorScheme(type: NodeType): {
  bgColor: string;
  textColor: string;
  borderColor: string;
} {
  const schemes = {
    school: {
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      textColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    department: {
      bgColor: 'bg-green-50 dark:bg-green-950',
      textColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    position: {
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      textColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-800',
    },
    user: {
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      textColor: 'text-orange-600 dark:text-orange-400',
      borderColor: 'border-orange-200 dark:border-orange-800',
    },
  };

  return schemes[type];
}

/**
 * Export hierarchy data to different formats
 */
export function exportHierarchy(
  node: HierarchyNode | null,
  format: 'json' | 'csv' = 'json'
): string {
  if (!node) return '';

  if (format === 'json') {
    return JSON.stringify(node, null, 2);
  }

  // CSV export
  const rows: string[] = ['ID,Type,Name,Code,Level,ParentID,Active'];
  
  function addRow(current: HierarchyNode, parentId = '') {
    const active = current.metadata?.isActive !== false ? 'Yes' : 'No';
    rows.push(
      `"${current.id}","${current.type}","${current.name}","${current.code || ''}","${current.level}","${parentId}","${active}"`
    );
    
    current.children?.forEach(child => addRow(child, current.id));
  }

  addRow(node);
  return rows.join('\n');
}