// Utility for parsing dropped content and extracting images

import type { ImageItem } from '@/types';

// Image extensions we support
const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.ico',
  '.avif',
];

// Media types
export const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  WEBPAGE: 'webpage',
  UNKNOWN: 'unknown',
} as const;

// Drop sources for tracking where items came from
export const DROP_SOURCES = {
  FILE: 'file',
  HTML_IMG: 'html-img',
  HTML_SVG: 'html-svg',
  URI_LIST: 'uri-list',
  TEXT_URL: 'text-url',
  EMBEDDED: 'embedded',
} as const;

// Item hints for recommendations
export const ITEM_HINTS = {
  PRIMARY: 'primary',
  UI_ELEMENT: 'ui-element',
  DUPLICATE: 'duplicate',
  UNKNOWN: 'unknown',
} as const;

export interface ParsedDropItem {
  url: string;
  file?: File;
  source: string;
  mediaType: string;
  format: string;
  filename: string;
  dimensions?: { width: number | null; height: number | null };
  hint: string;
  dedupeKey?: string;
}

export interface ParsedDropData {
  items: ParsedDropItem[];
  recommended: ParsedDropItem[];
}

/**
 * Check if URL is absolute (starts with http:// or https://)
 */
function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Check if URL appears to be an image
 */
export function isImageUrl(url: string): boolean {
  if (!url) return false;

  // Data URLs for images are always valid
  if (url.startsWith('data:image/')) return true;

  // Blob URLs could be images
  if (url.startsWith('blob:')) return true;

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // Check if pathname ends with image extension
    if (IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
      return true;
    }

    // Check common image patterns
    if (
      pathname.includes('/image') ||
      pathname.includes('/img') ||
      pathname.includes('/photo') ||
      pathname.includes('/media')
    ) {
      return true;
    }

    // URLs without extensions might still be images (CDNs)
    const lastSegment = pathname.split('/').pop();
    if (lastSegment && !lastSegment.includes('.')) {
      // Could be an image, we'll let it through
      return true;
    }
  } catch {
    // If URL parsing fails, check extensions
    const lowerUrl = url.toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => lowerUrl.includes(ext));
  }

  return false;
}

/**
 * Detect media type from URL
 */
function detectMediaType(url: string): string {
  if (!url) return MEDIA_TYPES.UNKNOWN;

  const lowerUrl = url.toLowerCase();

  // Check for image extensions
  if (IMAGE_EXTENSIONS.some((ext) => lowerUrl.includes(ext))) {
    return MEDIA_TYPES.IMAGE;
  }

  // Check for data URLs
  if (lowerUrl.startsWith('data:image/')) {
    return MEDIA_TYPES.IMAGE;
  }

  // Check for video extensions
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  if (videoExtensions.some((ext) => lowerUrl.includes(ext))) {
    return MEDIA_TYPES.VIDEO;
  }

  return MEDIA_TYPES.UNKNOWN;
}

/**
 * Extract file format/extension from URL
 */
function extractFormat(url: string): string {
  if (!url) return '';

  // Handle data URLs
  if (url.startsWith('data:image/')) {
    const match = url.match(/^data:image\/(\w+)/);
    if (match) {
      const ext = match[1].toLowerCase();
      return ext === 'jpeg' ? 'jpg' : ext;
    }
    return 'png';
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastSegment = pathname.split('/').pop() || '';

    // Check for file extension
    const extMatch = lastSegment.match(/\.(\w+)$/);
    if (extMatch) {
      return extMatch[1].toLowerCase();
    }

    // Check query params for format hints
    const format =
      urlObj.searchParams.get('format') ||
      urlObj.searchParams.get('f') ||
      urlObj.searchParams.get('type');
    if (format) {
      const normalized = format.toLowerCase();
      return normalized === 'jpeg' ? 'jpg' : normalized;
    }
  } catch {
    // Fallback
    const match = url.match(/\.(\w+)(?:\?|$)/);
    if (match) {
      return match[1].toLowerCase();
    }
  }

  return '';
}

