// Download queue management and execution

interface DownloadItem {
  url: string;
  filename: string;
  directory: string;
  willRename?: boolean;
}

interface DownloadResult {
  success: boolean;
  error?: string;
  url: string;
  downloadId?: number;
}

interface DownloadProgress {
  completed: number;
  failed: number;
  total: number;
  done: number;
  percent: number;
  isComplete: boolean;
  isDownloading: boolean;
}

interface DownloadSummary {
  completed: number;
  failed: number;
  errors: Array<{ url: string; error: string }>;
  lastDownloadId?: number; // ID of a successful download (for opening folder)
}

// Download state tracking
const downloadState = {
  isDownloading: false,
  completed: 0,
  failed: 0,
  total: 0,
  errors: [] as Array<{ url: string; error: string }>,
  lastDownloadId: undefined as number | undefined,
};

/**
 * Reset download state
 */
function resetDownloadState(): void {
  downloadState.isDownloading = false;
  downloadState.completed = 0;
  downloadState.failed = 0;
  downloadState.total = 0;
  downloadState.errors = [];
  downloadState.lastDownloadId = undefined;
}

/**
 * Get current download progress
 */
export function getDownloadProgress(): DownloadProgress {
  const done = downloadState.completed + downloadState.failed;
  const percent = downloadState.total > 0 ? Math.round((done / downloadState.total) * 100) : 0;

  return {
    completed: downloadState.completed,
    failed: downloadState.failed,
    total: downloadState.total,
    done: done,
    percent: percent,
    isComplete: done === downloadState.total,
    isDownloading: downloadState.isDownloading,
  };
}

/**
 * Sanitize a filename for the browser downloads API.
 * Replaces characters that Firefox/Chrome consider illegal.
 */
function sanitizeFilename(filename: string): string {
  return (
    filename
      // Replace various Unicode whitespace with regular space
      .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Remove control characters (0x00-0x1F and 0x7F)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Replace characters illegal in Windows filenames (Firefox is strict about these)
      .replace(/[<>:"|?*]/g, '_')
      // Trim whitespace
      .trim()
  );
}

/**
 * Build a file path from directory and filename
 */
function buildFilePath(directory: string, filename: string): string {
  const cleanFilename = sanitizeFilename(filename);
  if (!directory) return cleanFilename;
  const cleanDir = directory.replace(/[/\\]+$/, '');
  return cleanDir + '/' + cleanFilename;
}

/**
 * Execute a single download using browser downloads API
 */
async function downloadSingle(item: DownloadItem): Promise<DownloadResult> {
  const filePath = buildFilePath(item.directory, item.filename);

  // Determine conflict action based on per-item setting
  // willRename: true = 'uniquify' (auto-rename), false = 'overwrite'
  const conflictAction = item.willRename !== false ? 'uniquify' : 'overwrite';

  try {
    const downloadId = await browser.downloads.download({
      url: item.url,
      filename: filePath,
      saveAs: false,
      conflictAction: conflictAction as 'uniquify' | 'overwrite' | 'prompt',
    });

    return {
      success: true,
      downloadId: downloadId,
      url: item.url,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Download] Failed:', { filename: filePath, error: errorMsg });
    return {
      success: false,
      error: errorMsg,
      url: item.url,
    };
  }
}

/**
 * Download multiple items sequentially
 */
export async function downloadSequential(
  downloads: DownloadItem[],
  onProgress?: (completed: number, failed: number, total: number) => void
): Promise<DownloadSummary> {
  resetDownloadState();
  downloadState.isDownloading = true;
  downloadState.total = downloads.length;

  for (const item of downloads) {
    const result = await downloadSingle(item);

    if (result.success) {
      downloadState.completed++;
      if (result.downloadId) {
        downloadState.lastDownloadId = result.downloadId;
      }
    } else {
      downloadState.failed++;
      downloadState.errors.push({
        url: result.url,
        error: result.error || 'Unknown error',
      });
    }

    if (onProgress) {
      onProgress(downloadState.completed, downloadState.failed, downloadState.total);
    }
  }

  downloadState.isDownloading = false;

  return {
    completed: downloadState.completed,
    failed: downloadState.failed,
    errors: downloadState.errors,
    lastDownloadId: downloadState.lastDownloadId,
  };
}

/**
 * Download multiple items in parallel (faster but may overwhelm browser)
 */
export async function downloadParallel(
  downloads: DownloadItem[],
  onProgress?: (completed: number, failed: number, total: number) => void,
  concurrency: number = 5
): Promise<DownloadSummary> {
  resetDownloadState();
  downloadState.isDownloading = true;
  downloadState.total = downloads.length;

  let index = 0;
  let activeCount = 0;

  return new Promise((resolve) => {
    function checkComplete() {
      if (index >= downloads.length && activeCount === 0) {
        downloadState.isDownloading = false;
        resolve({
          completed: downloadState.completed,
          failed: downloadState.failed,
          errors: downloadState.errors,
          lastDownloadId: downloadState.lastDownloadId,
        });
      }
    }

    function processNext() {
      while (activeCount < concurrency && index < downloads.length) {
        const item = downloads[index];
        index++;
        activeCount++;

        downloadSingle(item).then((result) => {
          activeCount--;

          if (result.success) {
            downloadState.completed++;
            if (result.downloadId) {
              downloadState.lastDownloadId = result.downloadId;
            }
          } else {
            downloadState.failed++;
            downloadState.errors.push({
              url: result.url,
              error: result.error || 'Unknown error',
            });
          }

          if (onProgress) {
            onProgress(downloadState.completed, downloadState.failed, downloadState.total);
          }

          processNext();
          checkComplete();
        });
      }

      checkComplete();
    }

    processNext();
  });
}

/**
 * Open the folder containing a downloaded file
 */
export async function showDownloadInFolder(downloadId: number): Promise<boolean> {
  try {
    await browser.downloads.show(downloadId);
    return true;
  } catch (error) {
    console.error('Failed to show download in folder:', error);
    return false;
  }
}

/**
 * Sanitize a directory path for use in browser downloads API.
 * The browser only allows relative paths within the default Downloads folder.
 * This strips absolute path prefixes and normalizes slashes.
 * Note: We don't sanitize characters - the browser handles that automatically.
 */
export function sanitizeDirectoryPath(path: string): string {
  if (!path) return '';

  const cleaned = path
    // Normalize backslashes to forward slashes
    .replace(/\\/g, '/')
    // Remove ~ or ~/ prefix (home directory - not valid for browser)
    .replace(/^~\/?/, '')
    // Remove Windows drive letters (C:/, D:/, etc.)
    .replace(/^[a-zA-Z]:\//, '')
    // Remove common absolute path prefixes that users might try
    .replace(/^\/Users\/[^/]+\/Downloads\/?/i, '')
    .replace(/^\/home\/[^/]+\/Downloads\/?/i, '')
    // Remove Downloads/ prefix (with or without leading slash) - handles ~/Downloads/foo case
    .replace(/^\/?Downloads\//i, '')
    // Normalize multiple slashes
    .replace(/\/+/g, '/')
    // Remove leading/trailing slashes
    .replace(/^\/|\/$/g, '');

  return cleaned;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
