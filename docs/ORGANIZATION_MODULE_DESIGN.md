# Organization Module Design (Backend to Frontend)

## 📊 System Overview

The organization module manages the hierarchical structure of schools, departments, positions, and user assignments with full CRUD operations and approval workflows.

## 🗄️ Backend Architecture

### Data Models (Already Defined in Prisma)

```
School (Sekolah)
  ├── Department (Bagian/Unit)
  │   ├── Position (Jabatan)
  │   │   ├── UserPosition (Assignment)
  │   │   └── PositionHierarchy (Reporting)
  │   └── Sub-Departments (Nested)
  └── Direct Positions (School-level)
```

### API Structure

#### 1. School Management
```typescript
// backend/src/modules/organization/school/
POST   /api/organization/schools          - Create school
GET    /api/organization/schools          - List schools (paginated, filtered)
GET    /api/organization/schools/:id      - Get school details
PUT    /api/organization/schools/:id      - Update school
DELETE /api/organization/schools/:id      - Soft delete school
GET    /api/organization/schools/:id/tree - Get full org tree
```

#### 2. Department Management
```typescript
// backend/src/modules/organization/department/
POST   /api/organization/departments          - Create department
GET    /api/organization/departments          - List departments
GET    /api/organization/departments/:id      - Get department details
PUT    /api/organization/departments/:id      - Update department
DELETE /api/organization/departments/:id      - Soft delete
GET    /api/organization/departments/:id/tree - Get sub-departments
POST   /api/organization/departments/bulk     - Bulk operations
```

#### 3. Position Management
```typescript
// backend/src/modules/organization/position/
POST   /api/organization/positions          - Create position
GET    /api/organization/positions          - List positions
GET    /api/organization/positions/:id      - Get position details
PUT    /api/organization/positions/:id      - Update position
DELETE /api/organization/positions/:id      - Soft delete
GET    /api/organization/positions/hierarchy - Get hierarchy tree
POST   /api/organization/positions/:id/assign - Assign user
```

#### 4. User Position Assignment
```typescript
// backend/src/modules/organization/user-position/
POST   /api/organization/user-positions           - Assign position
GET    /api/organization/user-positions           - List assignments
GET    /api/organization/user-positions/:id       - Get assignment
PUT    /api/organization/user-positions/:id       - Update assignment
DELETE /api/organization/user-positions/:id       - End assignment
GET    /api/organization/users/:id/positions     - Get user positions
GET    /api/organization/positions/:id/holders   - Get position holders
POST   /api/organization/user-positions/plt       - Assign PLT
```

### Service Layer Implementation

```typescript
// backend/src/modules/organization/services/organization.service.ts
@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  // School operations with caching
  async getSchoolHierarchy(schoolId: string) {
    return this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        departments: {
          include: {
            positions: {
              include: {
                userPositions: {
                  where: { isActive: true },
                  include: { userProfile: true }
                }
              }
            },
            children: true
          }
        },
        positions: { // Direct school positions
          include: {
            userPositions: {
              where: { isActive: true }
            }
          }
        }
      }
    });
  }

  // Position hierarchy resolution
  async getReportingChain(positionId: string) {
    const hierarchy = await this.prisma.positionHierarchy.findUnique({
      where: { positionId },
      include: {
        reportsTo: true,
        coordinator: true
      }
    });
    
    // Recursive chain building
    return this.buildReportingChain(hierarchy);
  }

  // Validation for assignments
  async validatePositionAssignment(userId: string, positionId: string) {
    // Check max holders
    // Check unique constraints
    // Check hierarchy conflicts
    // Return validation result
  }
}
```

## 🎨 Frontend Architecture

### Component Structure

