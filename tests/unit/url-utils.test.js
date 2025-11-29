/**
 * Tests for url-utils.js
 * Covers URL parsing, validation, and image detection
 */

import { describe, it, expect } from 'vitest';

// Set up Constants before loading url-utils
window.Constants = {
  IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']
};

// Load the module
await import('../../src/shared/url-utils.js');

const {
  isImageUrl,
  getHostname,
  getPathname,
  getExtensionFromUrl,
  isDataUrl,
  isBlobUrl,
  sanitizeForFilename
} = window.UrlUtils;

describe('isImageUrl', () => {
  describe('URLs with image extensions', () => {
    it('returns true for .jpg URLs', () => {
      expect(isImageUrl('https://example.com/image.jpg')).toBe(true);
    });

    it('returns true for .jpeg URLs', () => {
      expect(isImageUrl('https://example.com/image.jpeg')).toBe(true);
    });

    it('returns true for .png URLs', () => {
      expect(isImageUrl('https://example.com/image.png')).toBe(true);
    });

    it('returns true for .gif URLs', () => {
      expect(isImageUrl('https://example.com/image.gif')).toBe(true);
    });

    it('returns true for .webp URLs', () => {
      expect(isImageUrl('https://example.com/image.webp')).toBe(true);
    });

    it('returns true for .svg URLs', () => {
      expect(isImageUrl('https://example.com/image.svg')).toBe(true);
    });

    it('returns true for uppercase extensions', () => {
      expect(isImageUrl('https://example.com/IMAGE.JPG')).toBe(true);
      expect(isImageUrl('https://example.com/IMAGE.PNG')).toBe(true);
    });
  });

  describe('data URLs', () => {
    it('returns true for data:image/png URLs', () => {
      expect(isImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    });

    it('returns true for data:image/jpeg URLs', () => {
      expect(isImageUrl('data:image/jpeg;base64,/9j/4AAQ=')).toBe(true);
    });

    it('returns true for data:image/gif URLs', () => {
      expect(isImageUrl('data:image/gif;base64,R0lGODlh')).toBe(true);
    });
  });

  describe('URLs with image path patterns', () => {
    it('returns true for /image/ in path', () => {
      expect(isImageUrl('https://cdn.example.com/image/12345')).toBe(true);
    });

    it('returns true for /img/ in path', () => {
      expect(isImageUrl('https://cdn.example.com/img/12345')).toBe(true);
    });

    it('returns true for /photo/ in path', () => {
      expect(isImageUrl('https://cdn.example.com/photo/12345')).toBe(true);
    });

    it('returns true for /media/ in path', () => {
      expect(isImageUrl('https://cdn.example.com/media/12345')).toBe(true);
    });
  });

  describe('CDN-style URLs without extensions', () => {
    it('returns true for numeric IDs without extensions', () => {
      expect(isImageUrl('https://cdn.example.com/12345')).toBe(true);
    });

    it('returns true for hash-like paths', () => {
      expect(isImageUrl('https://cdn.example.com/abc123def456')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns false for null', () => {
      expect(isImageUrl(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isImageUrl(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isImageUrl('')).toBe(false);
    });

    it('handles URLs with query strings', () => {
      expect(isImageUrl('https://example.com/image.jpg?width=500')).toBe(true);
    });

    it('handles URLs with hash fragments', () => {
      expect(isImageUrl('https://example.com/image.png#section')).toBe(true);
    });
  });
});

describe('getHostname', () => {
  it('extracts hostname from standard URL', () => {
    expect(getHostname('https://example.com/path')).toBe('example.com');
  });

  it('extracts hostname with subdomain', () => {
    expect(getHostname('https://cdn.example.com/path')).toBe('cdn.example.com');
  });

  it('extracts hostname with www', () => {
    expect(getHostname('https://www.example.com/path')).toBe('www.example.com');
  });

  it('extracts hostname with port', () => {
    expect(getHostname('https://example.com:8080/path')).toBe('example.com');
  });

  it('returns empty string for invalid URL', () => {
    expect(getHostname('not-a-url')).toBe('');
  });

  it('returns empty string for null', () => {
    expect(getHostname(null)).toBe('');
  });
});

describe('getPathname', () => {
  it('extracts pathname from URL', () => {
    expect(getPathname('https://example.com/images/photo.jpg')).toBe('/images/photo.jpg');
  });

  it('returns / for root path', () => {
    expect(getPathname('https://example.com/')).toBe('/');
  });

  it('returns / for URL without path', () => {
    expect(getPathname('https://example.com')).toBe('/');
  });

  it('excludes query string', () => {
    expect(getPathname('https://example.com/path?query=1')).toBe('/path');
  });

  it('excludes hash fragment', () => {
    expect(getPathname('https://example.com/path#section')).toBe('/path');
  });

  it('returns empty string for invalid URL', () => {
    expect(getPathname('not-a-url')).toBe('');
  });
});

describe('getExtensionFromUrl', () => {
  describe('standard URLs', () => {
    it('extracts .jpg extension', () => {
      expect(getExtensionFromUrl('https://example.com/image.jpg')).toBe('.jpg');
    });

    it('extracts .png extension', () => {
      expect(getExtensionFromUrl('https://example.com/image.png')).toBe('.png');
    });

    it('extracts .gif extension', () => {
      expect(getExtensionFromUrl('https://example.com/image.gif')).toBe('.gif');
    });

    it('extracts .webp extension', () => {
      expect(getExtensionFromUrl('https://example.com/image.webp')).toBe('.webp');
    });

    it('lowercases uppercase extensions', () => {
      expect(getExtensionFromUrl('https://example.com/image.JPG')).toBe('.jpg');
      expect(getExtensionFromUrl('https://example.com/image.PNG')).toBe('.png');
    });
  });

  describe('data URLs', () => {
    it('extracts extension from data:image/png', () => {
      expect(getExtensionFromUrl('data:image/png;base64,abc')).toBe('.png');
    });

    it('extracts .jpg from data:image/jpeg', () => {
      expect(getExtensionFromUrl('data:image/jpeg;base64,abc')).toBe('.jpg');
    });

    it('extracts extension from data:image/gif', () => {
      expect(getExtensionFromUrl('data:image/gif;base64,abc')).toBe('.gif');
    });

    it('extracts extension from data:image/webp', () => {
      expect(getExtensionFromUrl('data:image/webp;base64,abc')).toBe('.webp');
    });
  });

  describe('query parameter hints', () => {
    it('extracts from format query param', () => {
      expect(getExtensionFromUrl('https://example.com/image?format=png')).toBe('.png');
    });

    it('extracts from f query param', () => {
      expect(getExtensionFromUrl('https://example.com/image?f=webp')).toBe('.webp');
    });

    it('extracts from type query param', () => {
      expect(getExtensionFromUrl('https://example.com/image?type=gif')).toBe('.gif');
    });

    it('normalizes jpeg to jpg', () => {
      expect(getExtensionFromUrl('https://example.com/image?format=jpeg')).toBe('.jpg');
    });
  });

  describe('edge cases', () => {
    it('returns empty for URL without extension', () => {
      expect(getExtensionFromUrl('https://example.com/image')).toBe('');
    });

    it('returns empty for null', () => {
      expect(getExtensionFromUrl(null)).toBe('');
    });

    it('returns empty for undefined', () => {
      expect(getExtensionFromUrl(undefined)).toBe('');
    });

    it('returns empty for empty string', () => {
      expect(getExtensionFromUrl('')).toBe('');
    });

    it('handles URLs with query strings after extension', () => {
      expect(getExtensionFromUrl('https://example.com/image.jpg?size=large')).toBe('.jpg');
    });
  });
});

describe('isDataUrl', () => {
  it('returns true for data: URLs', () => {
    expect(isDataUrl('data:image/png;base64,abc')).toBe(true);
  });

  it('returns true for data text URLs', () => {
    expect(isDataUrl('data:text/plain,hello')).toBe(true);
  });

  it('returns false for http URLs', () => {
    expect(isDataUrl('https://example.com/image.jpg')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isDataUrl(null)).toBeFalsy();
  });

  it('returns false for undefined', () => {
    expect(isDataUrl(undefined)).toBeFalsy();
  });
});

describe('isBlobUrl', () => {
  it('returns true for blob: URLs', () => {
    expect(isBlobUrl('blob:https://example.com/12345-67890')).toBe(true);
  });

  it('returns false for http URLs', () => {
    expect(isBlobUrl('https://example.com/image.jpg')).toBe(false);
  });

  it('returns false for data URLs', () => {
    expect(isBlobUrl('data:image/png;base64,abc')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isBlobUrl(null)).toBeFalsy();
  });

  it('returns false for undefined', () => {
    expect(isBlobUrl(undefined)).toBeFalsy();
  });
});

describe('sanitizeForFilename', () => {
  it('removes < character', () => {
    expect(sanitizeForFilename('file<name')).toBe('file_name');
  });

  it('removes > character', () => {
    expect(sanitizeForFilename('file>name')).toBe('file_name');
  });

  it('removes : character', () => {
    expect(sanitizeForFilename('file:name')).toBe('file_name');
  });

  it('removes " character', () => {
    expect(sanitizeForFilename('file"name')).toBe('file_name');
  });

  it('removes / character', () => {
    expect(sanitizeForFilename('file/name')).toBe('file_name');
  });

  it('removes \\ character', () => {
    expect(sanitizeForFilename('file\\name')).toBe('file_name');
  });

  it('removes | character', () => {
    expect(sanitizeForFilename('file|name')).toBe('file_name');
  });

  it('removes ? character', () => {
    expect(sanitizeForFilename('file?name')).toBe('file_name');
  });

  it('removes * character', () => {
    expect(sanitizeForFilename('file*name')).toBe('file_name');
  });

  it('replaces multiple invalid characters', () => {
    expect(sanitizeForFilename('a<b>c:d"e')).toBe('a_b_c_d_e');
  });

  it('preserves valid characters', () => {
    expect(sanitizeForFilename('valid-file_name.jpg')).toBe('valid-file_name.jpg');
  });

  it('returns empty for empty string', () => {
    expect(sanitizeForFilename('')).toBe('');
  });

  it('returns empty for null', () => {
    expect(sanitizeForFilename(null)).toBe('');
  });
});
