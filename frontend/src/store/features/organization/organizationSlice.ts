import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { School, Department, Position, UserPosition } from '@/types/organization';

interface OrganizationState {
  selectedSchool: School | null;
  selectedDepartment: Department | null;
  selectedPosition: Position | null;
  filters: {
    schools: {
      search?: string;
      isActive?: boolean;
      lokasi?: string;
    };
    departments: {
      schoolId?: string;
      parentId?: string;
      search?: string;
      isActive?: boolean;
    };
    positions: {
      schoolId?: string;
      departmentId?: string;
      hierarchyLevel?: number;
      search?: string;
      isActive?: boolean;
    };
  };
  view: {
    activeTab: 'schools' | 'departments' | 'positions' | 'hierarchy';
    expandedNodes: string[];
  };
}

const initialState: OrganizationState = {
  selectedSchool: null,
  selectedDepartment: null,
  selectedPosition: null,
  filters: {
    schools: {},
    departments: {},
    positions: {},
  },
  view: {
    activeTab: 'schools',
    expandedNodes: [],
  },
};

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    setSelectedSchool: (state, action: PayloadAction<School | null>) => {
      state.selectedSchool = action.payload;
      // Reset department and position when school changes
      if (action.payload?.id !== state.selectedSchool?.id) {
        state.selectedDepartment = null;
        state.selectedPosition = null;
        // Update filters
        if (action.payload) {
          state.filters.departments.schoolId = action.payload.id;
          state.filters.positions.schoolId = action.payload.id;
        }
      }
    },
    setSelectedDepartment: (state, action: PayloadAction<Department | null>) => {
      state.selectedDepartment = action.payload;
      // Update position filter
      if (action.payload) {
        state.filters.positions.departmentId = action.payload.id;
      }
    },
    setSelectedPosition: (state, action: PayloadAction<Position | null>) => {
      state.selectedPosition = action.payload;
    },
    setSchoolFilters: (state, action: PayloadAction<Partial<OrganizationState['filters']['schools']>>) => {
      state.filters.schools = { ...state.filters.schools, ...action.payload };
    },
    setDepartmentFilters: (state, action: PayloadAction<Partial<OrganizationState['filters']['departments']>>) => {
      state.filters.departments = { ...state.filters.departments, ...action.payload };
    },
    setPositionFilters: (state, action: PayloadAction<Partial<OrganizationState['filters']['positions']>>) => {
      state.filters.positions = { ...state.filters.positions, ...action.payload };
    },
    clearSchoolFilters: (state) => {
      state.filters.schools = {};
    },
    clearDepartmentFilters: (state) => {
      state.filters.departments = {};
    },
    clearPositionFilters: (state) => {
      state.filters.positions = {};
    },
    setActiveTab: (state, action: PayloadAction<OrganizationState['view']['activeTab']>) => {
      state.view.activeTab = action.payload;
    },
    toggleNodeExpansion: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      const index = state.view.expandedNodes.indexOf(nodeId);
      if (index === -1) {
        state.view.expandedNodes.push(nodeId);
      } else {
        state.view.expandedNodes.splice(index, 1);
      }
    },
    setExpandedNodes: (state, action: PayloadAction<string[]>) => {
      state.view.expandedNodes = action.payload;
    },
    resetOrganizationState: () => initialState,
  },
});

export const {
  setSelectedSchool,
  setSelectedDepartment,
  setSelectedPosition,
  setSchoolFilters,
  setDepartmentFilters,
  setPositionFilters,
  clearSchoolFilters,
  clearDepartmentFilters,
  clearPositionFilters,
  setActiveTab,
  toggleNodeExpansion,
  setExpandedNodes,
  resetOrganizationState,
} = organizationSlice.actions;

export default organizationSlice.reducer;