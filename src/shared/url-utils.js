// shared/url-utils.js
// URL parsing, validation, and image detection utilities

/**
 * Check if a URL points to an image
 * @param {string} url - URL to check
 * @returns {boolean} True if URL appears to be an image
 */
function isImageUrl(url) {
  if (!url) return false;

  const IMAGE_EXTENSIONS = window.Constants ? window.Constants.IMAGE_EXTENSIONS : ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

  // Data URLs for images are always valid
  if (url.startsWith('data:image/')) return true;

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // Check if pathname ends with image extension
    if (IMAGE_EXTENSIONS.some(function(ext) { return pathname.endsWith(ext); })) {
      return true;
    }

    // Also check common image patterns that might not have extensions
    // (e.g., CDN URLs like /image/12345 or URLs with query params)
    if (pathname.includes('/image') || pathname.includes('/img') ||
        pathname.includes('/photo') || pathname.includes('/media')) {
      return true;
    }

    // If there's no extension at all in the pathname, it might still be an image
    // (many CDNs serve images without extensions)
    const lastSegment = pathname.split('/').pop();
    if (lastSegment && !lastSegment.includes('.')) {
      return true; // Trust URLs without extensions - content script validated them
    }
  } catch (e) {
    // If URL parsing fails, fall back to simple check
    const lowerUrl = url.toLowerCase();
    return IMAGE_EXTENSIONS.some(function(ext) { return lowerUrl.includes(ext); });
  }

  return false;
}

/**
 * Extract hostname from URL, handling edge cases
 * @param {string} url - URL to parse
 * @returns {string} Hostname or empty string
 */
function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return '';
  }
}

/**
 * Extract pathname from URL
 * @param {string} url - URL to parse
 * @returns {string} Pathname or empty string
 */
function getPathname(url) {
  try {
    return new URL(url).pathname;
  } catch (e) {
    return '';
  }
}

/**
 * Get file extension from URL (lowercase, with dot)
 * @param {string} url - URL to parse
 * @returns {string} Extension like '.jpg' or empty string
 */
function getExtensionFromUrl(url) {
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
    const format = urlObj.searchParams.get('format') ||
                 urlObj.searchParams.get('f') ||
                 urlObj.searchParams.get('type');
    if (format) {
      const normalizedFormat = format.toLowerCase();
      return '.' + (normalizedFormat === 'jpeg' ? 'jpg' : normalizedFormat);
    }
  } catch (e) {
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
 * @param {string} url - URL to check
 * @returns {boolean}
 */
function isDataUrl(url) {
  return url && url.startsWith('data:');
}

/**
 * Check if URL is a blob URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
function isBlobUrl(url) {
  return url && url.startsWith('blob:');
}

/**
 * Sanitize a string for use in filenames
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeForFilename(str) {
  if (!str) return '';
  return str.replace(/[<>:"/\\|?*]/g, '_');
}

// Export for use in other modules
window.UrlUtils = {
  isImageUrl: isImageUrl,
  getHostname: getHostname,
  getPathname: getPathname,
  getExtensionFromUrl: getExtensionFromUrl,
  isDataUrl: isDataUrl,
  isBlobUrl: isBlobUrl,
  sanitizeForFilename: sanitizeForFilename
};
