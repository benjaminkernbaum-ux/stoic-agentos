import { create } from 'zustand';

export const useUIStore = create((set) => ({
  activeTab: 'traces',
  sidebarOpen: true,
  mobileSidebarOpen: false,
  cmdOpen: false,
  cmdQuery: '',
  showWelcome: localStorage.getItem('stoic_welcome_done') === 'true',
  
  // Modals
  showAgentModal: false,
  showWsModal: false,
  showKiModal: false,
  selectedAgent: null,
  
  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setCmdOpen: (open) => set({ cmdOpen: open }),
  setCmdQuery: (query) => set({ cmdQuery: query }),
  setShowWelcome: (show) => {
    localStorage.setItem('stoic_welcome_done', show ? 'false' : 'true');
    set({ showWelcome: show });
  },
  
  setShowAgentModal: (show) => set({ showAgentModal: show }),
  setShowWsModal: (show) => set({ showWsModal: show }),
  setShowKiModal: (show) => set({ showKiModal: show }),
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
}));
