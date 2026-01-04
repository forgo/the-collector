import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Settings, Group, ImageItem, ViewMode, Tab, ThemeId } from '../types';
import { settingsStorage, groupsStorage, ungroupedStorage, loadAllData } from '../lib/storage';
import { DEFAULT_SETTINGS, GROUP_COLORS } from '../lib/constants';
import { applyTheme, applyUIScale, applyDensity } from '../lib/themes';

interface AppState {
  // Data
  settings: Settings;
  groups: Group[];
  ungrouped: ImageItem[];

  // UI state
  viewMode: ViewMode;
  activeTab: Tab;
  selectedUrls: Set<string>;

  // Loading
  isLoading: boolean;
}

// Drag state for internal reordering
interface DragState {
  isDragging: boolean;
  draggedUrl: string | null;
  draggedUrls: string[]; // For multi-selection drags
  sourceGroupId: string | null; // null = ungrouped
}

// Pending drop intent state - shown when user drops a multi-selected item
interface PendingDropIntent {
  draggedUrl: string;
  selectedUrls: string[];
  targetGroupId: string | null;
  insertAtIndex?: number;
}

interface AppContextValue extends AppState {
  // Settings actions
  updateSettings: (partial: Partial<Settings>) => Promise<void>;

  // Group actions
  createGroup: (name: string) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>;

  // Image actions
  addImage: (image: ImageItem, groupId?: string) => Promise<void>;
  addImages: (images: ImageItem[], groupId?: string) => Promise<void>;
  removeImage: (url: string, groupId?: string) => Promise<void>;
  moveImages: (
    urls: string[],
    targetGroupId: string | null,
    insertAtIndex?: number
  ) => Promise<void>;
  updateImageFilename: (
    url: string,
    customFilename: string,
    groupId?: string | null
  ) => Promise<void>;

  // Selection actions
  toggleSelection: (url: string) => void;
  selectAll: (groupId?: string) => void;
  selectAllImages: () => void;
  deselectAll: () => void;
  getSelectedCount: () => number;

  // UI actions
  setViewMode: (mode: ViewMode) => void;
  setActiveTab: (tab: Tab) => void;

  // Bulk actions
  clearAll: () => Promise<void>;
  clearUngrouped: () => Promise<void>;

  // Drag & drop
  dragState: DragState;
  startDrag: (url: string, sourceGroupId: string | null) => void;
  endDrag: () => void;
  reorderInGroup: (groupId: string | null, fromIndex: number, toIndex: number) => Promise<void>;

