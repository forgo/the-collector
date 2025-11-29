/**
 * Tests for tree-builder.js
 * Covers download tree structure building and conflict detection
 */

import { describe, it, expect } from 'vitest';

// Load the module
await import('../../src/downloads/tree-builder.js');

const {
  detectConflicts,
  buildTreeStructure,
  getSortedDirectories,
  getTreeStats,
  hasOverwriteConflicts,
  hasAnyConflicts,
  getUniqueDirectories,
  groupByDirectory,
  splitFilename
} = window.TreeBuilder;

describe('detectConflicts', () => {
  it('returns empty array for null input', () => {
    expect(detectConflicts(null)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(detectConflicts([])).toEqual([]);
  });

  it('marks no conflicts when all filenames unique', () => {
    const downloads = [
      { directory: 'photos', filename: 'a.jpg', url: 'url1' },
      { directory: 'photos', filename: 'b.jpg', url: 'url2' },
      { directory: 'photos', filename: 'c.jpg', url: 'url3' }
    ];
    const result = detectConflicts(downloads);
    expect(result.every(d => d.hasConflict === false)).toBe(true);
  });

  it('marks conflicts for duplicate filenames in same directory', () => {
    const downloads = [
      { directory: 'photos', filename: 'image.jpg', url: 'url1' },
      { directory: 'photos', filename: 'image.jpg', url: 'url2' }
    ];
    const result = detectConflicts(downloads);
    expect(result[0].hasConflict).toBe(true);
    expect(result[1].hasConflict).toBe(true);
  });

  it('does not mark conflicts for same filename in different directories', () => {
    const downloads = [
      { directory: 'photos', filename: 'image.jpg', url: 'url1' },
      { directory: 'vacation', filename: 'image.jpg', url: 'url2' }
    ];
    const result = detectConflicts(downloads);
    expect(result[0].hasConflict).toBe(false);
    expect(result[1].hasConflict).toBe(false);
  });

  it('sets willRename to true by default for conflicts', () => {
    const downloads = [
      { directory: 'photos', filename: 'image.jpg', url: 'url1' },
      { directory: 'photos', filename: 'image.jpg', url: 'url2' }
    ];
    const result = detectConflicts(downloads, true);
    expect(result[0].willRename).toBe(true);
    expect(result[1].willRename).toBe(true);
  });

  it('respects autoRenameDefault=false', () => {
    const downloads = [
      { directory: 'photos', filename: 'image.jpg', url: 'url1' },
      { directory: 'photos', filename: 'image.jpg', url: 'url2' }
    ];
    const result = detectConflicts(downloads, false);
    expect(result[0].willRename).toBe(false);
    expect(result[1].willRename).toBe(false);
  });

  it('preserves existing willRename setting', () => {
    const downloads = [
      { directory: 'photos', filename: 'image.jpg', url: 'url1', willRename: false },
      { directory: 'photos', filename: 'image.jpg', url: 'url2', willRename: true }
    ];
    const result = detectConflicts(downloads, true);
    expect(result[0].willRename).toBe(false);
    expect(result[1].willRename).toBe(true);
  });

  it('copies group property', () => {
    const downloads = [
      { directory: 'photos', filename: 'a.jpg', url: 'url1', group: 'Vacation' }
    ];
    const result = detectConflicts(downloads);
    expect(result[0].group).toBe('Vacation');
  });
});

describe('buildTreeStructure', () => {
  it('returns empty object for null input', () => {
    expect(buildTreeStructure(null)).toEqual({});
  });

  it('returns empty object for undefined input', () => {
    expect(buildTreeStructure(undefined)).toEqual({});
  });

  it('groups files by directory', () => {
    const downloads = [
      { directory: 'photos', filename: 'a.jpg', url: 'url1' },
      { directory: 'photos', filename: 'b.jpg', url: 'url2' },
      { directory: 'vacation', filename: 'c.jpg', url: 'url3' }
    ];
    const tree = buildTreeStructure(downloads);

    expect(Object.keys(tree)).toContain('photos');
    expect(Object.keys(tree)).toContain('vacation');
    expect(tree['photos'].length).toBe(2);
    expect(tree['vacation'].length).toBe(1);
  });

  it('uses (root) for empty directory', () => {
    const downloads = [
      { directory: '', filename: 'a.jpg', url: 'url1' }
    ];
    const tree = buildTreeStructure(downloads);
    expect(Object.keys(tree)).toContain('(root)');
  });

  it('uses (root) for undefined directory', () => {
    const downloads = [
      { filename: 'a.jpg', url: 'url1' }
    ];
    const tree = buildTreeStructure(downloads);
    expect(Object.keys(tree)).toContain('(root)');
  });

  it('includes index in tree entries', () => {
    const downloads = [
      { directory: 'photos', filename: 'a.jpg', url: 'url1' },
      { directory: 'photos', filename: 'b.jpg', url: 'url2' }
    ];
    const tree = buildTreeStructure(downloads);
    expect(tree['photos'][0].index).toBe(0);
    expect(tree['photos'][1].index).toBe(1);
  });

  it('includes conflict info in tree entries', () => {
    const downloads = [
      { directory: 'photos', filename: 'a.jpg', url: 'url1', hasConflict: true, willRename: false }
    ];
    const tree = buildTreeStructure(downloads);
    expect(tree['photos'][0].hasConflict).toBe(true);
    expect(tree['photos'][0].willRename).toBe(false);
  });

  it('defaults willRename to true', () => {
    const downloads = [
      { directory: 'photos', filename: 'a.jpg', url: 'url1' }
    ];
    const tree = buildTreeStructure(downloads);
    expect(tree['photos'][0].willRename).toBe(true);
  });
});

describe('getSortedDirectories', () => {
  it('returns empty array for empty tree', () => {
    expect(getSortedDirectories({})).toEqual([]);
  });

  it('returns sorted directory names', () => {
    const tree = {
      'zebra': [],
      'alpha': [],
      'beta': []
    };
    expect(getSortedDirectories(tree)).toEqual(['alpha', 'beta', 'zebra']);
  });

  it('handles single directory', () => {
    const tree = { 'photos': [] };
    expect(getSortedDirectories(tree)).toEqual(['photos']);
  });
});

describe('getTreeStats', () => {
  it('returns zeros for empty tree', () => {
    const stats = getTreeStats({});
    expect(stats).toEqual({ total: 0, conflicts: 0, willOverwrite: 0 });
  });

  it('counts total files', () => {
    const tree = {
      'photos': [{ filename: 'a.jpg' }, { filename: 'b.jpg' }],
      'docs': [{ filename: 'c.pdf' }]
    };
    const stats = getTreeStats(tree);
    expect(stats.total).toBe(3);
  });

  it('counts conflicts', () => {
    const tree = {
      'photos': [
        { filename: 'a.jpg', hasConflict: true, willRename: true },
        { filename: 'a.jpg', hasConflict: true, willRename: true },
        { filename: 'b.jpg', hasConflict: false }
      ]
    };
    const stats = getTreeStats(tree);
    expect(stats.conflicts).toBe(2);
  });

  it('counts files that will overwrite', () => {
    const tree = {
      'photos': [
        { filename: 'a.jpg', hasConflict: true, willRename: false },
        { filename: 'a.jpg', hasConflict: true, willRename: true },
        { filename: 'b.jpg', hasConflict: false }
      ]
    };
    const stats = getTreeStats(tree);
    expect(stats.willOverwrite).toBe(1);
  });
});

describe('hasOverwriteConflicts', () => {
  it('returns false for null input', () => {
    expect(hasOverwriteConflicts(null)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasOverwriteConflicts([])).toBe(false);
  });

  it('returns false when no conflicts', () => {
    const downloads = [
      { hasConflict: false, willRename: true },
      { hasConflict: false, willRename: true }
    ];
    expect(hasOverwriteConflicts(downloads)).toBe(false);
  });

  it('returns false when conflicts will be renamed', () => {
    const downloads = [
      { hasConflict: true, willRename: true },
      { hasConflict: true, willRename: true }
    ];
    expect(hasOverwriteConflicts(downloads)).toBe(false);
  });

  it('returns true when conflict will overwrite', () => {
    const downloads = [
      { hasConflict: true, willRename: false },
      { hasConflict: true, willRename: true }
    ];
    expect(hasOverwriteConflicts(downloads)).toBe(true);
  });
});

describe('hasAnyConflicts', () => {
  it('returns false for null input', () => {
    expect(hasAnyConflicts(null)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasAnyConflicts([])).toBe(false);
  });

  it('returns false when no conflicts', () => {
    const downloads = [
      { hasConflict: false },
      { hasConflict: false }
    ];
    expect(hasAnyConflicts(downloads)).toBe(false);
  });

  it('returns true when any conflict exists', () => {
    const downloads = [
      { hasConflict: false },
      { hasConflict: true }
    ];
    expect(hasAnyConflicts(downloads)).toBe(true);
  });
});

describe('getUniqueDirectories', () => {
  it('returns empty array for null input', () => {
    expect(getUniqueDirectories(null)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(getUniqueDirectories([])).toEqual([]);
  });

  it('returns unique directories sorted', () => {
    const downloads = [
      { directory: 'photos' },
      { directory: 'vacation' },
      { directory: 'photos' },
      { directory: 'alpha' }
    ];
    expect(getUniqueDirectories(downloads)).toEqual(['alpha', 'photos', 'vacation']);
  });

  it('excludes empty directories', () => {
    const downloads = [
      { directory: 'photos' },
      { directory: '' },
      { directory: undefined }
    ];
    expect(getUniqueDirectories(downloads)).toEqual(['photos']);
  });
});

describe('groupByDirectory', () => {
  it('returns empty object for null input', () => {
    expect(groupByDirectory(null)).toEqual({});
  });

  it('returns empty object for empty array', () => {
    expect(groupByDirectory([])).toEqual({});
  });

  it('groups downloads by directory', () => {
    const downloads = [
      { directory: 'photos', filename: 'a.jpg' },
      { directory: 'photos', filename: 'b.jpg' },
      { directory: 'vacation', filename: 'c.jpg' }
    ];
    const grouped = groupByDirectory(downloads);

    expect(grouped['photos'].length).toBe(2);
    expect(grouped['vacation'].length).toBe(1);
  });

  it('uses empty string for undefined directory', () => {
    const downloads = [
      { filename: 'a.jpg' }
    ];
    const grouped = groupByDirectory(downloads);
    expect(grouped['']).toBeDefined();
    expect(grouped[''].length).toBe(1);
  });
});

describe('splitFilename', () => {
  it('splits filename with extension', () => {
    expect(splitFilename('photo.jpg')).toEqual({ name: 'photo', extension: '.jpg' });
  });

  it('handles multiple dots', () => {
    expect(splitFilename('my.photo.backup.png')).toEqual({
      name: 'my.photo.backup',
      extension: '.png'
    });
  });

  it('handles no extension', () => {
    expect(splitFilename('noextension')).toEqual({ name: 'noextension', extension: '' });
  });

  it('handles empty string', () => {
    expect(splitFilename('')).toEqual({ name: '', extension: '' });
  });

  it('handles null', () => {
    expect(splitFilename(null)).toEqual({ name: '', extension: '' });
  });

  it('handles undefined', () => {
    expect(splitFilename(undefined)).toEqual({ name: '', extension: '' });
  });
});
