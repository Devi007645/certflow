import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDBStorage } from '../lib/storage';

interface DashboardState {
  // Tab & Navigation
  activeTab: string;
  sidebarOpen: boolean;
  
  // Filters & Search
  searchQuery: string;
  filters: {
    status: string;
    organization: string;
    dateRange: { start: string; end: string } | null;
  };
  
  // Table State
  sorting: { field: string; direction: 'asc' | 'desc' };
  pagination: { page: number; pageSize: number };
  
  // UI State
  modalState: Record<string, boolean>;
  scrollPositions: Record<string, number>;
  
  // Actions
  setActiveTab: (tab: string) => void;
  toggleSidebar: (open?: boolean) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<DashboardState['filters']>) => void;
  setSorting: (field: string, direction: 'asc' | 'desc') => void;
  setPagination: (pagination: Partial<DashboardState['pagination']>) => void;
  setModalOpen: (modalId: string, isOpen: boolean) => void;
  setScrollPosition: (path: string, position: number) => void;
  resetFilters: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      activeTab: 'all',
      sidebarOpen: true,
      searchQuery: '',
      filters: {
        status: 'all',
        organization: 'all',
        dateRange: null,
      },
      sorting: { field: 'created_at', direction: 'desc' },
      pagination: { page: 1, pageSize: 10 },
      modalState: {},
      scrollPositions: {},

      setActiveTab: (tab) => set({ activeTab: tab }),
      toggleSidebar: (open) => set((state) => ({ sidebarOpen: open ?? !state.sidebarOpen })),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilters: (newFilters) => set((state) => ({ 
        filters: { ...state.filters, ...newFilters },
        pagination: { ...state.pagination, page: 1 } // Reset page on filter change
      })),
      setSorting: (field, direction) => set({ sorting: { field, direction } }),
      setPagination: (newPagination) => set((state) => ({ pagination: { ...state.pagination, ...newPagination } })),
      setModalOpen: (modalId, isOpen) => set((state) => ({
        modalState: { ...state.modalState, [modalId]: isOpen }
      })),
      setScrollPosition: (path, position) => set((state) => ({
        scrollPositions: { ...state.scrollPositions, [path]: position }
      })),
      resetFilters: () => set({
        searchQuery: '',
        filters: { status: 'all', organization: 'all', dateRange: null },
        pagination: { page: 1, pageSize: 10 }
      }),
    }),
    {
      name: 'dashboard-ui-state',
      storage: createJSONStorage(() => localStorage), // UI state is lightweight, localStorage is fine
    }
  )
);
