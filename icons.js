// icons.js - Reusable icon system using Heroicons
// SVGs are stored as path data only (without wrapper) for flexibility

const ICONS = {
  // Download/Upload
  'download': 'M3 16.5V18.75C3 19.9926 4.00736 21 5.25 21H18.75C19.9926 21 21 19.9926 21 18.75V16.5M16.5 12L12 16.5M12 16.5L7.5 12M12 16.5V3',
  'upload': 'M3 16.5V18.75C3 19.9926 4.00736 21 5.25 21H18.75C19.9926 21 21 19.9926 21 18.75V16.5M7.5 7.5L12 3M12 3L16.5 7.5M12 3V16.5',

  // Actions
  'trash': 'M14.7404 9L14.3942 18M9.60577 18L9.25962 9M19.2276 5.79057C19.5696 5.84221 19.9104 5.89747 20.25 5.95629M19.2276 5.79057L18.1598 19.6726C18.0696 20.8448 17.0921 21.75 15.9164 21.75H8.08357C6.90786 21.75 5.93037 20.8448 5.8402 19.6726L4.77235 5.79057M19.2276 5.79057C18.0812 5.61744 16.9215 5.48485 15.75 5.39432M3.75 5.95629C4.08957 5.89747 4.43037 5.84221 4.77235 5.79057M4.77235 5.79057C5.91878 5.61744 7.07849 5.48485 8.25 5.39432M15.75 5.39432V4.47819C15.75 3.29882 14.8393 2.31423 13.6606 2.27652C13.1092 2.25889 12.5556 2.25 12 2.25C11.4444 2.25 10.8908 2.25889 10.3394 2.27652C9.16065 2.31423 8.25 3.29882 8.25 4.47819V5.39432M15.75 5.39432C14.5126 5.2987 13.262 5.25 12 5.25C10.738 5.25 9.48744 5.2987 8.25 5.39432',
  'plus': 'M12 4.5V19.5M19.5 12L4.5 12',
  'minus': 'M19.5 12L4.5 12',
  'x-mark': 'M6 18L18 6M6 6L18 18',
  'check': 'M4.5 12.75L10.5 18.75L19.5 5.25',
  'pencil': 'M16.8617 4.48667L18.5492 2.79917C19.2814 2.06694 20.4686 2.06694 21.2008 2.79917C21.9331 3.53141 21.9331 4.71859 21.2008 5.45083L10.5822 16.0695C10.0535 16.5981 9.40144 16.9868 8.68489 17.2002L6 18L6.79978 15.3151C7.01323 14.5986 7.40185 13.9465 7.93052 13.4178L16.8617 4.48667ZM16.8617 4.48667L19.5 7.12499',

  // Folders/Groups
  'folder-plus': 'M12 10.5V16.5M15 13.5H9M13.0607 6.31066L10.9393 4.18934C10.658 3.90804 10.2765 3.75 9.87868 3.75H4.5C3.25736 3.75 2.25 4.75736 2.25 6V18C2.25 19.2426 3.25736 20.25 4.5 20.25H19.5C20.7426 20.25 21.75 19.2426 21.75 18V9C21.75 7.75736 20.7426 6.75 19.5 6.75H14.1213C13.7235 6.75 13.342 6.59197 13.0607 6.31066Z',
  'folder': 'M2.25 12.75V12C2.25 10.7574 3.25736 9.75 4.5 9.75H19.5C20.7426 9.75 21.75 10.7574 21.75 12V12.75M13.0607 6.31066L10.9393 4.18934C10.658 3.90804 10.2765 3.75 9.87868 3.75H4.5C3.25736 3.75 2.25 4.75736 2.25 6V18C2.25 19.2426 3.25736 20.25 4.5 20.25H19.5C20.7426 20.25 21.75 19.2426 21.75 18V9C21.75 7.75736 20.7426 6.75 19.5 6.75H14.1213C13.7235 6.75 13.342 6.59197 13.0607 6.31066Z',
  'rectangle-group': 'M2.25 7.125C2.25 6.50368 2.75368 6 3.375 6H6.375C6.99632 6 7.5 6.50368 7.5 7.125V10.125C7.5 10.7463 6.99632 11.25 6.375 11.25H3.375C2.75368 11.25 2.25 10.7463 2.25 10.125V7.125ZM14.25 7.125C14.25 6.50368 14.7537 6 15.375 6H20.625C21.2463 6 21.75 6.50368 21.75 7.125V10.125C21.75 10.7463 21.2463 11.25 20.625 11.25H15.375C14.7537 11.25 14.25 10.7463 14.25 10.125V7.125ZM2.25 16.125C2.25 15.5037 2.75368 15 3.375 15H8.625C9.24632 15 9.75 15.5037 9.75 16.125V16.875C9.75 17.4963 9.24632 18 8.625 18H3.375C2.75368 18 2.25 17.4963 2.25 16.875V16.125ZM14.25 13.875C14.25 13.2537 14.7537 12.75 15.375 12.75H20.625C21.2463 12.75 21.75 13.2537 21.75 13.875V16.875C21.75 17.4963 21.2463 18 20.625 18H15.375C14.7537 18 14.25 17.4963 14.25 16.875V13.875Z',

  // View modes
  'list': 'M3.75 6.75H20.25M3.75 12H20.25M3.75 17.25H20.25',
  'grid': 'M3.75 6C3.75 4.75736 4.75736 3.75 6 3.75H8.25C9.49264 3.75 10.5 4.75736 10.5 6V8.25C10.5 9.49264 9.49264 10.5 8.25 10.5H6C4.75736 10.5 3.75 9.49264 3.75 8.25V6ZM3.75 15.75C3.75 14.5074 4.75736 13.5 6 13.5H8.25C9.49264 13.5 10.5 14.5074 10.5 15.75V18C10.5 19.2426 9.49264 20.25 8.25 20.25H6C4.75736 20.25 3.75 19.2426 3.75 18V15.75ZM13.5 6C13.5 4.75736 14.5074 3.75 15.75 3.75H18C19.2426 3.75 20.25 4.75736 20.25 6V8.25C20.25 9.49264 19.2426 10.5 18 10.5H15.75C14.5074 10.5 13.5 9.49264 13.5 8.25V6ZM13.5 15.75C13.5 14.5074 14.5074 13.5 15.75 13.5H18C19.2426 13.5 20.25 14.5074 20.25 15.75V18C20.25 19.2426 19.2426 20.25 18 20.25H15.75C14.5074 20.25 13.5 19.2426 13.5 18V15.75Z',

  // Selection
  'check-circle': 'M9 12.75L11.25 15L15 9.75M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z',
  'x-circle': 'M9.75 9.75L14.25 14.25M14.25 9.75L9.75 14.25M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z',

  // Info/Help
  'question-mark-circle': 'M9.87891 7.51884C11.0505 6.49372 12.95 6.49372 14.1215 7.51884C15.2931 8.54397 15.2931 10.206 14.1215 11.2312C13.9176 11.4096 13.6917 11.5569 13.4513 11.6733C12.7056 12.0341 12.0002 12.6716 12.0002 13.5V14.25M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM12 17.25H12.0075V17.2575H12V17.25Z',
  'information-circle': 'M11.25 11.25L11.2915 11.2293C11.8646 10.9427 12.5099 11.4603 12.3545 12.082L11.6455 14.918C11.4901 15.5397 12.1354 16.0573 12.7085 15.7707L12.75 15.75M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM12 8.25H12.0075V8.2575H12V8.25Z',
  'exclamation-circle': 'M12 9V12.75M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM12 15.75H12.0075V15.8175H12V15.75Z',

  // Navigation
  'arrow-right': 'M13.5 4.5L21 12M21 12L13.5 19.5M21 12H3',
  'arrow-left': 'M10.5 19.5L3 12M3 12L10.5 4.5M3 12H21',
  'arrow-up': 'M4.5 10.5L12 3M12 3L19.5 10.5M12 3V21',
  'arrow-down': 'M19.5 13.5L12 21M12 21L4.5 13.5M12 21V3',
  'chevron-right': 'M8.25 4.5L15.75 12L8.25 19.5',
  'chevron-left': 'M15.75 19.5L8.25 12L15.75 4.5',
  'chevron-down': 'M19.5 8.25L12 15.75L4.5 8.25',
  'chevron-up': 'M4.5 15.75L12 8.25L19.5 15.75',

  // Window/UI
  'arrow-top-right-on-square': 'M13.5 6H5.25C4.00736 6 3 7.00736 3 8.25V18.75C3 19.9926 4.00736 21 5.25 21H15.75C16.9926 21 18 19.9926 18 18.75V10.5M7.5 16.5L21 3M21 3H15.75M21 3V8.25',
  'arrows-pointing-out': 'M3.75 3.75V8.25M3.75 3.75H8.25M3.75 3.75L9 9M3.75 20.25V15.75M3.75 20.25H8.25M3.75 20.25L9 15M20.25 3.75H15.75M20.25 3.75V8.25M20.25 3.75L15 9M20.25 20.25H15.75M20.25 20.25V15.75M20.25 20.25L15 15',

  // Magnifying glass / Search
  'magnifying-glass': 'M21 21L15.8033 15.8033M15.8033 15.8033C17.1605 14.4461 18 12.5711 18 10.5C18 6.35786 14.6421 3 10.5 3C6.35786 3 3 6.35786 3 10.5C3 14.6421 6.35786 18 10.5 18C12.5711 18 14.4461 17.1605 15.8033 15.8033Z',
  'magnifying-glass-plus': 'M21 21L15.8033 15.8033M15.8033 15.8033C17.1605 14.4461 18 12.5711 18 10.5C18 6.35786 14.6421 3 10.5 3C6.35786 3 3 6.35786 3 10.5C3 14.6421 6.35786 18 10.5 18C12.5711 18 14.4461 17.1605 15.8033 15.8033ZM10.5 7.5V13.5M13.5 10.5H7.5',

  // Misc
  'cog-6-tooth': 'M9.59375 3.94531C9.68872 3.39994 10.1591 3 10.7143 3H13.2857C13.8409 3 14.3113 3.39994 14.4063 3.94531L14.6203 5.17755C14.6876 5.56484 14.9504 5.8883 15.3054 6.06688C15.3953 6.11209 15.4841 6.15916 15.572 6.20805C15.9195 6.40175 16.3393 6.43992 16.7034 6.28246L17.8559 5.78486C18.3649 5.56517 18.957 5.74685 19.2512 6.21634L20.5369 8.28366C20.8311 8.75315 20.7347 9.36772 20.3098 9.72048L19.3409 10.5246C19.0466 10.7688 18.9041 11.1529 18.9252 11.5418C18.9304 11.6362 18.9331 11.7312 18.9331 11.8268V12.1732C18.9331 12.2688 18.9304 12.3638 18.9252 12.4582C18.9041 12.8471 19.0466 13.2312 19.3409 13.4754L20.3098 14.2795C20.7347 14.6323 20.8311 15.2469 20.5369 15.7163L19.2512 17.7837C18.957 18.2531 18.3649 18.4348 17.8559 18.2151L16.7034 17.7175C16.3393 17.5601 15.9195 17.5982 15.572 17.792C15.4841 17.8408 15.3953 17.8879 15.3054 17.9331C14.9504 18.1117 14.6876 18.4352 14.6203 18.8225L14.4063 20.0547C14.3113 20.6001 13.8409 21 13.2857 21H10.7143C10.1591 21 9.68872 20.6001 9.59375 20.0547L9.37969 18.8225C9.31243 18.4352 9.04957 18.1117 8.69459 17.9331C8.60472 17.8879 8.51592 17.8408 8.42805 17.792C8.08054 17.5982 7.66066 17.5601 7.29661 17.7175L6.14407 18.2151C5.63508 18.4348 5.04296 18.2531 4.74877 17.7837L3.46309 15.7163C3.1689 15.2469 3.26527 14.6323 3.69024 14.2795L4.65913 13.4754C4.95337 13.2312 5.09593 12.8471 5.07479 12.4582C5.06956 12.3638 5.06693 12.2688 5.06693 12.1732V11.8268C5.06693 11.7312 5.06956 11.6362 5.07479 11.5418C5.09593 11.1529 4.95337 10.7688 4.65913 10.5246L3.69024 9.72048C3.26527 9.36772 3.1689 8.75315 3.46309 8.28366L4.74877 6.21634C5.04296 5.74685 5.63508 5.56517 6.14407 5.78486L7.29661 6.28246C7.66066 6.43992 8.08054 6.40175 8.42805 6.20805C8.51592 6.15916 8.60472 6.11209 8.69459 6.06688C9.04957 5.8883 9.31243 5.56484 9.37969 5.17755L9.59375 3.94531ZM15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z',
  'photo': 'M2.25 15.75L7.40901 10.591C8.28769 9.71231 9.71231 9.71231 10.591 10.591L15.75 15.75M14.25 14.25L15.659 12.841C16.5377 11.9623 17.9623 11.9623 18.841 12.841L21.75 15.75M3.75 19.5H20.25C21.0784 19.5 21.75 18.8284 21.75 18V6C21.75 5.17157 21.0784 4.5 20.25 4.5H3.75C2.92157 4.5 2.25 5.17157 2.25 6V18C2.25 18.8284 2.92157 19.5 3.75 19.5ZM14.25 8.25H14.2575V8.2575H14.25V8.25ZM14.625 8.25C14.625 8.45711 14.4571 8.625 14.25 8.625C14.0429 8.625 13.875 8.45711 13.875 8.25C13.875 8.04289 14.0429 7.875 14.25 7.875C14.4571 7.875 14.625 8.04289 14.625 8.25Z',

  // Arrow into group
  'arrow-right-end-on-rectangle': 'M15.75 9V5.25C15.75 4.00736 14.7426 3 13.5 3L7.5 3C6.25736 3 5.25 4.00736 5.25 5.25L5.25 18.75C5.25 19.9926 6.25736 21 7.5 21H13.5C14.7426 21 15.75 19.9926 15.75 18.75V15M18.75 15L21.75 12M21.75 12L18.75 9M21.75 12L9 12',
};

