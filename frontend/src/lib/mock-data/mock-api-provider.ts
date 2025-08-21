import { HierarchyNode, HierarchyFilterDto } from '@/types/organization';
import { mockHierarchyData, simulateApiDelay } from './hierarchy-mock-data';

/**
 * Mock API Provider for development
 * This can be toggled on/off via environment variable or localStorage
 */

export class MockApiProvider {
  private static instance: MockApiProvider;
  private useMockData: boolean = false;

  private constructor() {
    // Check if we should use mock data
    this.checkMockDataStatus();
  }

  static getInstance(): MockApiProvider {
    if (!MockApiProvider.instance) {
      MockApiProvider.instance = new MockApiProvider();
    }
    return MockApiProvider.instance;
  }

  /**
   * Check if mock data should be used
   * PRODUCTION MODE - Mock data is disabled
   */
  private checkMockDataStatus(): void {
    // PRODUCTION MODE - Always use real backend
    this.useMockData = false;
    
    // Clear any mock data flags from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('USE_MOCK_DATA');
    }
  }

  /**
   * Enable mock data
   */
  enableMockData(): void {
    this.useMockData = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('USE_MOCK_DATA', 'true');
    }
    console.log('🎭 Mock data enabled');
  }

  /**
   * Disable mock data
   */
  disableMockData(): void {
    this.useMockData = false;
    if (typeof window !== 'undefined') {
      localStorage.setItem('USE_MOCK_DATA', 'false');
    }
    console.log('🔌 Mock data disabled - using real API');
  }

  /**
   * Toggle mock data
   */
  toggleMockData(): boolean {
    if (this.useMockData) {
      this.disableMockData();
    } else {
      this.enableMockData();
    }
    return this.useMockData;
  }

  /**
   * Check if mock data is enabled
   */
  isMockDataEnabled(): boolean {
    return this.useMockData;
  }

  /**
   * Get organization hierarchy (mock implementation)
   */
  async getOrganizationHierarchy(filters?: HierarchyFilterDto): Promise<HierarchyNode> {
    if (!this.useMockData) {
      throw new Error('Mock data is disabled. This method should not be called.');
    }

    // Simulate API delay
    await simulateApiDelay(300);

    let data = { ...mockHierarchyData };

    // Apply filters if provided
    if (filters) {
      // Filter by type
      if (filters.type) {
        data = this.filterByType(data, filters.type);
      }

      // Filter inactive nodes
      if (!filters.includeInactive) {
        data = this.filterInactiveNodes(data);
      }

      // Limit depth
      if (filters.maxDepth !== undefined) {
        data = this.limitDepth(data, filters.maxDepth);
      }
    }

    console.log('📊 Returning mock hierarchy data', data);
    return data;
  }

  /**
   * Filter nodes by type
   */
  private filterByType(node: HierarchyNode, type: string): HierarchyNode {
    const filterRecursive = (n: HierarchyNode): HierarchyNode | null => {
      if (n.type === type) {
        return n;
      }

      const filteredChildren = n.children
        ?.map(child => filterRecursive(child))
        .filter(Boolean) as HierarchyNode[];

      if (filteredChildren && filteredChildren.length > 0) {
        return {
          ...n,
          children: filteredChildren
        };
      }

      return null;
    };

    return filterRecursive(node) || node;
  }

  /**
   * Filter out inactive nodes
   */
  private filterInactiveNodes(node: HierarchyNode): HierarchyNode {
    if (node.metadata?.isActive === false) {
      return { ...node, children: [] };
    }

    return {
      ...node,
      children: node.children
        ?.filter(child => child.metadata?.isActive !== false)
        .map(child => this.filterInactiveNodes(child)) || []
    };
  }

  /**
   * Limit the depth of the hierarchy
   */
  private limitDepth(node: HierarchyNode, maxDepth: number, currentDepth: number = 0): HierarchyNode {
    if (currentDepth >= maxDepth) {
      return { ...node, children: [] };
    }

    return {
      ...node,
      children: node.children?.map(child => 
        this.limitDepth(child, maxDepth, currentDepth + 1)
      ) || []
    };
  }

  /**
   * Get user hierarchy (mock implementation)
   */
  async getUserHierarchy(userId: string): Promise<HierarchyNode> {
    if (!this.useMockData) {
      throw new Error('Mock data is disabled. This method should not be called.');
    }

    await simulateApiDelay(300);

    // Find the user in the hierarchy and return their branch
    const findUser = (node: HierarchyNode): HierarchyNode | null => {
      if (node.type === 'user' && node.id === userId) {
        return node;
      }

      for (const child of node.children || []) {
        const found = findUser(child);
        if (found) {
          return {
            ...node,
            children: [found]
          };
        }
      }

      return null;
    };

    const userBranch = findUser(mockHierarchyData);
    
    if (userBranch) {
      console.log(`📊 Returning mock user hierarchy for ${userId}`, userBranch);
      return userBranch;
    }

    // Return a default user hierarchy if not found
    return {
      id: userId,
      type: 'user',
      name: 'Current User',
      level: 0,
      children: [],
      metadata: {
        isActive: true,
        email: 'user@gloria.school'
      }
    };
  }
}

// Export singleton instance
export const mockApiProvider = MockApiProvider.getInstance();

// Export helper function for easy access
export function useMockData(): boolean {
  return mockApiProvider.isMockDataEnabled();
}

// Export toggle function for development toolbar
export function toggleMockData(): boolean {
  return mockApiProvider.toggleMockData();
}