  // Drag intent modal
  pendingDropIntent: PendingDropIntent | null;
  requestDropIntent: (
    draggedUrl: string,
    selectedUrls: string[],
    targetGroupId: string | null,
    insertAtIndex?: number
  ) => void;
  confirmDropIntent: (moveAll: boolean) => Promise<void>;
  cancelDropIntent: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    settings: DEFAULT_SETTINGS,
    groups: [],
    ungrouped: [],
    viewMode: 'list',
    activeTab: 'collections',
    selectedUrls: new Set(),
    isLoading: true,
  });

  // Drag state for internal reordering
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedUrl: null,
    draggedUrls: [],
    sourceGroupId: null,
  });

  // Pending drop intent (for multi-selection moves)
  const [pendingDropIntent, setPendingDropIntent] = useState<PendingDropIntent | null>(null);

  // Load initial data
  useEffect(() => {
    loadAllData().then(({ settings, groups, ungrouped }) => {
      setState((prev) => ({
        ...prev,
        settings: settings ?? DEFAULT_SETTINGS,
        groups: groups ?? [],
        ungrouped: ungrouped ?? [],
        isLoading: false,
      }));
    });
  }, []);

  // Watch for storage changes (from other contexts like content script)
  // Using WXT's storage.watch() for consistent key handling
  useEffect(() => {
    console.log('[AppContext] Setting up storage watchers');

    const unwatchGroups = groupsStorage.watch((newGroups) => {
      console.log('[AppContext] Groups changed via watcher:', newGroups?.length ?? 0);
      setState((prev) => {
        console.log(
          '[AppContext] Updating groups state:',
          prev.groups.length,
          '->',
          newGroups?.length ?? 0
        );
        return { ...prev, groups: newGroups ?? [] };
      });
    });

    const unwatchUngrouped = ungroupedStorage.watch((newUngrouped) => {
      console.log('[AppContext] Ungrouped changed via watcher:', newUngrouped?.length ?? 0);
      setState((prev) => {
        console.log(
          '[AppContext] Updating ungrouped state:',
          prev.ungrouped.length,
          '->',
          newUngrouped?.length ?? 0
        );
        return { ...prev, ungrouped: newUngrouped ?? [] };
      });
    });

    const unwatchSettings = settingsStorage.watch((newSettings) => {
      console.log('[AppContext] Settings changed via watcher');
      setState((prev) => ({ ...prev, settings: newSettings ?? DEFAULT_SETTINGS }));
    });

    console.log('[AppContext] Storage watchers registered');

    return () => {
      console.log('[AppContext] Removing storage watchers');
      unwatchGroups();
      unwatchUngrouped();
      unwatchSettings();
    };
  }, []);

  // Apply theme, UI scale, and density whenever settings change
  useEffect(() => {
    if (state.isLoading) return;

    // Apply theme
    applyTheme(state.settings.theme as ThemeId, state.settings.customTheme ?? undefined);

    // Apply UI scale
    applyUIScale(state.settings.uiScale);

    // Apply density
    applyDensity(state.settings.density);
  }, [
    state.isLoading,
    state.settings.theme,
    state.settings.customTheme,
    state.settings.uiScale,
    state.settings.density,
  ]);

  // Settings actions
  const updateSettings = useCallback(
    async (partial: Partial<Settings>) => {
      const newSettings = { ...state.settings, ...partial };
      await settingsStorage.setValue(newSettings);
      setState((prev) => ({ ...prev, settings: newSettings }));
    },
    [state.settings]
  );

  // Group actions
  const createGroup = useCallback(async (name: string): Promise<Group> => {
    // Use a ref-like pattern to get current state for color selection
    let newGroup: Group | null = null;

    // Update state synchronously to avoid race conditions
    await new Promise<void>((resolve) => {
      setState((prev) => {
        const usedColors = new Set(prev.groups.map((g) => g.color));
        const availableColor = GROUP_COLORS.find((c) => !usedColors.has(c)) ?? GROUP_COLORS[0];

        newGroup = {
          id: crypto.randomUUID(),
          name,
          color: availableColor,
          images: [],
        };

        const newGroups = [...prev.groups, newGroup];
        // Save to storage async but don't block state update
        groupsStorage.setValue(newGroups);

        resolve();
        return { ...prev, groups: newGroups };
      });
    });

    return newGroup!;
  }, []);

  const deleteGroup = useCallback(
    async (id: string) => {
      const group = state.groups.find((g) => g.id === id);
      if (!group) return;

      // Move group's images to ungrouped
      const newUngrouped = [...state.ungrouped, ...group.images];
      const newGroups = state.groups.filter((g) => g.id !== id);

      await Promise.all([
        groupsStorage.setValue(newGroups),
        ungroupedStorage.setValue(newUngrouped),
      ]);

      setState((prev) => ({
        ...prev,
        groups: newGroups,
        ungrouped: newUngrouped,
      }));
    },
    [state.groups, state.ungrouped]
  );

  const updateGroup = useCallback(
    async (id: string, updates: Partial<Group>) => {
      const newGroups = state.groups.map((g) => (g.id === id ? { ...g, ...updates } : g));
      await groupsStorage.setValue(newGroups);
      setState((prev) => ({ ...prev, groups: newGroups }));
    },
    [state.groups]
  );

  // Image actions
  const addImage = useCallback(
    async (image: ImageItem, groupId?: string) => {
      // Check for duplicates
      const allUrls = new Set([
        ...state.ungrouped.map((i) => i.url),
        ...state.groups.flatMap((g) => g.images.map((i) => i.url)),
      ]);

      if (allUrls.has(image.url)) {
        return; // Image already exists
      }

      // Add timestamp for newly-added animation
      const imageWithTimestamp = { ...image, addedAt: Date.now() };

      if (groupId) {
        const newGroups = state.groups.map((g) =>
          g.id === groupId ? { ...g, images: [...g.images, imageWithTimestamp] } : g
        );
        await groupsStorage.setValue(newGroups);
        setState((prev) => ({ ...prev, groups: newGroups }));
      } else {
        const newUngrouped = [...state.ungrouped, imageWithTimestamp];
        await ungroupedStorage.setValue(newUngrouped);
        setState((prev) => ({ ...prev, ungrouped: newUngrouped }));
      }
    },
    [state.groups, state.ungrouped]
  );

  const addImages = useCallback(
    async (images: ImageItem[], groupId?: string) => {
      // Check for duplicates
      const allUrls = new Set([
        ...state.ungrouped.map((i) => i.url),
        ...state.groups.flatMap((g) => g.images.map((i) => i.url)),
      ]);

      // Filter out duplicates and add timestamps
      const now = Date.now();
      const newImages = images
        .filter((img) => !allUrls.has(img.url))
        .map((img) => ({ ...img, addedAt: now }));
      if (newImages.length === 0) return;

      if (groupId) {
        const newGroups = state.groups.map((g) =>
          g.id === groupId ? { ...g, images: [...g.images, ...newImages] } : g
        );
        await groupsStorage.setValue(newGroups);
        setState((prev) => ({ ...prev, groups: newGroups }));
      } else {
        const newUngrouped = [...state.ungrouped, ...newImages];
        await ungroupedStorage.setValue(newUngrouped);
        setState((prev) => ({ ...prev, ungrouped: newUngrouped }));
      }
    },
    [state.groups, state.ungrouped]
  );

  const removeImage = useCallback(
    async (url: string, groupId?: string) => {
      if (groupId) {
        const newGroups = state.groups.map((g) =>
          g.id === groupId ? { ...g, images: g.images.filter((img) => img.url !== url) } : g
        );
        await groupsStorage.setValue(newGroups);
        setState((prev) => ({
          ...prev,
          groups: newGroups,
          selectedUrls: new Set([...prev.selectedUrls].filter((u) => u !== url)),
        }));
      } else {
        const newUngrouped = state.ungrouped.filter((img) => img.url !== url);
        await ungroupedStorage.setValue(newUngrouped);
        setState((prev) => ({
          ...prev,
          ungrouped: newUngrouped,
          selectedUrls: new Set([...prev.selectedUrls].filter((u) => u !== url)),
        }));
      }
    },
    [state.groups, state.ungrouped]
  );

  const moveImages = useCallback(
    async (urls: string[], targetGroupId: string | null, insertAtIndex?: number) => {
      const urlSet = new Set(urls);

      // Use functional update to get current state and avoid race conditions
      setState((prev) => {
        // Collect images to move
        const imagesToMove: ImageItem[] = [];

        // Remove from ungrouped
        const newUngrouped = prev.ungrouped.filter((img) => {
          if (urlSet.has(img.url)) {
            imagesToMove.push(img);
            return false;
          }
          return true;
        });

        // Remove from groups
        const newGroups = prev.groups.map((g) => {
          const remaining = g.images.filter((img) => {
            if (urlSet.has(img.url)) {
              imagesToMove.push(img);
              return false;
            }
            return true;
          });
          return { ...g, images: remaining };
        });

        // Add to target at specified index or end
        let finalGroups: Group[];
        let finalUngrouped: ImageItem[];

        if (targetGroupId) {
          finalGroups = newGroups.map((g) => {
            if (g.id !== targetGroupId) return g;

            // Insert at specific index or append to end
            if (insertAtIndex !== undefined && insertAtIndex >= 0) {
              const newImages = [...g.images];
              newImages.splice(insertAtIndex, 0, ...imagesToMove);
              return { ...g, images: newImages };
            } else {
              return { ...g, images: [...g.images, ...imagesToMove] };
            }
          });
          finalUngrouped = newUngrouped;
        } else {
          finalGroups = newGroups;
          // Insert at specific index or append to end
          if (insertAtIndex !== undefined && insertAtIndex >= 0) {
            const newUngroupedWithInsert = [...newUngrouped];
            newUngroupedWithInsert.splice(insertAtIndex, 0, ...imagesToMove);
            finalUngrouped = newUngroupedWithInsert;
          } else {
            finalUngrouped = [...newUngrouped, ...imagesToMove];
          }
        }

        // Save to storage (async, non-blocking)
        Promise.all([
          groupsStorage.setValue(finalGroups),
          ungroupedStorage.setValue(finalUngrouped),
        ]);

        return { ...prev, groups: finalGroups, ungrouped: finalUngrouped };
      });
    },
    []
  );

  // Update custom filename for an image
  const updateImageFilename = useCallback(
    async (url: string, customFilename: string, groupId?: string | null) => {
      setState((prev) => {
        if (groupId) {
          // Update in a group
          const newGroups = prev.groups.map((g) => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              images: g.images.map((img) => (img.url === url ? { ...img, customFilename } : img)),
            };
          });
          // Save to storage (async, non-blocking)
          groupsStorage.setValue(newGroups);
          return { ...prev, groups: newGroups };
        } else {
          // Update in ungrouped
          const newUngrouped = prev.ungrouped.map((img) =>
            img.url === url ? { ...img, customFilename } : img
          );
          // Save to storage (async, non-blocking)
          ungroupedStorage.setValue(newUngrouped);
          return { ...prev, ungrouped: newUngrouped };
        }
      });
    },
    []
  );

  // Selection actions
  const toggleSelection = useCallback((url: string) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedUrls);
      if (newSelected.has(url)) {
        newSelected.delete(url);
      } else {
        newSelected.add(url);
      }
      return { ...prev, selectedUrls: newSelected };
    });
  }, []);

  const selectAll = useCallback(
    (groupId?: string) => {
      const urls = groupId
        ? (state.groups.find((g) => g.id === groupId)?.images.map((i) => i.url) ?? [])
        : state.ungrouped.map((i) => i.url);
      setState((prev) => ({
        ...prev,
        selectedUrls: new Set([...prev.selectedUrls, ...urls]),
      }));
    },
    [state.groups, state.ungrouped]
  );

  const selectAllImages = useCallback(() => {
    const allUrls = [
      ...state.ungrouped.map((i) => i.url),
      ...state.groups.flatMap((g) => g.images.map((i) => i.url)),
    ];
    setState((prev) => ({
      ...prev,
      selectedUrls: new Set(allUrls),
    }));
  }, [state.groups, state.ungrouped]);

  const deselectAll = useCallback(() => {
    setState((prev) => ({ ...prev, selectedUrls: new Set() }));
  }, []);

  const getSelectedCount = useCallback(() => {
    return state.selectedUrls.size;
  }, [state.selectedUrls]);

  // UI actions
  const setViewMode = useCallback((mode: ViewMode) => {
    setState((prev) => ({ ...prev, viewMode: mode }));
  }, []);

  const setActiveTab = useCallback((tab: Tab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  // Bulk actions
  const clearAll = useCallback(async () => {
    await Promise.all([groupsStorage.setValue([]), ungroupedStorage.setValue([])]);
    setState((prev) => ({
      ...prev,
      groups: [],
      ungrouped: [],
      selectedUrls: new Set(),
    }));
  }, []);

  const clearUngrouped = useCallback(async () => {
    await ungroupedStorage.setValue([]);
    setState((prev) => {
      const ungroupedUrls = new Set(prev.ungrouped.map((i) => i.url));
      return {
        ...prev,
        ungrouped: [],
        selectedUrls: new Set([...prev.selectedUrls].filter((u) => !ungroupedUrls.has(u))),
      };
    });
  }, []);

  // Drag & drop functions
  const startDrag = useCallback(
    (url: string, sourceGroupId: string | null) => {
      // If dragging a selected item, drag all selected items
      const urlsToMove = state.selectedUrls.has(url) ? [...state.selectedUrls] : [url];
      setDragState({
        isDragging: true,
        draggedUrl: url,
        draggedUrls: urlsToMove,
        sourceGroupId,
      });
    },
    [state.selectedUrls]
  );

  const endDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedUrl: null,
      draggedUrls: [],
      sourceGroupId: null,
    });
  }, []);

  const reorderInGroup = useCallback(
    async (groupId: string | null, fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;

      if (groupId === null) {
        // Reorder in ungrouped
        const newUngrouped = [...state.ungrouped];
        const [removed] = newUngrouped.splice(fromIndex, 1);
        newUngrouped.splice(toIndex, 0, removed);
        await ungroupedStorage.setValue(newUngrouped);
        setState((prev) => ({ ...prev, ungrouped: newUngrouped }));
      } else {
        // Reorder in group
        const newGroups = state.groups.map((g) => {
          if (g.id !== groupId) return g;
          const newImages = [...g.images];
          const [removed] = newImages.splice(fromIndex, 1);
          newImages.splice(toIndex, 0, removed);
          return { ...g, images: newImages };
        });
        await groupsStorage.setValue(newGroups);
        setState((prev) => ({ ...prev, groups: newGroups }));
      }
    },
    [state.ungrouped, state.groups]
  );

  // Drop intent modal functions
  const requestDropIntent = useCallback(
    (
      draggedUrl: string,
      selectedUrls: string[],
      targetGroupId: string | null,
      insertAtIndex?: number
    ) => {
      setPendingDropIntent({ draggedUrl, selectedUrls, targetGroupId, insertAtIndex });
    },
    []
  );

  const confirmDropIntent = useCallback(
    async (moveAll: boolean) => {
      if (!pendingDropIntent) return;

      const urlsToMove = moveAll ? pendingDropIntent.selectedUrls : [pendingDropIntent.draggedUrl];
      await moveImages(
        urlsToMove,
        pendingDropIntent.targetGroupId,
        pendingDropIntent.insertAtIndex
      );
      setPendingDropIntent(null);
    },
    [pendingDropIntent, moveImages]
  );

  const cancelDropIntent = useCallback(() => {
    setPendingDropIntent(null);
  }, []);

  const value: AppContextValue = {
    ...state,
    updateSettings,
    createGroup,
    deleteGroup,
    updateGroup,
    addImage,
    addImages,
    removeImage,
    moveImages,
    updateImageFilename,
    toggleSelection,
    selectAll,
    selectAllImages,
    deselectAll,
    getSelectedCount,
    setViewMode,
    setActiveTab,
    clearAll,
    clearUngrouped,
    dragState,
    startDrag,
    endDrag,
    reorderInGroup,
    pendingDropIntent,
    requestDropIntent,
    confirmDropIntent,
    cancelDropIntent,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
