import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Flex,
  Text,
  SegmentedControl,
  Checkbox,
  ScrollArea,
  Progress,
  Badge,
} from '@radix-ui/themes';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { Modal } from './Modal';
import {
  detectConflicts,
  buildTreeStructure,
  getSortedDirectories,
  getTreeStats,
} from '@/lib/tree-builder';
import { getFilenameFromUrl, hasImageExtension, splitFilename } from '@/lib/filename';
import {
  sanitizeDirectoryPath,
  downloadParallel,
  showDownloadInFolder,
} from '@/lib/download-manager';
import type { ImageItem } from '@/types';
import styles from './DownloadPreviewModal.module.css';

interface DownloadPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to add a counter to a filename (macOS style: "file (1).png")
function addCounterToFilename(filename: string, counter: number): string {
  const { name, extension } = splitFilename(filename);
  if (extension) {
    return `${name} (${counter})${extension}`;
  }
  return `${filename} (${counter})`;
}

// Helper to get effective filename: customFilename > filename+extension > generated from URL
function getEffectiveFilename(image: ImageItem, usedFilenames: Set<string>): string {
  let filename: string;

  if (image.customFilename) {
    // User provided a custom filename
    // If it doesn't have a valid image extension, append the original extension
    // This ensures "a" becomes "a.png" but "a.jpg" stays "a.jpg"
    filename = hasImageExtension(image.customFilename)
      ? image.customFilename
      : image.customFilename + (image.extension || '');
  } else if (image.filename) {
    // Use base filename + extension
    filename = image.filename + (image.extension || '');
  } else {
    // Fallback to generating from URL
    return getFilenameFromUrl(image.url, usedFilenames);
  }

  // Handle duplicates
  if (usedFilenames.has(filename.toLowerCase())) {
    let counter = 1;
    let newFilename = addCounterToFilename(filename, counter);
    while (usedFilenames.has(newFilename.toLowerCase())) {
      counter++;
      newFilename = addCounterToFilename(filename, counter);
    }
    filename = newFilename;
  }

  return filename;
}

