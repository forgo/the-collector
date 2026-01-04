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
}

// Download state tracking
const downloadState = {
  isDownloading: false,
  completed: 0,
  failed: 0,
  total: 0,
  errors: [] as Array<{ url: string; error: string }>,
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
 * Build a file path from directory and filename
 */
function buildFilePath(directory: string, filename: string): string {
  if (!directory) return filename;
  const cleanDir = directory.replace(/[/\\]+$/, '');
  return cleanDir + '/' + filename;
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
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
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
 * Sanitize a directory path for use in downloads
 */
export function sanitizeDirectoryPath(path: string): string {
  if (!path) return '';
  // Remove invalid characters and normalize slashes
  return path
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
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