/**
 * Get icon size based on current UI scale setting from CSS variables
 * @param {string} size - Size category: 'sm', 'md', or 'lg'
 * @returns {number} Icon size in pixels
 */
function getDensityIconSize(size) {
  const root = document.documentElement;
  const sizeVar = size === 'sm' ? '--icon-size-sm' : size === 'lg' ? '--icon-size-lg' : '--icon-size-md';
  const computedSize = getComputedStyle(root).getPropertyValue(sizeVar).trim();
  return parseInt(computedSize, 10) || (size === 'sm' ? 14 : size === 'lg' ? 20 : 16);
}

/**
 * Creates an SVG element from icon path data
 * @param {string} name - Icon name from ICONS registry
 * @param {object} options - Optional settings
 * @param {number} options.size - Icon size in pixels (default: 16)
 * @param {string} options.className - Additional CSS classes
 * @param {string} options.strokeWidth - SVG stroke width (default: 1.5)
 * @returns {SVGElement}
 */
function createIcon(name, options) {
  options = options || {};
  const size = options.size || 16;
  const className = options.className || '';
  const strokeWidth = options.strokeWidth || 1.5;

  const pathData = ICONS[name];
  if (!pathData) {
    console.warn('Icon not found:', name);
    return document.createElement('span');
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('icon');
  if (className) {
    className.split(' ').forEach(function(cls) {
      if (cls) svg.classList.add(cls);
    });
  }

  // Handle multi-path icons (paths separated by 'Z' followed by 'M')
  const paths = pathData.split(/(?<=Z)(?=M)/);
  paths.forEach(function(d) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', strokeWidth);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  });

  return svg;
}

/**
 * Creates an icon-only button
 * @param {string} iconName - Icon name from ICONS registry
 * @param {object} options - Button options
 * @param {string} options.title - Tooltip text (required for accessibility)
 * @param {string} options.variant - Button variant: 'default', 'primary', 'danger', 'success', 'ghost'
 * @param {string} options.size - Button size: 'sm', 'md', 'lg'
 * @param {boolean} options.disabled - Whether button is disabled
 * @param {string} options.className - Additional CSS classes
 * @param {function} options.onClick - Click handler
 * @returns {HTMLButtonElement}
 */
function createIconButton(iconName, options) {
  options = options || {};
  const title = options.title || '';
  const variant = options.variant || 'default';
  const size = options.size || 'md';
  const disabled = options.disabled || false;
  const className = options.className || '';
  const onClick = options.onClick;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-btn icon-btn--' + variant + ' icon-btn--' + size;
  if (className) {
    className.split(' ').forEach(function(cls) {
      if (cls) button.classList.add(cls);
    });
  }
  button.disabled = disabled;
  button.title = title;
  button.setAttribute('aria-label', title);

  const iconSize = getDensityIconSize(size);
  button.appendChild(createIcon(iconName, { size: iconSize }));

  if (onClick) {
    button.addEventListener('click', onClick);
  }

  return button;
}

/**
 * Creates a button with icon and optional text label
 * @param {string} iconName - Icon name from ICONS registry
 * @param {string} label - Button text (can be empty for icon-only)
 * @param {object} options - Button options (same as createIconButton plus:)
 * @param {string} options.iconPosition - 'left' or 'right' (default: 'left')
 * @returns {HTMLButtonElement}
 */
function createButton(iconName, label, options) {
  options = options || {};
  const title = options.title || label || '';
  const variant = options.variant || 'default';
  const size = options.size || 'md';
  const disabled = options.disabled || false;
  const className = options.className || '';
  const iconPosition = options.iconPosition || 'left';
  const onClick = options.onClick;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn--' + variant + ' btn--' + size;
  if (!label) {
    button.classList.add('btn--icon-only');
  }
  if (className) {
    className.split(' ').forEach(function(cls) {
      if (cls) button.classList.add(cls);
    });
  }
  button.disabled = disabled;
  if (title && title !== label) {
    button.title = title;
  }
  button.setAttribute('aria-label', title);

  const iconSize = getDensityIconSize(size);
  const icon = createIcon(iconName, { size: iconSize });

  if (iconPosition === 'right' && label) {
    const span = document.createElement('span');
    span.textContent = label;
    button.appendChild(span);
    button.appendChild(icon);
  } else {
    button.appendChild(icon);
    if (label) {
      const span = document.createElement('span');
      span.textContent = label;
      button.appendChild(span);
    }
  }

  if (onClick) {
    button.addEventListener('click', onClick);
  }

  return button;
}

/**
 * Creates an info icon with tooltip behavior
 * @param {string} tooltipText - Text to show in tooltip
 * @returns {HTMLSpanElement}
 */
function createInfoIcon(tooltipText) {
  const wrapper = document.createElement('span');
  wrapper.className = 'info-icon-wrapper';
  wrapper.setAttribute('data-tooltip', tooltipText);

  const icon = createIcon('question-mark-circle', { size: 14 });
  icon.classList.add('info-icon');
  wrapper.appendChild(icon);

  return wrapper;
}

/**
 * Replaces an element's text content with an icon
 * @param {HTMLElement} element - Element to modify
 * @param {string} iconName - Icon name
 * @param {object} options - Icon options
 */
function setElementIcon(element, iconName, options) {
  element.innerHTML = '';
  element.appendChild(createIcon(iconName, options));
}

// Export for use in popup.js
window.Icons = {
  ICONS: ICONS,
  getDensityIconSize: getDensityIconSize,
  createIcon: createIcon,
  createIconButton: createIconButton,
  createButton: createButton,
  createInfoIcon: createInfoIcon,
  setElementIcon: setElementIcon
};