```
src/app/organization/
├── layout.tsx                 # Organization module layout
├── page.tsx                   # Dashboard/overview
├── schools/
│   ├── page.tsx              # Schools list
│   ├── [id]/
│   │   ├── page.tsx          # School detail
│   │   └── edit/page.tsx     # Edit school
│   └── new/page.tsx          # Create school
├── departments/
│   ├── page.tsx              # Departments list
│   └── [id]/...              # Department CRUD
├── positions/
│   ├── page.tsx              # Positions list
│   └── [id]/...              # Position CRUD
└── assignments/
    ├── page.tsx              # User assignments
    └── [id]/...              # Assignment management

src/components/organization/
├── OrgChart.tsx              # Interactive org chart
├── SchoolCard.tsx            # School display card
├── DepartmentTree.tsx        # Department hierarchy
├── PositionGrid.tsx          # Position grid view
├── UserPositionForm.tsx      # Assignment form
├── HierarchyVisualizer.tsx   # Visual hierarchy
└── OrgBreadcrumb.tsx         # Navigation breadcrumb
```

### Core Components Design

#### 1. Organization Chart Component
```tsx
// src/components/organization/OrgChart.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Users, Building2 } from 'lucide-react';

interface OrgNode {
  id: string;
  name: string;
  type: 'school' | 'department' | 'position';
  children?: OrgNode[];
  metadata?: {
    employeeCount?: number;
    headName?: string;
    isActive: boolean;
  };
}

export function OrgChart({ 
  rootId, 
  onNodeClick,
  interactive = true 
}: {
  rootId: string;
  onNodeClick?: (node: OrgNode) => void;
  interactive?: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [data, setData] = useState<OrgNode | null>(null);

  // Fetch organization tree
  useEffect(() => {
    fetchOrgTree(rootId).then(setData);
  }, [rootId]);

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpanded(newExpanded);
  };

  const renderNode = (node: OrgNode, level = 0) => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode === node.id;

    return (
      <div key={node.id} className="relative">
        {/* Connection lines */}
        {level > 0 && (
          <div className="absolute left-0 top-0 w-8 h-full border-l-2 border-gray-300" />
        )}
        
        <div className={`
          flex items-center gap-2 p-3 rounded-lg cursor-pointer
          transition-all duration-200 ml-${level * 8}
          ${isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-gray-50'}
        `}
          onClick={() => {
            setSelectedNode(node.id);
            onNodeClick?.(node);
          }}
        >
          {/* Expand/Collapse button */}
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
            </Button>
          )}

          {/* Node icon */}
          <div className="flex-shrink-0">
            {node.type === 'school' ? (
              <Building2 className="w-5 h-5 text-blue-600" />
            ) : node.type === 'department' ? (
              <Users className="w-5 h-5 text-green-600" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-purple-600" />
            )}
          </div>

          {/* Node content */}
          <div className="flex-1">
            <div className="font-medium">{node.name}</div>
            {node.metadata && (
              <div className="text-sm text-gray-500">
                {node.metadata.headName && `Head: ${node.metadata.headName}`}
                {node.metadata.employeeCount && ` • ${node.metadata.employeeCount} staff`}
              </div>
            )}
          </div>

          {/* Status badge */}
          {node.metadata && (
            <div className={`
              px-2 py-1 text-xs rounded-full
              ${node.metadata.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
            `}>
              {node.metadata.isActive ? 'Active' : 'Inactive'}
            </div>
          )}
        </div>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!data) return <div>Loading organization structure...</div>;

  return (
    <Card className="p-6">
      <div className="space-y-2">
        {renderNode(data)}
      </div>
    </Card>
  );
}
```

#### 2. Department Tree Component
```tsx
// src/components/organization/DepartmentTree.tsx
'use client';

import { useState } from 'react';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  Building, 
  Users, 
  Plus, 
  Edit, 
  Trash2 
} from 'lucide-react';

interface Department {
  id: string;
  code: string;
  name: string;
  schoolId?: string;
  parentId?: string;
  children?: Department[];
  positionCount: number;
  employeeCount: number;
  isActive: boolean;
}

export function DepartmentTree({
  departments,
  onEdit,
  onDelete,
  onAddChild,
  canEdit = false
}: {
  departments: Department[];
  onEdit?: (dept: Department) => void;
  onDelete?: (id: string) => void;
  onAddChild?: (parentId: string) => void;
  canEdit?: boolean;
}) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleOpen = (id: string) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenItems(newOpen);
  };

  const renderDepartment = (dept: Department, level = 0) => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isOpen = openItems.has(dept.id);

    return (
      <div key={dept.id} className="border-l-2 border-gray-200 ml-4">
        <Collapsible open={isOpen} onOpenChange={() => toggleOpen(dept.id)}>
          <div className="flex items-center justify-between py-2 px-4 hover:bg-gray-50 rounded">
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1">
                  <ChevronRight 
                    className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
                  />
                </Button>
              </CollapsibleTrigger>

              <Building className="h-4 w-4 text-gray-500" />
              
              <div>
                <div className="font-medium">
                  {dept.name}
                  <span className="text-sm text-gray-500 ml-2">({dept.code})</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {dept.employeeCount} staff
                  </span>
                  <span>{dept.positionCount} positions</span>
                </div>
              </div>

              <Badge variant={dept.isActive ? "default" : "secondary"}>
                {dept.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            {canEdit && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddChild?.(dept.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit?.(dept)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete?.(dept.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {hasChildren && (
            <CollapsibleContent>
              <div className="ml-4">
                {dept.children!.map(child => renderDepartment(child, level + 1))}
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {departments.map(dept => renderDepartment(dept))}
    </div>
  );
}
```

#### 3. Position Assignment Form
```tsx
// src/components/organization/UserPositionForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

const formSchema = z.object({
  userProfileId: z.string().min(1, 'User is required'),
  positionId: z.string().min(1, 'Position is required'),
  startDate: z.date(),
  endDate: z.date().optional(),
  isPlt: z.boolean().default(false),
  skNumber: z.string().optional(),
  notes: z.string().optional(),
});

export function UserPositionForm({
  users,
  positions,
  onSubmit,
  initialData,
}: {
  users: Array<{ id: string; name: string; nip: string }>;
  positions: Array<{ id: string; name: string; code: string; department?: string }>;
  onSubmit: (data: z.infer<typeof formSchema>) => Promise<void>;
  initialData?: Partial<z.infer<typeof formSchema>>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isPlt: false,
      startDate: new Date(),
      ...initialData,
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* User Selection */}
        <FormField
          control={form.control}
          name="userProfileId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} - {user.nip}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the employee to assign to this position
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Position Selection */}
        <FormField
          control={form.control}
          name="positionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a position" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name} ({position.code})
                      {position.department && ` - ${position.department}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the position to assign
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date (Optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP') : 'No end date'}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* PLT Toggle */}
        <FormField
          control={form.control}
          name="isPlt"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Acting Position (PLT)
                </FormLabel>
                <FormDescription>
                  Check if this is a temporary acting position
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* SK Number */}
        <FormField
          control={form.control}
          name="skNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SK Number (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Enter SK number" {...field} />
              </FormControl>
              <FormDescription>
                Decision letter number for this assignment
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Additional notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Assigning...' : 'Assign Position'}
        </Button>
      </form>
    </Form>
  );
}
```

## 🔄 State Management (Redux)

```typescript
// src/store/slices/organizationSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { organizationApi } from '@/services/api/organization';

