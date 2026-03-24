import { create } from 'zustand';

export const useAppStore = create((set) => ({
  // Navigation
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  // Role
  role: 'admin', // 'admin' | 'viewer'
  setRole: (role) => set({ role }),

  // Shipments filter
  statusFilter: 'all',
  zoneFilter: 'all',
  searchQuery: '',
  setStatusFilter: (f) => set({ statusFilter: f }),
  setZoneFilter: (f) => set({ zoneFilter: f }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  // Prediction state
  predictionResult: null,
  predictionLoading: false,
  setPredictionResult: (r) => set({ predictionResult: r }),
  setPredictionLoading: (l) => set({ predictionLoading: l }),

  // Admin
  retraining: false,
  setRetraining: (r) => set({ retraining: r }),
  uploadProgress: 0,
  setUploadProgress: (p) => set({ uploadProgress: p }),
}));
