/**
 * Filename generation, template processing, and unique name utilities
 */

// Valid image extensions we recognize
const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.ico',
  '.avif',
  '.tiff',
  '.tif',
]);

/**
 * Check if a filename ends with a valid image extension
 */
export function hasImageExtension(filename: string): boolean {
  if (!filename) return false;
  const match = filename.match(/(\.[^.]+)$/);
  if (match) {
    return IMAGE_EXTENSIONS.has(match[1].toLowerCase());
  }
  return false;
}

export interface FilenameContext {
  name: string;
  extension: string;
  index: number;
  group: string;
}

/**
 * Extract filename and extension from a URL
 */
export function getFilenameFromUrl(url: string, existingNames?: Set<string>): string {
  let filename = '';
  let extension = '';

  try {
    // Handle data URLs
    if (url.startsWith('data:image/')) {
      const mimeMatch = url.match(/^data:image\/(\w+)/);
      extension = mimeMatch ? '.' + mimeMatch[1].replace('jpeg', 'jpg') : '.png';
      filename = '';
    } else {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const lastSegment = pathname.split('/').pop() || '';

      // Check if the last segment has a file extension
      const extMatch = lastSegment.match(/\.(\w+)$/);
      if (extMatch) {
        extension = '.' + extMatch[1].toLowerCase();
        filename = lastSegment.slice(0, -extension.length);
      } else {
        filename = lastSegment;

        // Check common query params for format hints
        const format =
          urlObj.searchParams.get('format') ||
          urlObj.searchParams.get('f') ||
          urlObj.searchParams.get('type');
        if (format) {
          extension = '.' + format.toLowerCase().replace('jpeg', 'jpg');
        }
      }

      // If filename is empty or generic, try to extract something meaningful
      if (!filename || filename === 'image' || filename === 'photo') {
        const segments = pathname.split('/').filter((s) => s && s !== filename);
        if (segments.length > 0) {
          const lastMeaningful = segments[segments.length - 1];
          const genericTerms = [
            'images',
            'image',
            'photos',
            'photo',
            'media',
            'assets',
            'static',
            'cdn',
          ];
          if (
            lastMeaningful &&
            !/^\d+$/.test(lastMeaningful) &&
            !genericTerms.includes(lastMeaningful.toLowerCase())
          ) {
            filename = lastMeaningful;
          }
        }

        // Try hostname as prefix if still empty
        if (!filename) {
          const hostParts = urlObj.hostname.split('.');
          const skipParts = ['www', 'cdn', 'static', 'images', 'img', 'media'];
          const domain = hostParts.find((p) => !skipParts.includes(p) && p.length > 2);
          if (domain) {
            filename = domain + '_image';
          }
        }
      }
    }
  } catch {
    // Fallback for malformed URLs
    const parts = url.split('/');
    filename = parts[parts.length - 1] || '';
    const fallbackExtMatch = filename.match(/\.(\w+)$/);
    if (fallbackExtMatch) {
      extension = '.' + fallbackExtMatch[1].toLowerCase();
      filename = filename.slice(0, -extension.length);
    }
  }

  // Final fallback
  if (!filename) {
    filename = 'image';
  }

  // Default extension if none found
  if (!extension) {
    extension = '.jpg';
  }

  // Make the filename unique if existingNames is provided
  let finalName = filename + extension;
  if (existingNames && existingNames.size > 0) {
    let counter = 1;
    while (existingNames.has(finalName.toLowerCase())) {
      finalName = filename + '_' + counter + extension;
      counter++;
    }
  }

  return finalName;
}

/**
 * Apply filename template to generate final filename
 */