interface OrganizationState {
  schools: School[];
  departments: Department[];
  positions: Position[];
  selectedSchool: string | null;
  orgTree: OrgNode | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrganizationState = {
  schools: [],
  departments: [],
  positions: [],
  selectedSchool: null,
  orgTree: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchSchools = createAsyncThunk(
  'organization/fetchSchools',
  async () => {
    const response = await organizationApi.getSchools();
    return response.data;
  }
);

export const fetchOrgTree = createAsyncThunk(
  'organization/fetchOrgTree',
  async (schoolId: string) => {
    const response = await organizationApi.getSchoolTree(schoolId);
    return response.data;
  }
);

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    setSelectedSchool: (state, action) => {
      state.selectedSchool = action.payload;
    },
    clearOrganization: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchools.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSchools.fulfilled, (state, action) => {
        state.schools = action.payload;
        state.loading = false;
      })
      .addCase(fetchSchools.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch schools';
        state.loading = false;
      })
      .addCase(fetchOrgTree.fulfilled, (state, action) => {
        state.orgTree = action.payload;
      });
  },
});

export const { setSelectedSchool, clearOrganization } = organizationSlice.actions;
export default organizationSlice.reducer;
```

## 📱 Main Organization Page

```tsx
// src/app/organization/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrgChart } from '@/components/organization/OrgChart';
import { DepartmentTree } from '@/components/organization/DepartmentTree';
import { PositionGrid } from '@/components/organization/PositionGrid';
import { Building2, Users, Briefcase, UserPlus } from 'lucide-react';
import { fetchSchools, fetchOrgTree } from '@/store/slices/organizationSlice';

