/**
 * Download tree structure building and conflict detection
 */

export interface DownloadItem {
  directory: string;
  filename: string;
  url: string;
  group?: string;
  groupId?: string | null;
  hasConflict?: boolean;
  willRename?: boolean;
}

export interface TreeFile {
  filename: string;
  hasConflict: boolean;
  url: string;
  index: number;
  willRename: boolean;
  groupId?: string | null;
}

export interface TreeStructure {
  [directory: string]: TreeFile[];
}

export interface TreeStats {
  total: number;
  conflicts: number;
  willOverwrite: number;
}

/**
 * Detect filename conflicts in a list of downloads
 */
export function detectConflicts(
  downloads: DownloadItem[],
  autoRenameDefault = true
): DownloadItem[] {
  if (!downloads || downloads.length === 0) return [];

  // Count occurrences of each full path
  const pathCounts: Record<string, number> = {};
  downloads.forEach((d) => {
    const fullPath = d.directory ? `${d.directory}/${d.filename}` : d.filename;
    pathCounts[fullPath] = (pathCounts[fullPath] || 0) + 1;
  });

  // Mark conflicts
  return downloads.map((d) => {
    const fullPath = d.directory ? `${d.directory}/${d.filename}` : d.filename;
    const hasConflict = pathCounts[fullPath] > 1;

    return {
      directory: d.directory,
      filename: d.filename,
      url: d.url,
      group: d.group,
      groupId: d.groupId,
      hasConflict,
      willRename:
        d.willRename !== undefined ? d.willRename : hasConflict ? autoRenameDefault : true,
    };
  });
}

/**
 * Build a tree structure from downloads for display
 */
export function buildTreeStructure(downloads: DownloadItem[]): TreeStructure {
  if (!downloads) return {};

  const tree: TreeStructure = {};

  downloads.forEach((d, index) => {
    const dir = d.directory || '(root)';
    if (!tree[dir]) {
      tree[dir] = [];
    }
    tree[dir].push({
      filename: d.filename,
      hasConflict: d.hasConflict || false,
      url: d.url,
      index,
      willRename: d.willRename !== false,
      groupId: d.groupId,
    });
  });

  return tree;
}

/**
 * Get sorted directory names from a tree structure
 */
export function getSortedDirectories(tree: TreeStructure): string[] {
  return Object.keys(tree).sort();
}

/**
 * Count total files and conflicts in a tree
 */
export function getTreeStats(tree: TreeStructure): TreeStats {
  let total = 0;
  let conflicts = 0;
  let willOverwrite = 0;

  Object.keys(tree).forEach((dir) => {
    tree[dir].forEach((file) => {
      total++;
      if (file.hasConflict) {
        conflicts++;
        if (!file.willRename) {
          willOverwrite++;
        }
      }
    });
  });

  return { total, conflicts, willOverwrite };
}

/**
 * Check if any downloads have conflicts set to overwrite
 */
export function hasOverwriteConflicts(downloads: DownloadItem[]): boolean {
  if (!downloads) return false;
  return downloads.some((d) => d.hasConflict && d.willRename === false);
}

/**
 * Check if any downloads have conflicts at all
 */
export function hasAnyConflicts(downloads: DownloadItem[]): boolean {
  if (!downloads) return false;
  return downloads.some((d) => d.hasConflict);
}

/**
 * Get all unique directories from downloads
 */
export function getUniqueDirectories(downloads: DownloadItem[]): string[] {
  if (!downloads) return [];

  const dirs = new Set<string>();
  downloads.forEach((d) => {
    if (d.directory) {
      dirs.add(d.directory);
    }
  });

  return Array.from(dirs).sort();
}

/**
 * Group downloads by their directory
 */
export function groupByDirectory(downloads: DownloadItem[]): Record<string, DownloadItem[]> {
  if (!downloads) return {};

  const grouped: Record<string, DownloadItem[]> = {};
  downloads.forEach((d) => {
    const dir = d.directory || '';
    if (!grouped[dir]) {
      grouped[dir] = [];
    }
    grouped[dir].push(d);
  });

  return grouped;
}
