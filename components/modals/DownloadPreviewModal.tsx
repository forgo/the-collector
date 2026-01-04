import { useState, useMemo, useCallback, useRef } from 'react';
import clsx from 'clsx';
import { Modal } from './Modal';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import {
  detectConflicts,
  buildTreeStructure,
  getSortedDirectories,
  getTreeStats,
} from '@/lib/tree-builder';
import { getFilenameFromUrl } from '@/lib/filename';
import { downloadParallel } from '@/lib/download-manager';
import type { ImageItem } from '@/types';
import styles from './DownloadPreviewModal.module.css';

interface DownloadPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to get effective filename (customFilename or generated from URL)
function getEffectiveFilename(image: ImageItem, usedFilenames: Set<string>): string {
  if (image.customFilename) {
    // Use custom filename, but still need to handle conflicts
    let filename = image.customFilename;
    const lowerFilename = filename.toLowerCase();

    // If this exact filename is already used, append a number
    if (usedFilenames.has(lowerFilename)) {
      const extMatch = filename.match(/(\.[^.]+)$/);
      const ext = extMatch ? extMatch[1] : '';
      const nameWithoutExt = ext ? filename.slice(0, -ext.length) : filename;
      let counter = 1;
      let newFilename = `${nameWithoutExt}_${counter}${ext}`;
      while (usedFilenames.has(newFilename.toLowerCase())) {
        counter++;
        newFilename = `${nameWithoutExt}_${counter}${ext}`;
      }
      filename = newFilename;
    }
    return filename;
  }
  // Fall back to generating from URL
  return getFilenameFromUrl(image.url, usedFilenames);
}