export function applyFilenameTemplate(template: string, context: Partial<FilenameContext>): string {
  const name = context.name || 'image';
  const extension = context.extension || '.jpg';
  const index = context.index || 1;
  const group = context.group || 'Ungrouped';

  // Get current date/time
  const now = new Date();

  // Pad function for numbers
  const pad = (n: number, width = 2): string => {
    const str = String(n);
    return str.length >= width ? str : '0'.repeat(width - str.length) + str;
  };

  // Date components
  const year4 = now.getFullYear();
  const year2 = String(year4).slice(-2);
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  // Month names
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthShort = monthNames[now.getMonth()].slice(0, 3);
  const monthLong = monthNames[now.getMonth()];

  // Day names
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayShort = dayNames[now.getDay()].slice(0, 3);
  const dayLong = dayNames[now.getDay()];

  // Convenience formats
  const dateStr = `${year4}-${month}-${day}`;
  const timeStr = `${hours}-${minutes}-${seconds}`;
  const isoStr = `${year4}${month}${day}T${hours}${minutes}${seconds}`;

  // Replace all tokens
  let result = template
    // Core tokens
    .replace(/\{name\}/gi, name)
    .replace(/\{original\}/gi, name)
    .replace(/\{index\}/gi, String(index))
    .replace(/\{group\}/gi, group)
    // Year formats
    .replace(/\{YYYY\}/g, String(year4))
    .replace(/\{YY\}/g, year2)
    // Month formats
    .replace(/\{MM\}/g, month)
    .replace(/\{M\}/g, String(now.getMonth() + 1))
    .replace(/\{MMMM\}/g, monthLong)
    .replace(/\{MMM\}/g, monthShort)
    // Day formats
    .replace(/\{DD\}/g, day)
    .replace(/\{D\}/g, String(now.getDate()))
    .replace(/\{dddd\}/g, dayLong)
    .replace(/\{ddd\}/g, dayShort)
    // Time formats
    .replace(/\{hh\}/g, hours)
    .replace(/\{h\}/g, String(now.getHours()))
    .replace(/\{mm\}/g, minutes)
    .replace(/\{m\}/g, String(now.getMinutes()))
    .replace(/\{ss\}/g, seconds)
    .replace(/\{s\}/g, String(now.getSeconds()))
    // Convenience formats
    .replace(/\{date\}/gi, dateStr)
    .replace(/\{time\}/gi, timeStr)
    .replace(/\{iso\}/gi, isoStr);

  // Sanitize filename (remove invalid characters)
  result = result.replace(/[<>:"/\\|?*]/g, '_');

  // Add extension
  return result + extension;
}

/**
 * Split a filename into name and extension.
 * Only recognizes valid image extensions to avoid incorrectly splitting
 * filenames that contain periods (e.g., "Screenshot 2025-11-16 at 2.29.30 AM.png")
 */
export function splitFilename(filename: string): { name: string; extension: string } {
  if (!filename) return { name: '', extension: '' };

  // Look for a valid image extension at the end
  const match = filename.match(/(\.[^.]+)$/);
  if (match) {
    const potentialExt = match[1].toLowerCase();
    if (IMAGE_EXTENSIONS.has(potentialExt)) {
      return {
        name: filename.slice(0, -match[1].length),
        extension: match[1],
      };
    }
  }

  // No valid extension found
  return { name: filename, extension: '' };
}

/**
 * Split a filename into name and extension, with a fallback extension.
 * Use this when you have a separate known extension to use as fallback.
 */
export function splitFilenameWithFallback(
  filename: string,
  fallbackExtension: string
): { name: string; extension: string } {
  const result = splitFilename(filename);

  // If we found a valid extension in the filename, use it
  if (result.extension) {
    return result;
  }

  // Otherwise use the fallback
  return { name: filename, extension: fallbackExtension };
}

/**
 * Make a filename unique by appending a counter
 */
export function makeFilenameUnique(filename: string, existingNames: Set<string>): string {
  if (!existingNames || existingNames.size === 0) return filename;
  if (!existingNames.has(filename.toLowerCase())) return filename;

  const parts = splitFilename(filename);
  let counter = 1;
  let newFilename: string;

  do {
    newFilename = `${parts.name}_${counter}${parts.extension}`;
    counter++;
  } while (existingNames.has(newFilename.toLowerCase()));

  return newFilename;
}

/**
 * Sanitize a string for use as a filename
 */
export function sanitizeFilename(str: string): string {
  if (!str) return '';
  return str.replace(/[<>:"/\\|?*]/g, '_');
}
