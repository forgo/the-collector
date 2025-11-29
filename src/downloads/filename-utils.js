// downloads/filename-utils.js
// Filename generation, template processing, and unique name utilities

/**
 * Extract filename and extension from a URL
 * @param {string} url - The image URL
 * @param {Set<string>} [existingNames] - Set of existing filenames (lowercase) for uniqueness checking
 * @returns {string} The generated filename with extension
 */
function getFilenameFromUrl(url, existingNames) {
  var filename = '';
  var extension = '';

  try {
    // Handle data URLs
    if (url.startsWith('data:image/')) {
      var mimeMatch = url.match(/^data:image\/(\w+)/);
      extension = mimeMatch ? '.' + mimeMatch[1].replace('jpeg', 'jpg') : '.png';
      filename = '';
    } else {
      var urlObj = new URL(url);
      var pathname = urlObj.pathname;
      var lastSegment = pathname.split('/').pop() || '';

      // Check if the last segment has a file extension
      var extMatch = lastSegment.match(/\.(\w+)$/);
      if (extMatch) {
        extension = '.' + extMatch[1].toLowerCase();
        filename = lastSegment.slice(0, -extension.length);
      } else {
        // No extension in path - try to find one from query params or use the segment
        filename = lastSegment;

        // Check common query params for format hints
        var format = urlObj.searchParams.get('format') ||
                     urlObj.searchParams.get('f') ||
                     urlObj.searchParams.get('type');
        if (format) {
          extension = '.' + format.toLowerCase().replace('jpeg', 'jpg');
        }
      }

      // If filename is empty or generic, try to extract something meaningful
      if (!filename || filename === 'image' || filename === 'photo') {
        // Try using path segments for context
        var segments = pathname.split('/').filter(function(s) { return s && s !== filename; });
        if (segments.length > 0) {
          var lastMeaningful = segments[segments.length - 1];
          // Use if it's not just a number or generic term
          var genericTerms = ['images', 'image', 'photos', 'photo', 'media', 'assets', 'static', 'cdn'];
          if (lastMeaningful && !/^\d+$/.test(lastMeaningful) &&
              genericTerms.indexOf(lastMeaningful.toLowerCase()) === -1) {
            filename = lastMeaningful;
          }
        }

        // Try hostname as prefix if still empty
        if (!filename) {
          var hostParts = urlObj.hostname.split('.');
          // Get domain name (skip www, cdn, etc.)
          var skipParts = ['www', 'cdn', 'static', 'images', 'img', 'media'];
          var domain = hostParts.find(function(p) {
            return skipParts.indexOf(p) === -1 && p.length > 2;
          });
          if (domain) {
            filename = domain + '_image';
          }
        }
      }
    }
  } catch (e) {
    // Fallback for malformed URLs
    var parts = url.split('/');
    filename = parts[parts.length - 1] || '';
    var fallbackExtMatch = filename.match(/\.(\w+)$/);
    if (fallbackExtMatch) {
      extension = '.' + fallbackExtMatch[1].toLowerCase();
      filename = filename.slice(0, -extension.length);
    }
  }

  // Final fallback - generate a unique name
  if (!filename) {
    filename = 'image';
  }

  // Default extension if none found
  if (!extension) {
    extension = '.jpg';
  }

  // Make the filename unique if existingNames is provided
  var finalName = filename + extension;
  if (existingNames && existingNames.size > 0) {
    var counter = 1;
    while (existingNames.has(finalName.toLowerCase())) {
      finalName = filename + '_' + counter + extension;
      counter++;
    }
  }

  return finalName;
}

/**
 * Apply filename template to generate final filename
 * @param {string} template - The template string with placeholders
 * @param {object} context - Context object with values for placeholders
 * @param {string} context.name - The base filename (without extension)
 * @param {string} context.extension - The file extension (with dot)
 * @param {number} context.index - The sequential index (1-based)
 * @param {string} context.group - The group name (or 'Ungrouped')
 * @returns {string} The processed filename with extension
 */
function applyFilenameTemplate(template, context) {
  var name = context.name || 'image';
  var extension = context.extension || '.jpg';
  var index = context.index || 1;
  var group = context.group || 'Ungrouped';

  // Get current date/time
  var now = new Date();

  // Pad function for numbers
  function pad(n, width) {
    width = width || 2;
    n = String(n);
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
  }

  // Date components
  var year4 = now.getFullYear();
  var year2 = String(year4).slice(-2);
  var month = pad(now.getMonth() + 1);
  var day = pad(now.getDate());
  var hours = pad(now.getHours());
  var minutes = pad(now.getMinutes());
  var seconds = pad(now.getSeconds());

  // Month names
  var monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
  var monthShort = monthNames[now.getMonth()].slice(0, 3);
  var monthLong = monthNames[now.getMonth()];

  // Day names
  var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var dayShort = dayNames[now.getDay()].slice(0, 3);
  var dayLong = dayNames[now.getDay()];

  // Convenience formats
  var dateStr = year4 + '-' + month + '-' + day; // YYYY-MM-DD
  var timeStr = hours + '-' + minutes + '-' + seconds; // hh-mm-ss (file-safe)
  var isoStr = year4 + month + day + 'T' + hours + minutes + seconds; // Compact ISO-like

  // Replace all tokens
  var result = template
    // Core tokens
    .replace(/\{name\}/gi, name)
    .replace(/\{original\}/gi, name) // Backwards compatibility
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
 * Split a filename into name and extension
 * @param {string} filename - The full filename
 * @returns {{name: string, extension: string}} Object with name and extension (with dot)
 */
function splitFilename(filename) {
  if (!filename) return { name: '', extension: '' };

  var match = filename.match(/^(.+?)(\.[^.]+)$/);
  if (match) {
    return { name: match[1], extension: match[2] };
  }
  return { name: filename, extension: '' };
}

/**
 * Make a filename unique by appending a counter
 * @param {string} filename - The filename to make unique
 * @param {Set<string>} existingNames - Set of existing filenames (lowercase)
 * @returns {string} A unique filename
 */
function makeFilenameUnique(filename, existingNames) {
  if (!existingNames || existingNames.size === 0) return filename;
  if (!existingNames.has(filename.toLowerCase())) return filename;

  var parts = splitFilename(filename);
  var counter = 1;
  var newFilename;

  do {
    newFilename = parts.name + '_' + counter + parts.extension;
    counter++;
  } while (existingNames.has(newFilename.toLowerCase()));

  return newFilename;
}

/**
 * Sanitize a string for use as a filename
 * @param {string} str - The string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeFilename(str) {
  if (!str) return '';
  return str.replace(/[<>:"/\\|?*]/g, '_');
}

// Export for use in other modules
window.FilenameUtils = {
  getFilenameFromUrl: getFilenameFromUrl,
  applyFilenameTemplate: applyFilenameTemplate,
  splitFilename: splitFilename,
  makeFilenameUnique: makeFilenameUnique,
  sanitizeFilename: sanitizeFilename
};