export function DownloadPreviewModal({ isOpen, onClose }: DownloadPreviewModalProps) {
  const { groups, ungrouped, selectedUrls, settings, clearAll, updateImageFilename } = useApp();
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [includeUngrouped, setIncludeUngrouped] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, failed: 0, total: 0 });

  const downloads = useMemo(() => {
    const items: Array<{
      directory: string;
      filename: string;
      url: string;
      group?: string;
      groupId?: string | null;
    }> = [];

    const selectedSet = scope === 'selected' ? selectedUrls : null;
    const usedFilenames = new Set<string>();

    // Process groups
    groups.forEach((group) => {
      const dir = group.directory || group.name;
      group.images.forEach((image) => {
        if (selectedSet && !selectedSet.has(image.url)) return;
        const filename = getEffectiveFilename(image, usedFilenames);
        usedFilenames.add(filename.toLowerCase());
        items.push({
          directory: settings.downloadDirectory ? `${settings.downloadDirectory}/${dir}` : dir,
          filename,
          url: image.url,
          group: group.name,
          groupId: group.id,
        });
      });
    });

    // Process ungrouped
    if (includeUngrouped) {
      const ungroupedDir = settings.ungroupedDirectory || 'Ungrouped';
      ungrouped.forEach((image) => {
        if (selectedSet && !selectedSet.has(image.url)) return;
        const filename = getEffectiveFilename(image, usedFilenames);
        usedFilenames.add(filename.toLowerCase());
        items.push({
          directory: settings.downloadDirectory
            ? `${settings.downloadDirectory}/${ungroupedDir}`
            : ungroupedDir,
          filename,
          url: image.url,
          groupId: null,
        });
      });
    }

    return detectConflicts(items, settings.autoRename);
  }, [groups, ungrouped, selectedUrls, scope, includeUngrouped, settings]);

  const tree = useMemo(() => buildTreeStructure(downloads), [downloads]);
  const directories = useMemo(() => getSortedDirectories(tree), [tree]);
  const stats = useMemo(() => getTreeStats(tree), [tree]);

  // Handle filename changes from the tree - updates context and will trigger re-render
  const handleFilenameChange = useCallback(
    (url: string, newFilename: string, groupId: string | null) => {
      updateImageFilename(url, newFilename, groupId);
    },
    [updateImageFilename]
  );

  const handleDownload = useCallback(async () => {
    if (downloads.length === 0) return;

    setIsDownloading(true);
    setProgress({ completed: 0, failed: 0, total: downloads.length });

    console.log('Downloading:', downloads);

    try {
      const result = await downloadParallel(
        downloads.map((d) => ({
          url: d.url,
          filename: d.filename,
          directory: d.directory,
          willRename: d.hasConflict, // Auto-rename conflicts
        })),
        (completed, failed, total) => {
          setProgress({ completed, failed, total });
        },
        5 // Concurrency limit
      );

      console.log('Download complete:', result);

      // If clearOnDownload is enabled, clear the collection
      if (settings.clearOnDownload && result.completed > 0) {
        await clearAll();
      }

      // Show completion message
      if (result.failed > 0) {
        console.warn(`Download completed with ${result.failed} failures:`, result.errors);
      }
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
      onClose();
    }
  }, [downloads, settings.clearOnDownload, clearAll, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Download Preview" className={styles.modal}>
      <div className={styles.dialog}>
        <div className={styles.scopeToggle}>
          <button
            className={clsx(styles.scopeBtn, scope === 'all' && styles.active)}
            onClick={() => setScope('all')}
          >
            All
          </button>
          <button
            className={clsx(styles.scopeBtn, scope === 'selected' && styles.active)}
            onClick={() => setScope('selected')}
          >
            Selected
          </button>
        </div>

        <div className={styles.options}>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={includeUngrouped}
              onChange={(e) => setIncludeUngrouped(e.target.checked)}
            />
            <span>Include Ungrouped ({ungrouped.length})</span>
          </label>
        </div>

        <p className={styles.summary}>
          {stats.total} image{stats.total !== 1 ? 's' : ''} to download
          {stats.conflicts > 0 && (
            <span className={styles.conflictWarning}>
              {' '}
              ({stats.conflicts} conflict{stats.conflicts !== 1 ? 's' : ''})
            </span>
          )}
        </p>

        <div className={styles.treeContainer}>
          {directories.map((dir) => (
            <TreeFolder
              key={dir}
              name={dir}
              files={tree[dir]}
              onFilenameChange={handleFilenameChange}
            />
          ))}
        </div>

        {stats.conflicts > 0 && (
          <div className={styles.conflictLegend}>
            <span className={styles.legendItemConflict}>
              Duplicate filename - will be auto-renamed
            </span>
          </div>
        )}

        {isDownloading && (
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${((progress.completed + progress.failed) / progress.total) * 100}%`,
              }}
            />
            <span className={styles.progressText}>
              {progress.completed + progress.failed} / {progress.total}
              {progress.failed > 0 && ` (${progress.failed} failed)`}
            </span>
          </div>
        )}

        <div className={styles.buttons}>
          <Button variant="default" onClick={onClose} disabled={isDownloading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDownload}
            disabled={stats.total === 0 || isDownloading}
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface TreeFolderProps {
  name: string;
  files: Array<{
    filename: string;
    hasConflict: boolean;
    url: string;
    groupId?: string | null;
  }>;
  onFilenameChange: (url: string, newFilename: string, groupId: string | null) => void;
}

function TreeFolder({ name, files, onFilenameChange }: TreeFolderProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={styles.treeFolder}>
      <div className={styles.folderHeader} onClick={() => setIsExpanded(!isExpanded)}>
        <Icon name={isExpanded ? 'folder' : 'folder'} size={16} />
        <span className={styles.folderName}>{name}</span>
        <span className={styles.folderCount}>({files.length})</span>
      </div>
      {isExpanded && (
        <ul className={styles.folderFiles}>
          {files.map((file, index) => (
            <TreeFile
              key={`${file.url}-${index}`}
              file={file}
              onFilenameChange={onFilenameChange}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface TreeFileProps {
  file: {
    filename: string;
    hasConflict: boolean;
    url: string;
    groupId?: string | null;
  };
  onFilenameChange: (url: string, newFilename: string, groupId: string | null) => void;
}

function TreeFile({ file, onFilenameChange }: TreeFileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse filename into name and extension
  const extMatch = file.filename.match(/(\.[^.]+)$/);
  const extension = extMatch ? extMatch[1] : '';
  const nameWithoutExt = extension ? file.filename.slice(0, -extension.length) : file.filename;

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(nameWithoutExt);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== nameWithoutExt) {
      onFilenameChange(file.url, trimmed + extension, file.groupId ?? null);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <li className={clsx(styles.treeFile, file.hasConflict && styles.conflict)}>
      {file.hasConflict && <span className={styles.conflictIcon}>⚠</span>}
      {isEditing ? (
        <div className={styles.fileEdit}>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={styles.fileInput}
          />
          <span className={styles.fileExtension}>{extension}</span>
        </div>
      ) : (
        <span
          className={styles.fileName}
          onDoubleClick={handleStartEdit}
          title="Double-click to edit"
        >
          {file.filename}
        </span>
      )}
    </li>
  );
}
