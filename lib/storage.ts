import { storage } from 'wxt/utils/storage';
import type { Settings, Group, ImageItem } from '../types';
import { DEFAULT_SETTINGS } from './constants';

// Use WXT storage with proper prefixed keys
// This ensures consistent key format across all contexts

export const settingsStorage = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});

export const groupsStorage = storage.defineItem<Group[]>('local:groups', {
  fallback: [],
});

export const ungroupedStorage = storage.defineItem<ImageItem[]>('local:ungrouped', {
  fallback: [],
});

export const navigationStackStorage = storage.defineItem<string[]>('local:navigationStack', {
  fallback: [],
});

// Helper functions
export async function loadAllData() {
  const [settings, groups, ungrouped] = await Promise.all([
    settingsStorage.getValue(),
    groupsStorage.getValue(),
    ungroupedStorage.getValue(),
  ]);
  return { settings, groups, ungrouped };
}

export async function clearAllData() {
  await Promise.all([groupsStorage.setValue([]), ungroupedStorage.setValue([])]);
}

export async function clearGroups() {
  await groupsStorage.setValue([]);
}

export async function clearUngrouped() {
  await ungroupedStorage.setValue([]);
}