export function DownloadPreviewModal({ isOpen, onClose }: DownloadPreviewModalProps) {
  const { groups, ungrouped, selectedUrls, settings, clearAll, updateImageFilename } = useApp();
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [includeUngrouped, setIncludeUngrouped] = useState(true);
  const [openFolderWhenDone, setOpenFolderWhenDone] = useState(true);
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
    // Sanitize the root directory (browser only allows relative paths within Downloads)
    const rootDir = sanitizeDirectoryPath(settings.downloadDirectory);

    groups.forEach((group) => {
      const dir = group.directory || group.name;
      group.images.forEach((image) => {
        if (selectedSet && !selectedSet.has(image.url)) return;
        const filename = getEffectiveFilename(image, usedFilenames);
        usedFilenames.add(filename.toLowerCase());
        items.push({
          directory: rootDir ? `${rootDir}/${dir}` : dir,
          filename,
          url: image.url,
          group: group.name,
          groupId: group.id,
        });
      });
    });

    if (includeUngrouped) {
      const ungroupedDir = settings.ungroupedDirectory || 'Ungrouped';
      ungrouped.forEach((image) => {
        if (selectedSet && !selectedSet.has(image.url)) return;
        const filename = getEffectiveFilename(image, usedFilenames);
        usedFilenames.add(filename.toLowerCase());
        items.push({
          directory: rootDir ? `${rootDir}/${ungroupedDir}` : ungroupedDir,
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

    try {
      const result = await downloadParallel(
        downloads.map((d) => ({
          url: d.url,
          filename: d.filename,
          directory: d.directory,
          willRename: d.hasConflict,
        })),
        (completed, failed, total) => {
          setProgress({ completed, failed, total });
        },
        5
      );

      // Open folder if requested and we have a successful download
      if (openFolderWhenDone && result.lastDownloadId) {
        await showDownloadInFolder(result.lastDownloadId);
      }

      if (settings.clearOnDownload && result.completed > 0) {
        await clearAll();
      }

      if (result.failed > 0) {
        console.warn(`Download completed with ${result.failed} failures:`, result.errors);
      }
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
      onClose();
    }
  }, [downloads, settings.clearOnDownload, openFolderWhenDone, clearAll, onClose]);

  const progressValue =
    progress.total > 0 ? ((progress.completed + progress.failed) / progress.total) * 100 : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Download Preview" maxWidth="500px">
      <Flex direction="column" gap="3">
        <SegmentedControl.Root
          value={scope}
          onValueChange={(v) => setScope(v as 'all' | 'selected')}
        >
          <SegmentedControl.Item value="all">All</SegmentedControl.Item>
          <SegmentedControl.Item value="selected">Selected</SegmentedControl.Item>
        </SegmentedControl.Root>

        <Text as="label" size="2">
          <Flex gap="2" align="center">
            <Checkbox
              checked={includeUngrouped}
              onCheckedChange={(checked) => setIncludeUngrouped(!!checked)}
            />
            Include Ungrouped ({ungrouped.length})
          </Flex>
        </Text>

        <Text as="label" size="2">
          <Flex gap="2" align="center">
            <Checkbox
              checked={openFolderWhenDone}
              onCheckedChange={(checked) => setOpenFolderWhenDone(!!checked)}
            />
            Open folder when finished
          </Flex>
        </Text>

        <Flex gap="2" align="center">
          <Text size="2" weight="medium">
            {stats.total} image{stats.total !== 1 ? 's' : ''} to download
          </Text>
          {stats.conflicts > 0 && (
            <Badge color="orange" size="1">
              {stats.conflicts} conflict{stats.conflicts !== 1 ? 's' : ''}
            </Badge>
          )}
        </Flex>

        <ScrollArea style={{ height: '250px' }}>
          <Flex direction="column" gap="2">
            {directories.map((dir) => (
              <TreeFolder
                key={dir}
                name={dir}
                files={tree[dir]}
                onFilenameChange={handleFilenameChange}
              />
            ))}
          </Flex>
        </ScrollArea>

        {stats.conflicts > 0 && (
          <Text size="1" color="orange">
            Duplicate filenames will be auto-renamed
          </Text>
        )}

        {isDownloading && (
          <Flex direction="column" gap="1">
            <Progress value={progressValue} />
            <Text size="1" color="gray" align="center">
              {progress.completed + progress.failed} / {progress.total}
              {progress.failed > 0 && ` (${progress.failed} failed)`}
            </Text>
          </Flex>
        )}
      </Flex>

      <Flex gap="3" mt="4" justify="end">
        <Button variant="ghost" onClick={onClose} disabled={isDownloading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleDownload}
          disabled={stats.total === 0 || isDownloading}
        >
          {isDownloading ? 'Downloading...' : 'Download'}
        </Button>
      </Flex>
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
      <Flex
        align="center"
        gap="2"
        py="1"
        style={{ cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={14} />
        <Icon name="folder" size={16} />
        <Text size="2" weight="medium">
          {name}
        </Text>
        <Text size="1" color="gray">
          ({files.length})
        </Text>
      </Flex>
      {isExpanded && (
        <Flex direction="column" gap="1" pl="6">
          {files.map((file, index) => (
            <TreeFile
              key={`${file.url}-${index}`}
              file={file}
              onFilenameChange={onFilenameChange}
            />
          ))}
        </Flex>
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

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(file.filename);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== file.filename) {
      onFilenameChange(file.url, trimmed, file.groupId ?? null);
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
    <Flex align="center" gap="2" py="1">
      {file.hasConflict && (
        <Text color="orange" size="1">
          ⚠
        </Text>
      )}
      <Icon name="photo" size={14} />
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={styles.fileInput}
        />
      ) : (
        <Text
          size="2"
          onDoubleClick={handleStartEdit}
          style={{ cursor: 'text' }}
          title="Double-click to edit"
        >
          {file.filename}
        </Text>
      )}
    </Flex>
  );
}
