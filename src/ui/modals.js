// ui/modals.js
// Modal utility functions and helpers

/**
 * Show a modal by adding the 'visible' class
 * @param {string|HTMLElement} modal - Modal element or its ID
 */
function showModal(modal) {
  var el = typeof modal === 'string' ? document.getElementById(modal) : modal;
  if (el) {
    el.classList.add('visible');
  }
}

/**
 * Hide a modal by removing the 'visible' class
 * @param {string|HTMLElement} modal - Modal element or its ID
 */
function hideModal(modal) {
  var el = typeof modal === 'string' ? document.getElementById(modal) : modal;
  if (el) {
    el.classList.remove('visible');
  }
}

/**
 * Check if a modal is currently visible
 * @param {string|HTMLElement} modal - Modal element or its ID
 * @returns {boolean}
 */
function isModalVisible(modal) {
  var el = typeof modal === 'string' ? document.getElementById(modal) : modal;
  return el ? el.classList.contains('visible') : false;
}

/**
 * Setup click-outside-to-close behavior for a modal
 * @param {HTMLElement} modal - Modal element
 * @param {function} onClose - Callback when modal is closed
 */
function setupModalBackdropClose(modal, onClose) {
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      if (onClose) {
        onClose();
      } else {
        hideModal(modal);
      }
    }
  });
}

/**
 * Setup escape key to close modal
 * @param {HTMLElement} modal - Modal element
 * @param {function} onClose - Callback when modal is closed
 */
function setupModalEscapeClose(modal, onClose) {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isModalVisible(modal)) {
      e.preventDefault();
      if (onClose) {
        onClose();
      } else {
        hideModal(modal);
      }
    }
  });
}

/**
 * Create a simple confirmation dialog
 * Returns a promise that resolves to true (confirmed) or false (cancelled)
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @returns {Promise<boolean>}
 */
function confirm(title, message) {
  return new Promise(function(resolve) {
    var modal = document.getElementById('confirm-modal');
    var titleEl = document.getElementById('confirm-title');
    var messageEl = document.getElementById('confirm-message');
    var cancelBtn = document.getElementById('confirm-cancel');
    var okBtn = document.getElementById('confirm-ok');

    if (!modal || !titleEl || !messageEl) {
      // Fallback to native confirm
      resolve(window.confirm(message));
      return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;

    function cleanup() {
      hideModal(modal);
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onConfirm);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    function onConfirm() {
      cleanup();
      resolve(true);
    }

    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onConfirm);
    showModal(modal);
  });
}

/**
 * Focus the first focusable element in a modal
 * @param {HTMLElement} modal - Modal element
 */
function focusFirstElement(modal) {
  var focusable = modal.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length > 0) {
    focusable[0].focus();
  }
}

/**
 * Trap focus within a modal (for accessibility)
 * @param {HTMLElement} modal - Modal element
 * @param {KeyboardEvent} e - Keyboard event
 */
function trapFocus(modal, e) {
  if (e.key !== 'Tab') return;

  var focusable = modal.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  if (focusable.length === 0) return;

  var first = focusable[0];
  var last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Create modal content wrapper with standard structure
 * @param {object} options - Modal options
 * @param {string} options.title - Modal title
 * @param {string} [options.className] - Additional CSS class
 * @returns {HTMLElement} Modal content element
 */
function createModalContent(options) {
  var content = document.createElement('div');
  content.className = 'modal-content' + (options.className ? ' ' + options.className : '');

  if (options.title) {
    var header = document.createElement('h4');
    header.textContent = options.title;
    content.appendChild(header);
  }

  return content;
}

/**
 * Create standard modal action buttons
 * @param {object} options - Button options
 * @param {string} [options.cancelText='Cancel'] - Cancel button text
 * @param {string} [options.confirmText='OK'] - Confirm button text
 * @param {string} [options.confirmVariant='primary'] - Confirm button variant
 * @param {function} options.onCancel - Cancel callback
 * @param {function} options.onConfirm - Confirm callback
 * @returns {HTMLElement} Button container element
 */
function createModalActions(options) {
  var actions = document.createElement('div');
  actions.className = 'modal-actions';

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn--secondary';
  cancelBtn.textContent = options.cancelText || 'Cancel';
  cancelBtn.addEventListener('click', options.onCancel);

  var confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn btn--' + (options.confirmVariant || 'primary');
  confirmBtn.textContent = options.confirmText || 'OK';
  confirmBtn.addEventListener('click', options.onConfirm);

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);

  return actions;
}

// Export for use in other modules
window.ModalUtils = {
  show: showModal,
  hide: hideModal,
  isVisible: isModalVisible,
  setupBackdropClose: setupModalBackdropClose,
  setupEscapeClose: setupModalEscapeClose,
  confirm: confirm,
  focusFirstElement: focusFirstElement,
  trapFocus: trapFocus,
  createContent: createModalContent,
  createActions: createModalActions
};
