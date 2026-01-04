import { IMAGE_EXTENSIONS } from './constants';

/**
 * Check if a URL points to an image
 */
export function isImageUrl(url: string): boolean {
  if (!url) return false;

  // Data URLs for images are always valid
  if (url.startsWith('data:image/')) return true;

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // Check if pathname ends with image extension
    if (IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
      return true;
    }

    // Also check common image patterns that might not have extensions
    if (
      pathname.includes('/image') ||
      pathname.includes('/img') ||
      pathname.includes('/photo') ||
      pathname.includes('/media')
    ) {
      return true;
    }

    // If there's no extension at all in the pathname, it might still be an image
    const lastSegment = pathname.split('/').pop();
    if (lastSegment && !lastSegment.includes('.')) {
      return true;
    }
  } catch {
    // If URL parsing fails, fall back to simple check
    const lowerUrl = url.toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => lowerUrl.includes(ext));
  }

  return false;
}

/**
 * Extract hostname from URL, handling edge cases
 */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Extract pathname from URL
 */
export function getPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

/**
 * Get file extension from URL (lowercase, with dot)
 */
export function getExtensionFromUrl(url: string): string {
  if (!url) return '';

  // Handle data URLs
  if (url.startsWith('data:image/')) {
    const mimeMatch = url.match(/^data:image\/(\w+)/);
    if (mimeMatch) {
      const ext = mimeMatch[1].toLowerCase();
      return '.' + (ext === 'jpeg' ? 'jpg' : ext);
    }
    return '.png';
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastSegment = pathname.split('/').pop() || '';

    // Check if the last segment has a file extension
    const extMatch = lastSegment.match(/\.(\w+)$/);
    if (extMatch) {
      return '.' + extMatch[1].toLowerCase();
    }

    // Check common query params for format hints
    const format =
      urlObj.searchParams.get('format') ||
      urlObj.searchParams.get('f') ||
      urlObj.searchParams.get('type');
    if (format) {
      const normalizedFormat = format.toLowerCase();
      return '.' + (normalizedFormat === 'jpeg' ? 'jpg' : normalizedFormat);
    }
  } catch {
    // Fallback for malformed URLs
    const match = url.match(/\.(\w+)(?:\?|$)/);
    if (match) {
      return '.' + match[1].toLowerCase();
    }
  }

  return '';
}

/**
 * Check if URL is a data URL
 */
export function isDataUrl(url: string): boolean {
  return url?.startsWith('data:') ?? false;
}

/**
 * Check if URL is a blob URL
 */
export function isBlobUrl(url: string): boolean {
  return url?.startsWith('blob:') ?? false;
}

/**
 * Sanitize a string for use in filenames
 */
export function sanitizeForFilename(str: string): string {
  if (!str) return '';
  return str.replace(/[<>:"/\\|?*]/g, '_');
}

/**
 * Get filename from URL
 */
export function getFilenameFromUrl(url: string, existingNames?: Set<string>): string {
  if (!url) return 'image';

  // Handle data URLs
  if (url.startsWith('data:image/')) {
    const ext = getExtensionFromUrl(url);
    const baseName = 'image';
    let filename = baseName + ext;

    if (existingNames) {
      let counter = 1;
      while (existingNames.has(filename)) {
        filename = `${baseName}_${counter}${ext}`;
        counter++;
      }
    }
    return filename;
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastSegment = pathname.split('/').pop() || '';

    // If segment has an extension, use it as filename
    if (lastSegment && lastSegment.includes('.')) {
      const sanitized = sanitizeForFilename(decodeURIComponent(lastSegment));
      if (existingNames && existingNames.has(sanitized)) {
        const ext = getExtensionFromUrl(url);
        const baseName = sanitized.replace(/\.[^.]+$/, '');
        let counter = 1;
        let newName = `${baseName}_${counter}${ext}`;
        while (existingNames.has(newName)) {
          counter++;
          newName = `${baseName}_${counter}${ext}`;
        }
        return newName;
      }
      return sanitized;
    }

    // Otherwise construct a filename
    const ext = getExtensionFromUrl(url) || '.jpg';
    const hostname = urlObj.hostname.replace(/\./g, '_');
    const pathHash = pathname.replace(/[^a-zA-Z0-9]/g, '').slice(-8);
    return `${hostname}_${pathHash}${ext}`;
  } catch {
    return 'image.jpg';
  }
}