/**
 * Suggest a filename from URL
 */
function suggestFilename(url: string): string {
  if (!url) return 'image';

  try {
    const urlObj = new URL(url);
    const pathname = decodeURIComponent(urlObj.pathname);
    const lastSegment = pathname.split('/').pop() || '';

    // Remove extension if present
    const name = lastSegment.replace(/\.\w+$/, '');
    if (name && name.length > 0 && name.length < 200) {
      return name;
    }
  } catch {
    // Ignore
  }

  return 'image';
}

/**
 * Get a deduplication key for a URL
 */
function getDeduplicationKey(url: string): string {
  if (!url) return '';

  try {
    const urlObj = new URL(url);
    // Remove protocol and query params for deduplication
    return urlObj.hostname + urlObj.pathname;
  } catch {
    return url;
  }
}

/**
 * Check if an image is likely a UI element (icon, button, etc)
 */
function isLikelyUiElement(
  url: string,
  dimensions?: { width: number | null; height: number | null }
): boolean {
  // Small images are likely UI elements
  if (dimensions && dimensions.width && dimensions.height) {
    if (dimensions.width <= 32 && dimensions.height <= 32) {
      return true;
    }
  }

  // Check for common UI patterns in URL
  const lowerUrl = url.toLowerCase();
  const uiPatterns = [
    '/icon',
    '/logo',
    '/button',
    '/arrow',
    '/check',
    '/close',
    '/menu',
    '/nav',
    'favicon',
  ];

  return uiPatterns.some((pattern) => lowerUrl.includes(pattern));
}

/**
 * Convert SVG element to data URL
 */
function svgToDataUrl(svgString: string): string {
  const encoded = encodeURIComponent(svgString);
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Extract embedded URL from search engine URLs (Google Images, Bing, etc)
 */
function extractEmbeddedUrl(url: string): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const imageParams = ['iai', 'imgurl', 'mediaurl', 'url', 'src', 'image', 'img', 'orig'];

    for (const param of imageParams) {
      const value = urlObj.searchParams.get(param);
      if (value && isAbsoluteUrl(value)) {
        return value;
      }
    }
  } catch {
    // Ignore parsing errors
  }

  return null;
}

/**
 * Parse a DataTransfer object and extract all potential images
 */
