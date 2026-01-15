import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ArchivedMessage, PruneConfig, PruneSuggestion } from '@/lib/types';

// Custom storage adapter for IndexedDB
const indexedDBStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    
    try {
      const { openDB } = await import('idb');
      const db = await openDB('prune-store', 1, {
        upgrade(db) {
          db.createObjectStore('state');
        },
      });
      return await db.get('state', name);
    } catch {
      return localStorage.getItem(name);
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    
    try {
      const { openDB } = await import('idb');
      const db = await openDB('prune-store', 1, {
        upgrade(db) {
          db.createObjectStore('state');
        },
      });
      await db.put('state', value, name);
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    
    try {
      const { openDB } = await import('idb');
      const db = await openDB('prune-store', 1);
      await db.delete('state', name);
    } catch {
      localStorage.removeItem(name);
    }
  },
};

interface PruneState {
  // Archive of pruned messages
  archive: ArchivedMessage[];
  
  // Pending suggestions from model
  pendingSuggestions: PruneSuggestion[];
  
  // Configuration
  config: PruneConfig;
  
  // Stats
  totalTokensReclaimed: number;
  
  // Actions
  addToArchive: (messages: ArchivedMessage[]) => void;
  removeFromArchive: (id: string) => ArchivedMessage | undefined;
  clearArchive: () => void;
  
  addPendingSuggestions: (suggestions: PruneSuggestion[]) => void;
  clearPendingSuggestions: () => void;
  
  updateConfig: (config: Partial<PruneConfig>) => void;
}

export const usePruneStore = create<PruneState>()(
  persist(
    (set, get) => ({
      archive: [],
      pendingSuggestions: [],
      config: {
        confidenceThreshold: 0.8,
        maxContextTokens: 128000,
        enablePruning: true,
      },
      totalTokensReclaimed: 0,
      
      addToArchive: (messages) => {
        const tokensReclaimed = messages.reduce((sum, m) => sum + m.tokenCount, 0);
        set((state) => ({
          archive: [...state.archive, ...messages],
          totalTokensReclaimed: state.totalTokensReclaimed + tokensReclaimed,
        }));
      },
      
      removeFromArchive: (id) => {
        const state = get();
        const message = state.archive.find((m) => m.id === id);
        if (message) {
          set((state) => ({
            archive: state.archive.filter((m) => m.id !== id),
            totalTokensReclaimed: state.totalTokensReclaimed - message.tokenCount,
          }));
        }
        return message;
      },
      
      clearArchive: () => {
        set({ archive: [], totalTokensReclaimed: 0 });
      },
      
      addPendingSuggestions: (suggestions) => {
        set((state) => ({
          pendingSuggestions: [...state.pendingSuggestions, ...suggestions],
        }));
      },
      
      clearPendingSuggestions: () => {
        set({ pendingSuggestions: [] });
      },
      
      updateConfig: (newConfig) => {
        set((state) => ({
          config: { ...state.config, ...newConfig },
        }));
      },
    }),
    {
      name: 'prune-store',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({
        archive: state.archive,
        config: state.config,
        totalTokensReclaimed: state.totalTokensReclaimed,
      }),
    }
  )
);
