import { HierarchyNode } from '@/types/organization';

/**
 * Mock data for organization hierarchy
 * This provides sample data for development and testing
 */

export const mockHierarchyData: HierarchyNode = {
  id: 'org-root',
  type: 'school',
  name: 'Gloria International School',
  code: 'GIS-001',
  level: 0,
  children: [
    {
      id: 'dept-1',
      type: 'department',
      name: 'Academic Affairs',
      code: 'ACAD-001',
      level: 1,
      parentId: 'org-root',
      metadata: {
        isActive: true,
        hierarchyLevel: 1,
        employeeCount: 45,
        address: 'Building A, Floor 3',
        phone: '+62 21 1234 5678',
        email: 'academic@gloria.school'
      },
      children: [
        {
          id: 'pos-1',
          type: 'position',
          name: 'Head of Academic Affairs',
          code: 'POS-ACAD-001',
          level: 2,
          parentId: 'dept-1',
          metadata: {
            isActive: true,
            hierarchyLevel: 2,
            employeeCount: 1
          },
          children: [
            {
              id: 'user-1',
              type: 'user',
              name: 'Dr. Sarah Johnson',
              level: 3,
              parentId: 'pos-1',
              metadata: {
                isActive: true,
                email: 'sarah.johnson@gloria.school',
                phone: '+62 21 1234 5679'
              },
              children: []
            }
          ]
        },
        {
          id: 'pos-2',
          type: 'position',
          name: 'Curriculum Coordinator',
          code: 'POS-ACAD-002',
          level: 2,
          parentId: 'dept-1',
          metadata: {
            isActive: true,
            hierarchyLevel: 2,
            employeeCount: 3
          },
          children: [
            {
              id: 'user-2',
              type: 'user',
              name: 'Michael Chen',
              level: 3,
              parentId: 'pos-2',
              metadata: {
                isActive: true,
                email: 'michael.chen@gloria.school'
              },
              children: []
            },
            {
              id: 'user-3',
              type: 'user',
              name: 'Lisa Anderson',
              level: 3,
              parentId: 'pos-2',
              metadata: {
                isActive: true,
                email: 'lisa.anderson@gloria.school'
              },
              children: []
            }
          ]
        },
        {
          id: 'dept-sub-1',
          type: 'department',
          name: 'Elementary Division',
          code: 'ELEM-001',
          level: 2,
          parentId: 'dept-1',
          metadata: {
            isActive: true,
            hierarchyLevel: 2,
            employeeCount: 20
          },
          children: [
            {
              id: 'pos-3',
              type: 'position',
              name: 'Elementary Principal',
              code: 'POS-ELEM-001',
              level: 3,
              parentId: 'dept-sub-1',
              metadata: {
                isActive: true,
                hierarchyLevel: 3,
                employeeCount: 1
              },
              children: []
            },
            {
              id: 'pos-4',
              type: 'position',
              name: 'Grade 1 Teacher',
              code: 'POS-ELEM-002',
              level: 3,
              parentId: 'dept-sub-1',
              metadata: {
                isActive: true,
                hierarchyLevel: 3,
                employeeCount: 4
              },
              children: []
            }
          ]
        },
        {
          id: 'dept-sub-2',
          type: 'department',
          name: 'Secondary Division',
          code: 'SEC-001',
          level: 2,
          parentId: 'dept-1',
          metadata: {
            isActive: true,
            hierarchyLevel: 2,
            employeeCount: 25
          },
          children: [
            {
              id: 'pos-5',
              type: 'position',
              name: 'Secondary Principal',
              code: 'POS-SEC-001',
              level: 3,
              parentId: 'dept-sub-2',
              metadata: {
                isActive: true,
                hierarchyLevel: 3,
                employeeCount: 1
              },
              children: []
            }
          ]
        }
      ]
    },
    {
      id: 'dept-2',
      type: 'department',
      name: 'Administration',
      code: 'ADMIN-001',
      level: 1,
      parentId: 'org-root',
      metadata: {
        isActive: true,
        hierarchyLevel: 1,
        employeeCount: 30,
        address: 'Building B, Floor 1',
        phone: '+62 21 1234 5680',
        email: 'admin@gloria.school'
      },
      children: [
        {
          id: 'pos-6',
          type: 'position',
          name: 'Administrative Director',
          code: 'POS-ADMIN-001',
          level: 2,
          parentId: 'dept-2',
          metadata: {
            isActive: true,
            hierarchyLevel: 2,
            employeeCount: 1
          },
          children: [
            {
              id: 'user-4',
              type: 'user',
              name: 'Robert Williams',
              level: 3,
              parentId: 'pos-6',
              metadata: {
                isActive: true,
                email: 'robert.williams@gloria.school'
              },
              children: []
            }
          ]
        },
        {
          id: 'dept-sub-3',
          type: 'department',
          name: 'Human Resources',
          code: 'HR-001',
          level: 2,
          parentId: 'dept-2',
          metadata: {
            isActive: true,
            hierarchyLevel: 2,
            employeeCount: 8
          },
          children: [
            {
              id: 'pos-7',
              type: 'position',
              name: 'HR Manager',
              code: 'POS-HR-001',
              level: 3,
              parentId: 'dept-sub-3',
              metadata: {
                isActive: true,
                hierarchyLevel: 3,
                employeeCount: 1
              },
              children: []
            },
            {
              id: 'pos-8',
              type: 'position',
              name: 'HR Specialist',
              code: 'POS-HR-002',
              level: 3,
              parentId: 'dept-sub-3',
              metadata: {
                isActive: true,
                hierarchyLevel: 3,
                employeeCount: 3
              },
              children: []
            }
          ]
        },
        {
          id: 'dept-sub-4',
          type: 'department',
          name: 'Finance',
          code: 'FIN-001',
          level: 2,
          parentId: 'dept-2',
          metadata: {
            isActive: true,
            hierarchyLevel: 2,
            employeeCount: 10
          },
          children: [
            {
              id: 'pos-9',
              type: 'position',
              name: 'Finance Manager',
              code: 'POS-FIN-001',
              level: 3,
              parentId: 'dept-sub-4',
              metadata: {
                isActive: true,
                hierarchyLevel: 3,
                employeeCount: 1
              },
              children: []
            },
            {
              id: 'pos-10',
              type: 'position',
              name: 'Accountant',
              code: 'POS-FIN-002',
              level: 3,
              parentId: 'dept-sub-4',
              metadata: {
                isActive: true,
                hierarchyLevel: 3,
                employeeCount: 4
              },
              children: []
            }
          ]
        }
      ]
    },
    {
      id: 'dept-3',
      type: 'department',
      name: 'Student Services',
      code: 'STUD-001',
      level: 1,
      parentId: 'org-root',
      metadata: {
        isActive: true,
        hierarchyLevel: 1,
        employeeCount: 15,
        address: 'Building C, Floor 2',
        phone: '+62 21 1234 5681',
        email: 'student.services@gloria.school'
      },
      children: [
        {
          id: 'pos-11',
          type: 'position',
          name: 'Director of Student Services',
          code: 'POS-STUD-001',
          level: 2,
          parentId: 'dept-3',
          metadata: {
            isActive: true,
            hierarchyLevel: 2,
            employeeCount: 1
          },
          children: []
        },
        {
          id: 'pos-12',
          type: 'position',
          name: 'Counselor',
          code: 'POS-STUD-002',
          level: 2,
          parentId: 'dept-3',
          metadata: {
            isActive: true,
            hierarchyLevel: 2,
            employeeCount: 5
          },
          children: []
        },
        {
          id: 'pos-13',
          type: 'position',
          name: 'Registrar',
          code: 'POS-STUD-003',
          level: 2,
          parentId: 'dept-3',
          metadata: {
            isActive: false,  // Example of inactive position
            hierarchyLevel: 2,
            employeeCount: 0
          },
          children: []
        }
      ]
    },
    {
      id: 'dept-4',
      type: 'department',
      name: 'IT Services',
      code: 'IT-001',
      level: 1,
      parentId: 'org-root',
      metadata: {
        isActive: true,
        hierarchyLevel: 1,
        employeeCount: 12,
        address: 'Building D, Floor 1',
        phone: '+62 21 1234 5682',
        email: 'it.support@gloria.school'
      },
      children: [
        {
          id: 'pos-14',
          type: 'position',
          name: 'IT Director',
          code: 'POS-IT-001',
          level: 2,
          parentId: 'dept-4',
          metadata: {
            isActive: true,
            hierarchyLevel: 2,
            employeeCount: 1
          },
          children: [
            {
              id: 'user-5',
              type: 'user',
              name: 'David Kim',
              level: 3,
              parentId: 'pos-14',
              metadata: {
                isActive: true,
                email: 'david.kim@gloria.school',
                phone: '+62 21 1234 5683'
              },
              children: []
            }
          ]
        },
        {
          id: 'pos-15',
          type: 'position',
          name: 'System Administrator',
          code: 'POS-IT-002',
          level: 2,
          parentId: 'dept-4',
          metadata: {
            isActive: true,
            hierarchyLevel: 2,
            employeeCount: 3
          },
          children: []
        },
        {
          id: 'pos-16',
          type: 'position',
          name: 'Help Desk Technician',
          code: 'POS-IT-003',
          level: 2,
          parentId: 'dept-4',
          metadata: {
            isActive: true,
            hierarchyLevel: 2,
            employeeCount: 4
          },
          children: []
        }
      ]
    }
  ],
  metadata: {
    isActive: true,
    hierarchyLevel: 0,
    employeeCount: 102,
    address: 'Jl. Pendidikan No. 1, Jakarta 12345',
    phone: '+62 21 1234 5600',
    email: 'info@gloria.school'
  }
};

/**
 * Generate additional mock users for testing
 */
export function generateMockUsers(count: number = 10): HierarchyNode[] {
  const users: HierarchyNode[] = [];
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Mary'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    users.push({
      id: `user-mock-${i}`,
      type: 'user',
      name: `${firstName} ${lastName}`,
      level: 3,
      children: [],
      metadata: {
        isActive: Math.random() > 0.1,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gloria.school`,
        phone: `+62 21 ${Math.floor(Math.random() * 9000) + 1000} ${Math.floor(Math.random() * 9000) + 1000}`
      }
    });
  }
  
  return users;
}

/**
 * Function to simulate API delay
 */
export async function simulateApiDelay(ms: number = 500): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}