export default function OrganizationPage() {
  const dispatch = useDispatch();
  const { schools, orgTree, selectedSchool, loading } = useSelector(
    (state: RootState) => state.organization
  );
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    dispatch(fetchSchools());
  }, [dispatch]);

  useEffect(() => {
    if (selectedSchool) {
      dispatch(fetchOrgTree(selectedSchool));
    }
  }, [selectedSchool, dispatch]);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Organization Management</h1>
        <p className="text-gray-600 mt-2">
          Manage schools, departments, positions, and employee assignments
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{schools.length}</div>
                <p className="text-xs text-muted-foreground">Active locations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Departments</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">47</div>
                <p className="text-xs text-muted-foreground">Across all schools</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Positions</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">156</div>
                <p className="text-xs text-muted-foreground">Defined roles</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assignments</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">342</div>
                <p className="text-xs text-muted-foreground">Active assignments</p>
              </CardContent>
            </Card>
          </div>

          {/* Organization Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Structure</CardTitle>
              <CardDescription>
                Interactive visualization of your organization hierarchy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedSchool && orgTree ? (
                <OrgChart 
                  rootId={selectedSchool} 
                  onNodeClick={(node) => console.log('Clicked:', node)}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select a school to view its organization structure
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schools">
          {/* Schools management content */}
        </TabsContent>

        <TabsContent value="departments">
          {/* Departments management content */}
        </TabsContent>

        <TabsContent value="positions">
          {/* Positions management content */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## 🚀 Implementation Roadmap

### Phase 1: Backend Setup (Week 1)
- [ ] Create NestJS modules for organization
- [ ] Implement services with Prisma
- [ ] Add validation and error handling
- [ ] Create API endpoints with Swagger documentation
- [ ] Add caching layer with Redis

### Phase 2: Frontend Foundation (Week 2)
- [ ] Setup organization module structure
- [ ] Create Redux slices and API services
- [ ] Build basic CRUD pages
- [ ] Implement form validations

### Phase 3: Advanced Features (Week 3)
- [ ] Interactive org chart visualization
- [ ] Drag-and-drop position assignments
- [ ] Bulk operations support
- [ ] Export/import functionality
- [ ] Audit logging

### Phase 4: Integration & Testing (Week 4)
- [ ] Integration with approval system
- [ ] Permission-based access control
- [ ] E2E testing
- [ ] Performance optimization
- [ ] Documentation

## 🔒 Security Considerations

1. **Role-Based Access Control (RBAC)**
   - View-only for regular users
   - Edit permissions for HR/Admin
   - Approval requirements for critical changes

2. **Data Validation**
   - Position uniqueness constraints
   - Hierarchy loop prevention
   - Date range validations

3. **Audit Trail**
   - Track all organizational changes
   - Store old/new values
   - Record who made changes

## 📊 Performance Optimizations

1. **Caching Strategy**
   - Redis cache for org tree
   - Session cache for user positions
   - Invalidation on updates

2. **Query Optimization**
   - Indexed lookups
   - Pagination for large datasets
   - Lazy loading for tree structures

3. **Frontend Optimization**
   - Virtual scrolling for large lists
   - Memoization for expensive computations
   - Progressive data loading