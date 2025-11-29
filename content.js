// content.js
(function() {
  // Track active elements
  let activeButtons = [];
  let activeDropdown = null;
  let activeContainer = null; // Container wrapping dropdown button + dropdown
  let hideTimeout = null; // Timeout for delayed hiding

  // Load the current navigation stack
  function loadNavigationStack() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('navigationStack', function(result) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.navigationStack || []);
        }
      });
    });
  }

  // Load groups from storage
  function loadGroups() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('groups', function(result) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.groups || []);
        }
      });
    });
  }

  // Save groups to storage
  function saveGroups(groups) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ groups: groups }, function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  // Save the updated navigation stack
  function saveNavigationStack(stack) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ navigationStack: stack }, function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  // Load URL metadata from storage
  function loadUrlMeta() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('urlMeta', function(result) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.urlMeta || {});
        }
      });
    });
  }

  // Save URL metadata to storage
  function saveUrlMeta(urlMeta) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ urlMeta: urlMeta }, function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  // Add image with source metadata
  function addImageWithMeta(url, source, groupId) {
    return Promise.all([loadNavigationStack(), loadUrlMeta(), loadGroups()]).then(([stack, urlMeta, groups]) => {
      const isNew = !stack.includes(url);

      if (isNew) {
        stack.push(url);
        // Store metadata about this URL
        urlMeta[url] = {
          source: source, // 'content-script', 'content-script-group', etc.
          addedAt: Date.now(),
          validated: true // Content script URLs are pre-validated (from actual img elements)
        };
      }

      // Add to group if specified
      if (groupId) {
        const group = groups.find(g => g.id === groupId);
        if (group && !group.urls.includes(url)) {
          group.urls.push(url);
        }
      }

      return Promise.all([
        saveNavigationStack(stack),
        saveUrlMeta(urlMeta),
        saveGroups(groups)
      ]).then(() => isNew);
    });
  }

  // Clear any pending hide timeout
  function clearHideTimeout() {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  // Remove all active buttons and dropdown
  function removeActiveButtons() {
    clearHideTimeout();

    activeButtons.forEach(btn => {
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
  function createButton(text, onClick) {
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

    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      onClick(button);
    });

    return button;
  }

  // Position buttons relative to image (using fixed positioning)
  function positionButtons(buttons, img) {
    const rect = img.getBoundingClientRect();
    const gap = 8;
    let currentTop = rect.top + 5;

    buttons.forEach(button => {
      button.style.top = `${currentTop}px`;
      button.style.left = `${rect.left + 5}px`;
      document.body.appendChild(button);
      currentTop += button.offsetHeight + gap;
    });
  }

  // Create the group dropdown menu
  function createGroupDropdown(imgSrc) {
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
    loadGroups().then(groups => {
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
        groups.forEach(group => {
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
  function addImageToGroup(imgSrc, groupId, itemEl) {
    addImageWithMeta(imgSrc, 'content-script-group', groupId).then(() => {
      itemEl.style.background = '#27ae60';
      itemEl.querySelector('span:last-child').textContent = 'Added!';
      setTimeout(() => removeActiveButtons(), 800);
    }).catch(error => {
      console.error('Error adding to group:', error);
      itemEl.style.background = '#e74c3c';
    });
  }

  // Show buttons for an image
  function showButtonsForImage(img) {
    const buttons = [];
    const imgSrc = img.src;
    const parentAnchor = img.closest('a');
    const hasLink = parentAnchor && parentAnchor.href;
    const hasImageSrc = imgSrc && imgSrc.startsWith('http');

    // Always show "Add to Ungrouped" if image has a valid src
    if (hasImageSrc) {
      const addButton = createButton('+ Ungrouped', function(btn) {
        addImageWithMeta(imgSrc, 'content-script', null).then(isNew => {
          if (isNew) {
            btn.textContent = 'Added!';
            btn.style.background = '#27ae60';
          } else {
            btn.textContent = 'Already added';
            btn.style.background = '#f39c12';
          }
          setTimeout(() => removeActiveButtons(), 800);
        }).catch(error => {
          console.error('Error adding to list:', error);
          btn.textContent = 'Error!';
          btn.style.background = '#e74c3c';
        });
      });
      buttons.push(addButton);

      // Add "Add to Group" button with dropdown container
      const groupButton = createButton('+ Group ▾', function(btn) {
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
        dropdown.style.top = (rect.height - 2) + 'px'; // Overlap slightly to bridge the gap
        dropdown.style.left = '0px';

        container.appendChild(dropdown);
        document.body.appendChild(container);

        activeContainer = container;
        activeDropdown = dropdown;

        // Add hover handlers to container for robust hover detection
        container.addEventListener('mouseenter', clearHideTimeout);
        container.addEventListener('mouseleave', () => {
          // Delay removal to allow moving between elements
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
    if (hasLink) {
      const linkUrl = parentAnchor.href;
      const followButton = createButton('Follow Link', function() {
        loadNavigationStack().then(stack => {
          stack.push(linkUrl);
          return saveNavigationStack(stack);
        }).then(() => {
          chrome.runtime.sendMessage({
            action: 'openPopup',
            url: linkUrl
          });
        }).catch(error => {
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

  // Handle mouseover on images
  function handleMouseOver(event) {
    const img = event.target;
    if (img.tagName !== 'IMG') return;

    // Skip tiny images (likely icons)
    if (img.width < 50 || img.height < 50) return;

    // Remove any existing buttons first
    removeActiveButtons();

    // Show buttons for this image
    showButtonsForImage(img);
  }

  // Check if element is part of our UI
  function isPartOfUI(element) {
    if (!element) return false;
    if (activeButtons.includes(element)) return true;
    if (activeDropdown && (activeDropdown === element || activeDropdown.contains(element))) return true;
    if (activeContainer && (activeContainer === element || activeContainer.contains(element))) return true;
    return false;
  }

  // Handle mouseout - remove buttons when leaving image
  function handleMouseOut(event) {
    const img = event.target;
    if (img.tagName !== 'IMG') return;

    const relatedTarget = event.relatedTarget;

    // Don't remove if moving to one of the buttons, dropdown, or container
    if (isPartOfUI(relatedTarget)) return;

    // Use delayed removal for more reliable hover detection
    clearHideTimeout();
    hideTimeout = setTimeout(() => {
      // Check if mouse is still on any button, dropdown, or container
      const hoveringButton = activeButtons.some(btn => {
        try { return btn.matches(':hover'); } catch(e) { return false; }
      });
      const hoveringDropdown = activeDropdown && (() => {
        try { return activeDropdown.matches(':hover'); } catch(e) { return false; }
      })();
      const hoveringContainer = activeContainer && (() => {
        try { return activeContainer.matches(':hover'); } catch(e) { return false; }
      })();

      if (hoveringButton || hoveringDropdown || hoveringContainer) return;
      removeActiveButtons();
    }, 200);
  }

  // Set up event listeners
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);

  // Clean up on page unload
  window.addEventListener('beforeunload', function() {
    removeActiveButtons();
  });
})();