export function parseDropData(dataTransfer: DataTransfer): ParsedDropData {
  const items: ParsedDropItem[] = [];
  const seen = new Set<string>();

  const addItem = (item: ParsedDropItem) => {
    // Deduplicate
    const key = item.dedupeKey || item.url;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    items.push(item);
  };

  // 1. Handle file drops
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i];
      if (file.type.startsWith('image/')) {
        const blobUrl = URL.createObjectURL(file);
        const nameParts = file.name.split('.');
        const ext = nameParts.length > 1 ? nameParts.pop()! : 'jpg';
        const name = nameParts.join('.') || 'image';

        addItem({
          url: blobUrl,
          file: file,
          source: DROP_SOURCES.FILE,
          mediaType: MEDIA_TYPES.IMAGE,
          format: ext,
          filename: name,
          hint: ITEM_HINTS.PRIMARY,
        });
      }
    }
  }

  // 2. Extract from HTML (images and SVGs from webpages)
  const html = dataTransfer.getData('text/html');
  if (html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract <img> elements
    const imgs = doc.querySelectorAll('img');
    imgs.forEach((img, index) => {
      const src = img.getAttribute('src');
      if (src && isAbsoluteUrl(src)) {
        const dimensions = {
          width: parseInt(img.getAttribute('width') || '') || null,
          height: parseInt(img.getAttribute('height') || '') || null,
        };

        addItem({
          url: src,
          source: DROP_SOURCES.HTML_IMG,
          mediaType: MEDIA_TYPES.IMAGE,
          format: extractFormat(src),
          filename: suggestFilename(src),
          dimensions: dimensions,
          hint: isLikelyUiElement(src, dimensions)
            ? ITEM_HINTS.UI_ELEMENT
            : index === 0
              ? ITEM_HINTS.PRIMARY
              : ITEM_HINTS.UNKNOWN,
          dedupeKey: getDeduplicationKey(src),
        });
      }
    });

    // Extract <svg> elements
    const svgs = doc.querySelectorAll('svg');
    svgs.forEach((svg) => {
      const svgString = svg.outerHTML;
      const dataUrl = svgToDataUrl(svgString);
      const viewBox = svg.getAttribute('viewBox');
      let dimensions: { width: number | null; height: number | null } | undefined;

      if (viewBox) {
        const parts = viewBox.split(/\s+/);
        if (parts.length >= 4) {
          dimensions = {
            width: parseFloat(parts[2]),
            height: parseFloat(parts[3]),
          };
        }
      }

      addItem({
        url: dataUrl,
        source: DROP_SOURCES.HTML_SVG,
        mediaType: MEDIA_TYPES.IMAGE,
        format: 'svg',
        filename: 'svg-image',
        hint: isLikelyUiElement(dataUrl, dimensions) ? ITEM_HINTS.UI_ELEMENT : ITEM_HINTS.UNKNOWN,
        dimensions: dimensions,
      });
    });
  }

  // 3. Extract from URI list
  const uriList = dataTransfer.getData('text/uri-list');
  if (uriList) {
    const urls = uriList.split(/[\r\n]+/).filter((u) => u && !u.startsWith('#'));

    urls.forEach((url) => {
      url = url.trim();
      if (isAbsoluteUrl(url)) {
        const mediaType = detectMediaType(url);
        addItem({
          url: url,
          source: DROP_SOURCES.URI_LIST,
          mediaType: mediaType,
          format: extractFormat(url),
          filename: suggestFilename(url),
          hint: ITEM_HINTS.UNKNOWN,
          dedupeKey: getDeduplicationKey(url),
        });

        // Check for embedded image URL (from search engines)
        const embedded = extractEmbeddedUrl(url);
        if (embedded && embedded !== url) {
          addItem({
            url: embedded,
            source: DROP_SOURCES.EMBEDDED,
            mediaType: detectMediaType(embedded),
            format: extractFormat(embedded),
            filename: suggestFilename(embedded),
            hint: ITEM_HINTS.PRIMARY,
            dedupeKey: getDeduplicationKey(embedded),
          });
        }
      }
    });
  }

  // 4. Extract from plain text (might be a URL)
  const text = dataTransfer.getData('text/plain');
  if (text) {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const url = urlMatch[0];
      const mediaType = detectMediaType(url);
      addItem({
        url: url,
        source: DROP_SOURCES.TEXT_URL,
        mediaType: mediaType,
        format: extractFormat(url),
        filename: suggestFilename(url),
        hint: ITEM_HINTS.UNKNOWN,
        dedupeKey: getDeduplicationKey(url),
      });
    }
  }

  // Separate recommended items
  const recommended = items.filter(
    (item) => item.mediaType === MEDIA_TYPES.IMAGE && item.hint !== ITEM_HINTS.UI_ELEMENT
  );

  return { items, recommended };
}

/**
 * Convert parsed drop items to ImageItem format
 */
export function toImageItems(items: ParsedDropItem[]): ImageItem[] {
  return items
    .filter((item) => item.mediaType === MEDIA_TYPES.IMAGE && item.url)
    .map((item) => ({
      url: item.url,
      filename: item.filename || 'image',
      extension: item.format ? `.${item.format}` : '.jpg',
      width: item.dimensions?.width ?? undefined,
      height: item.dimensions?.height ?? undefined,
      source: 'external-drop' as const,
    }));
}
