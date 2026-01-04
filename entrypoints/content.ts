import type { ImageItem, Group } from '@/types';
import { ungroupedStorage, groupsStorage } from '@/lib/storage';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    console.log('[ContentScript] Content script loaded');

    // Track active elements
    let activeButtons: HTMLButtonElement[] = [];
    let activeDropdown: HTMLDivElement | null = null;
    let activeContainer: HTMLDivElement | null = null;
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;

    // Use WXT storage for consistent key format across all contexts

    // Load ungrouped images from storage
    async function loadUngrouped(): Promise<ImageItem[]> {
      return (await ungroupedStorage.getValue()) || [];
    }

    // Save ungrouped images to storage
    async function saveUngrouped(ungrouped: ImageItem[]): Promise<void> {
      console.log('[ContentScript] Saving ungrouped:', ungrouped.length);
      await ungroupedStorage.setValue(ungrouped);
      console.log('[ContentScript] Saved ungrouped successfully');
    }

    // Load groups from storage
    async function loadGroups(): Promise<Group[]> {
      return (await groupsStorage.getValue()) || [];
    }

    // Save groups to storage
    async function saveGroups(groups: Group[]): Promise<void> {
      console.log('[ContentScript] Saving groups:', groups.length);
      await groupsStorage.setValue(groups);
      console.log('[ContentScript] Saved groups successfully');
    }

    // Extract filename and extension from URL
    function getFilenameFromUrl(url: string): { filename: string; extension: string } {
      let filename = '';
      let extension = '';

      try {
        if (url.startsWith('data:image/')) {
          const mimeMatch = url.match(/^data:image\/(\w+)/);
          extension = mimeMatch ? '.' + mimeMatch[1].replace('jpeg', 'jpg') : '.png';
          filename = 'image';
        } else {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          const lastSegment = pathname.split('/').pop() || '';

          const extMatch = lastSegment.match(/\.(\w+)$/);
          if (extMatch) {
            extension = '.' + extMatch[1].toLowerCase();
            filename = lastSegment.slice(0, -extension.length);
          } else {
            filename = lastSegment || 'image';
            extension = '.jpg';
          }
        }
      } catch {
        filename = 'image';
        extension = '.jpg';
      }

      if (!filename) filename = 'image';
      if (!extension) extension = '.jpg';

      return { filename, extension };
    }

    // Create an ImageItem from a URL
    function createImageItem(url: string): ImageItem {
      const { filename, extension } = getFilenameFromUrl(url);
      return {
        url,
        filename,
        extension,
        source: 'content-script',
        addedAt: Date.now(),
      };
    }

    // Check if URL already exists in ungrouped or any group
    function urlExists(url: string, ungrouped: ImageItem[], groups: Group[]): boolean {
      if (ungrouped.some((img) => img.url === url)) return true;
      if (groups.some((g) => g.images.some((img) => img.url === url))) return true;
      return false;
    }

    // Add image to ungrouped or a specific group
    async function addImage(url: string, groupId: string | null): Promise<boolean> {
      console.log('[ContentScript] addImage called:', {
        url: url.substring(0, 50) + '...',
        groupId,
      });

      const [ungrouped, groups] = await Promise.all([loadUngrouped(), loadGroups()]);
      console.log('[ContentScript] Current state:', {
        ungroupedCount: ungrouped.length,
        groupsCount: groups.length,
      });

      // Check if already exists
      if (urlExists(url, ungrouped, groups)) {
        console.log('[ContentScript] Image already exists, skipping');
        return false; // Already exists
      }

      const imageItem = createImageItem(url);
      console.log('[ContentScript] Created imageItem:', imageItem);

      if (groupId) {
        // Add to specific group
        const updatedGroups = groups.map((g) =>
          g.id === groupId ? { ...g, images: [...g.images, imageItem] } : g
        );
        console.log('[ContentScript] Saving to group:', groupId);
        await saveGroups(updatedGroups);
        console.log('[ContentScript] Groups saved successfully');
      } else {
        // Add to ungrouped
        const newUngrouped = [...ungrouped, imageItem];
        console.log('[ContentScript] Saving to ungrouped, new count:', newUngrouped.length);
        await saveUngrouped(newUngrouped);
        console.log('[ContentScript] Ungrouped saved successfully');
      }

      return true;
    }

    // Clear any pending hide timeout
    function clearHideTimeout(): void {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    }

    // Remove all active buttons and dropdown
    function removeActiveButtons(): void {
      clearHideTimeout();

      activeButtons.forEach((btn) => {
        if (btn && btn.parentNode) {
          btn.parentNode.removeChild(btn);
        }
      });
      activeButtons = [];

      if (activeContainer && activeContainer.parentNode) {
        activeContainer.parentNode.removeChild(activeContainer);
      }
      activeContainer = null;
      activeDropdown = null;
    }

    // Create and position a button near an image
    function createButton(
      text: string,
      onClick: (btn: HTMLButtonElement) => void
    ): HTMLButtonElement {
      const button = document.createElement('button');
      button.textContent = text;
      button.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        z-index: 2147483647;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: background 0.2s;
        white-space: nowrap;
      `;

      button.addEventListener('mouseenter', () => {
        button.style.background = 'rgba(0, 0, 0, 0.95)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.background = 'rgba(0, 0, 0, 0.8)';
      });

      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(button);
      });

      return button;
    }

    // Position buttons relative to image (using fixed positioning)
    function positionButtons(buttons: HTMLButtonElement[], img: HTMLImageElement): void {
      const rect = img.getBoundingClientRect();
      const gap = 8;
      let currentTop = rect.top + 5;

      buttons.forEach((button) => {
        button.style.top = `${currentTop}px`;
        button.style.left = `${rect.left + 5}px`;
        document.body.appendChild(button);
        currentTop += button.offsetHeight + gap;
      });
    }

    // Create the group dropdown menu
    function createGroupDropdown(imgSrc: string): HTMLDivElement {
      const dropdown = document.createElement('div');
      dropdown.style.cssText = `
        position: fixed;
        background: #1a1a1a;
        border-radius: 6px;
        z-index: 2147483647;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        min-width: 140px;
        overflow: hidden;
        opacity: 0;
        transform: translateY(-5px);
        transition: opacity 0.15s, transform 0.15s;
      `;

      // Header
      const header = document.createElement('div');
      header.textContent = 'Add to Group';
      header.style.cssText = `
        padding: 8px 12px;
        color: #888;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid #333;
      `;
      dropdown.appendChild(header);

      // Load groups and populate
      loadGroups().then((groups) => {
        if (groups.length === 0) {
          const noGroups = document.createElement('div');
          noGroups.textContent = 'No groups yet';
          noGroups.style.cssText = `
            padding: 10px 12px;
            color: #666;
            font-style: italic;
          `;
          dropdown.appendChild(noGroups);
        } else {
          groups.forEach((group) => {
            const item = document.createElement('div');
            item.style.cssText = `
              padding: 8px 12px;
              color: #fff;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 8px;
              transition: background 0.15s;
            `;

            const colorDot = document.createElement('span');
            colorDot.style.cssText = `
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: ${group.color};
              flex-shrink: 0;
            `;
            item.appendChild(colorDot);

            const name = document.createElement('span');
            name.textContent = group.name;
            name.style.cssText = `
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `;
            item.appendChild(name);

            item.addEventListener('mouseenter', () => {
              item.style.background = '#333';
            });
            item.addEventListener('mouseleave', () => {
              item.style.background = 'transparent';
            });

            item.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              addImageToGroup(imgSrc, group.id, item);
            });

            dropdown.appendChild(item);
          });
        }

        // Animate in
        requestAnimationFrame(() => {
          dropdown.style.opacity = '1';
          dropdown.style.transform = 'translateY(0)';
        });
      });

      return dropdown;
    }

    // Add image to a specific group
    function addImageToGroup(imgSrc: string, groupId: string, itemEl: HTMLElement): void {
      addImage(imgSrc, groupId)
        .then((isNew: boolean) => {
          if (isNew) {
            itemEl.style.background = '#27ae60';
            const nameSpan = itemEl.querySelector('span:last-child');
            if (nameSpan) nameSpan.textContent = 'Added!';
          } else {
            itemEl.style.background = '#f39c12';
            const nameSpan = itemEl.querySelector('span:last-child');
            if (nameSpan) nameSpan.textContent = 'Already added';
          }
          setTimeout(() => removeActiveButtons(), 800);
        })
        .catch((error: Error) => {
          console.error('Error adding to group:', error);
          itemEl.style.background = '#e74c3c';
        });
    }

    // Show buttons for an image
    function showButtonsForImage(img: HTMLImageElement): void {
      const buttons: HTMLButtonElement[] = [];
      const imgSrc = img.src;
      const parentAnchor = img.closest('a');
      const hasLink = parentAnchor && parentAnchor.href;
      const hasImageSrc = imgSrc && imgSrc.startsWith('http');

      // Always show "Add to Ungrouped" if image has a valid src
      if (hasImageSrc) {
        const addButton = createButton('+ Ungrouped', (btn) => {
          addImage(imgSrc, null)
            .then((isNew: boolean) => {
              if (isNew) {
                btn.textContent = 'Added!';
                btn.style.background = '#27ae60';
              } else {
                btn.textContent = 'Already added';
                btn.style.background = '#f39c12';
              }
              setTimeout(() => removeActiveButtons(), 800);
            })
            .catch((error: Error) => {
              console.error('Error adding to list:', error);
              btn.textContent = 'Error!';
              btn.style.background = '#e74c3c';
            });
        });
        buttons.push(addButton);

        // Add "Add to Group" button with dropdown container
        const groupButton = createButton('+ Group ▾', (btn) => {
          // Toggle dropdown
          if (activeDropdown) {
            if (activeContainer && activeContainer.parentNode) {
              activeContainer.parentNode.removeChild(activeContainer);
            }
            activeContainer = null;
            activeDropdown = null;
            return;
          }

          const rect = btn.getBoundingClientRect();

          // Create a container that wraps both button area and dropdown
          const container = document.createElement('div');
          container.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            z-index: 2147483647;
          `;

          // Create the dropdown
          const dropdown = createGroupDropdown(imgSrc);
          dropdown.style.position = 'absolute';
          dropdown.style.top = rect.height - 2 + 'px';
          dropdown.style.left = '0px';

          container.appendChild(dropdown);
          document.body.appendChild(container);

          activeContainer = container;
          activeDropdown = dropdown;

          // Add hover handlers to container for robust hover detection
          container.addEventListener('mouseenter', clearHideTimeout);
          container.addEventListener('mouseleave', () => {
            hideTimeout = setTimeout(() => {
              if (activeContainer && activeContainer.parentNode) {
                activeContainer.parentNode.removeChild(activeContainer);
              }
              activeContainer = null;
              activeDropdown = null;
            }, 150);
          });
        });
        buttons.push(groupButton);
      }

      // Show "Follow Link" if image is wrapped in an anchor
      if (hasLink && parentAnchor) {
        const linkUrl = parentAnchor.href;
        const followButton = createButton('Follow Link', () => {
          browser.runtime
            .sendMessage({
              action: 'openPopup',
              url: linkUrl,
            })
            .catch((error: Error) => {
              console.error('Error following link:', error);
            });
        });
        buttons.push(followButton);
      }

      if (buttons.length > 0) {
        positionButtons(buttons, img);
        activeButtons = buttons;
      }
    }

    // Extract background image URL from element's computed style
    function getBackgroundImageUrl(element: HTMLElement): string | null {
      const style = window.getComputedStyle(element);
      const bgImage = style.backgroundImage;

      if (!bgImage || bgImage === 'none') return null;

      // Extract URL from url("...")
      const match = bgImage.match(/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/i);
      return match?.[1] ?? null;
    }

    // Find parent anchor element
    function getParentAnchor(element: HTMLElement): HTMLAnchorElement | null {
      let current: HTMLElement | null = element;
      while (current) {
        if (current.tagName === 'A' && (current as HTMLAnchorElement).href) {
          return current as HTMLAnchorElement;
        }
        current = current.parentElement;
      }
      return null;
    }

    // Show buttons for an element with a background image
    function showButtonsForBackgroundImage(element: HTMLElement, bgUrl: string): void {
      const buttons: HTMLButtonElement[] = [];
      const parentAnchor = getParentAnchor(element);
      const hasLink = parentAnchor && parentAnchor.href;

      // "Add to Ungrouped" for the background image
      const addButton = createButton('+ Ungrouped', (btn) => {
        addImage(bgUrl, null)
          .then((isNew: boolean) => {
            if (isNew) {
              btn.textContent = 'Added!';
              btn.style.background = '#27ae60';
            } else {
              btn.textContent = 'Already added';
              btn.style.background = '#f39c12';
            }
            setTimeout(() => removeActiveButtons(), 800);
          })
          .catch((error: Error) => {
            console.error('Error adding to list:', error);
            btn.textContent = 'Error!';
            btn.style.background = '#e74c3c';
          });
      });
      buttons.push(addButton);

      // Add "Add to Group" button with dropdown
      const groupButton = createButton('+ Group ▾', (btn) => {
        if (activeDropdown) {
          if (activeContainer && activeContainer.parentNode) {
            activeContainer.parentNode.removeChild(activeContainer);
          }
          activeContainer = null;
          activeDropdown = null;
          return;
        }

        const rect = btn.getBoundingClientRect();
        const container = document.createElement('div');
        container.style.cssText = `
          position: fixed;
          top: ${rect.top}px;
          left: ${rect.left}px;
          z-index: 2147483647;
        `;

        const dropdown = createGroupDropdown(bgUrl);
        dropdown.style.position = 'absolute';
        dropdown.style.top = rect.height - 2 + 'px';
        dropdown.style.left = '0px';

        container.appendChild(dropdown);
        document.body.appendChild(container);

        activeContainer = container;
        activeDropdown = dropdown;

        container.addEventListener('mouseenter', clearHideTimeout);
        container.addEventListener('mouseleave', () => {
          hideTimeout = setTimeout(() => {
            if (activeContainer && activeContainer.parentNode) {
              activeContainer.parentNode.removeChild(activeContainer);
            }
            activeContainer = null;
            activeDropdown = null;
          }, 150);
        });
      });
      buttons.push(groupButton);

      // "Follow Link" if wrapped in anchor
      if (hasLink && parentAnchor) {
        const linkUrl = parentAnchor.href;
        const followButton = createButton('Follow Link', () => {
          browser.runtime
            .sendMessage({
              action: 'openPopup',
              url: linkUrl,
            })
            .catch((error: Error) => {
              console.error('Error following link:', error);
            });
        });
        buttons.push(followButton);
      }

      if (buttons.length > 0) {
        // Position relative to the element (not an img)
        const rect = element.getBoundingClientRect();
        const gap = 8;
        let currentTop = rect.top + 5;

        buttons.forEach((button) => {
          button.style.top = `${currentTop}px`;
          button.style.left = `${rect.left + 5}px`;
          document.body.appendChild(button);
          currentTop += button.offsetHeight + gap;
        });

        activeButtons = buttons;
      }
    }

    // Handle mouseover on images and elements with background images
    function handleMouseOver(event: MouseEvent): void {
      const target = event.target as HTMLElement;

      // Handle IMG elements
      if (target.tagName === 'IMG') {
        const imgElement = target as HTMLImageElement;

        // Skip tiny images (likely icons)
        if (imgElement.width < 50 || imgElement.height < 50) return;

        // Remove any existing buttons first
        removeActiveButtons();

        // Show buttons for this image
        showButtonsForImage(imgElement);
        return;
      }

      // Handle elements with background images
      const bgUrl = getBackgroundImageUrl(target);
      if (bgUrl && bgUrl.startsWith('http')) {
        const rect = target.getBoundingClientRect();
        // Skip tiny elements (likely icons)
        if (rect.width < 50 || rect.height < 50) return;

        // Remove any existing buttons first
        removeActiveButtons();

        // Show buttons for this background image
        showButtonsForBackgroundImage(target, bgUrl);
      }
    }

    // Check if element is part of our UI
    function isPartOfUI(element: Element | null): boolean {
      if (!element) return false;
      if (activeButtons.includes(element as HTMLButtonElement)) return true;
      if (activeDropdown && (activeDropdown === element || activeDropdown.contains(element)))
        return true;
      if (activeContainer && (activeContainer === element || activeContainer.contains(element)))
        return true;
      return false;
    }

    // Handle mouseout - remove buttons when leaving image or background-image element
    function handleMouseOut(event: MouseEvent): void {
      const target = event.target as HTMLElement;

      // Only handle if this is an IMG or has a background image
      const isImg = target.tagName === 'IMG';
      const hasBgImage = !isImg && getBackgroundImageUrl(target);
      if (!isImg && !hasBgImage) return;

      const relatedTarget = event.relatedTarget as Element | null;

      // Don't remove if moving to one of the buttons, dropdown, or container
      if (isPartOfUI(relatedTarget)) return;

      // Use delayed removal for more reliable hover detection
      clearHideTimeout();
      hideTimeout = setTimeout(() => {
        // Check if mouse is still on any button, dropdown, or container
        const hoveringButton = activeButtons.some((btn) => {
          try {
            return btn.matches(':hover');
          } catch {
            return false;
          }
        });
        const hoveringDropdown =
          activeDropdown &&
          (() => {
            try {
              return activeDropdown!.matches(':hover');
            } catch {
              return false;
            }
          })();
        const hoveringContainer =
          activeContainer &&
          (() => {
            try {
              return activeContainer!.matches(':hover');
            } catch {
              return false;
            }
          })();

        if (hoveringButton || hoveringDropdown || hoveringContainer) return;
        removeActiveButtons();
      }, 200);
    }

    // Set up event listeners
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      removeActiveButtons();
    });
  },
});
