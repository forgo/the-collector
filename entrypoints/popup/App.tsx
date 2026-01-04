import { useEffect, useState, useCallback, useRef } from 'react';
import { Theme } from '@radix-ui/themes';
import clsx from 'clsx';
import { AppProvider, useApp } from '@/context/AppContext';
import { Tabs } from '@/components/layout/Tabs';
import { CollectionsTab } from '@/components/collections/CollectionsTab';
import { SettingsTab } from '@/components/settings/SettingsTab';
import { ExternalDropOverlay } from '@/components/common/ExternalDropOverlay';
import { DropSelectionModal } from '@/components/modals/DropSelectionModal';
import { parseDropData, toImageItems, MEDIA_TYPES, type ParsedDropItem } from '@/utils/drop-parser';
import '@radix-ui/themes/styles.css';
import '@/styles/global.css';
import styles from './App.module.css';

function AppContent() {
  const { activeTab, isLoading, addImages, groups } = useApp();
  const [isExternalDragOver, setIsExternalDragOver] = useState(false);
  const [dropMessage, setDropMessage] = useState('Drop image here to add');
  const [isInvalid, setIsInvalid] = useState(false);
  const dragCounter = useRef(0);

  // Drop selection modal state
  const [dropSelectionItems, setDropSelectionItems] = useState<ParsedDropItem[]>([]);
  const [showDropSelection, setShowDropSelection] = useState(false);

  // Detect windowed mode (when popup is opened in a separate window)
  useEffect(() => {
    const checkWindowedMode = () => {
      if (window.innerWidth > 650 || window.innerHeight > 720) {
        document.documentElement.classList.add('windowed');
        document.body.classList.add('windowed');
      } else {
        document.documentElement.classList.remove('windowed');
        document.body.classList.remove('windowed');
      }
    };

    // Check after a short delay to let the window settle
    const timer = setTimeout(checkWindowedMode, 50);

    // Also check on resize
    window.addEventListener('resize', checkWindowedMode);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkWindowedMode);
    };
  }, []);

  // Custom MIME type for internal drags - must match ImageItem/GroupCard/UngroupedSection
  const INTERNAL_DRAG_TYPE = 'application/x-collector-internal';

  // Check if this is an internal drag (from within our extension)
  const isInternalDrag = useCallback((e: DragEvent) => {
    return e.dataTransfer?.types.includes(INTERNAL_DRAG_TYPE) ?? false;
  }, []);

  // Validate drag data
  const validateDragData = useCallback((e: DragEvent) => {
    const dt = e.dataTransfer;
    if (!dt) return { valid: false, message: 'No data' };

    // Check for HTML content (dragged images from webpages)
    if (dt.types.includes('text/html')) {
      return { valid: true, message: 'Drop image to add' };
    }

    // Check for image URLs
    if (dt.types.includes('text/uri-list') || dt.types.includes('text/plain')) {
      return { valid: true, message: 'Drop image here to add' };
    }

    // Check for files
    if (dt.types.includes('Files')) {
      return { valid: true, message: 'Drop image file to add' };
    }

    return { valid: false, message: 'Not a valid image' };
  }, []);

  // Track which group is being hovered for external drops
  const [externalDropTargetGroupId, setExternalDropTargetGroupId] = useState<string | null>(null);

  // Handle confirmed selection from drop selection modal
  const handleDropSelectionConfirm = useCallback(
    async (selectedItems: ParsedDropItem[], targetGroupId?: string | null) => {
      const images = toImageItems(selectedItems);
      if (images.length > 0) {
        await addImages(images, targetGroupId ?? undefined);
      }
      setShowDropSelection(false);
      setDropSelectionItems([]);
      setExternalDropTargetGroupId(null);
    },
    [addImages]
  );

  // Handle external drops using the new parser
  const handleExternalDrop = useCallback(
    async (e: DragEvent) => {
      const dt = e.dataTransfer;
      if (!dt) return;

      // Detect target group from drop location
      const target = e.target as HTMLElement;
      const groupSection = target.closest('[data-group-id]');
      const targetGroupId = groupSection?.getAttribute('data-group-id') ?? null;

      // Parse all potential images from the drop
      const dropData = parseDropData(dt);

      // Filter to only image items
      const imageItems = dropData.items.filter(
        (item) => item.mediaType === MEDIA_TYPES.IMAGE && item.url
      );

      if (imageItems.length === 0) {
        return;
      }

      // If single image, add directly to target group
      if (imageItems.length === 1) {
        const images = toImageItems(imageItems);
        await addImages(images, targetGroupId ?? undefined);
        return;
      }

      // If multiple images but all are recommended (no duplicates/UI elements), add all
      const hasNonRecommended = imageItems.some(
        (item) => item.hint === 'duplicate' || item.hint === 'ui-element'
      );

      if (!hasNonRecommended) {
        const images = toImageItems(imageItems);
        await addImages(images, targetGroupId ?? undefined);
        return;
      }

      // Show selection modal for multiple items with mixed recommendations
      setExternalDropTargetGroupId(targetGroupId);
      setDropSelectionItems(imageItems);
      setShowDropSelection(true);
    },
    [addImages]
  );

  // Handle paste from clipboard (CMD+V / Ctrl+V)
  // Supports: Copy Image, Copy selection with images, Copy image URL
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // Check if there's HTML content (from selection copy) or image files
      const hasHtml = clipboardData.types.includes('text/html');
      const hasFiles = clipboardData.types.includes('Files');

      // If we have HTML or image files, use the drop parser (same as drag & drop)
      if (hasHtml || hasFiles) {
        // Parse clipboard data using the same parser as drag & drop
        const dropData = parseDropData(clipboardData);

        // Filter to only image items
        const imageItems = dropData.items.filter(
          (item) => item.mediaType === MEDIA_TYPES.IMAGE && item.url
        );

        if (imageItems.length > 0) {
          e.preventDefault();

          // For file pastes (Copy Image), convert blob URLs to data URLs for persistence
          const processedItems: ParsedDropItem[] = [];
          for (const item of imageItems) {
            if (item.file) {
              // Convert file to data URL
              const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(item.file!);
              });
              processedItems.push({ ...item, url: dataUrl });
            } else {
              processedItems.push(item);
            }
          }

          if (processedItems.length === 1) {
            // Single image, add directly
            const images = toImageItems(processedItems);
            await addImages(images);
          } else if (processedItems.length > 1) {
            // Multiple images - check if all are recommended
            const hasNonRecommended = processedItems.some(
              (item) => item.hint === 'duplicate' || item.hint === 'ui-element'
            );

            if (!hasNonRecommended) {
              // All recommended, add all
              const images = toImageItems(processedItems);
              await addImages(images);
            } else {
              // Show selection modal for mixed items
              setDropSelectionItems(processedItems);
              setShowDropSelection(true);
            }
          }
          return;
        }
      }

      // Fallback: Handle plain text image URLs
      const textData = clipboardData.getData('text/plain')?.trim();
      if (
        textData &&
        textData.startsWith('http') &&
        /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|$)/i.test(textData)
      ) {
        e.preventDefault();

        // Extract filename from URL
        let filename = 'image';
        let extension = '.jpg';
        try {
          const url = new URL(textData);
          const pathname = url.pathname;
          const lastSegment = pathname.split('/').pop() || '';
          const extMatch = lastSegment.match(/\.(\w+)$/);
          if (extMatch) {
            extension = '.' + extMatch[1].toLowerCase();
            filename = lastSegment.slice(0, -extension.length);
          }
        } catch {
          // Ignore URL parse errors
        }

        const image = {
          url: textData,
          filename: filename || 'image',
          extension,
          source: 'clipboard' as const,
          addedAt: Date.now(),
        };

        await addImages([image]);
      }
    },
    [addImages]
  );

  // Set up paste event listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // Set up document-level drag/drop handlers
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (isInternalDrag(e)) return;
      e.preventDefault();
      dragCounter.current++;

      if (dragCounter.current === 1) {
        const validation = validateDragData(e);
        setIsExternalDragOver(true);
        setIsInvalid(!validation.valid);
        setDropMessage(validation.message);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (isInternalDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }

      // Update message based on target
      const validation = validateDragData(e);
      if (validation.valid) {
        // Check if hovering over a group
        const target = e.target as HTMLElement;
        const groupSection = target.closest('[data-group-id]');
        if (groupSection) {
          const groupId = groupSection.getAttribute('data-group-id');
          const group = groups.find((g) => g.id === groupId);
          setDropMessage(`Drop to add to "${group?.name ?? 'group'}"`);
        } else {
          setDropMessage('Drop to add to Ungrouped');
        }
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (isInternalDrag(e)) return;
      e.preventDefault();
      dragCounter.current--;

      if (dragCounter.current === 0) {
        setIsExternalDragOver(false);
        setIsInvalid(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (isInternalDrag(e)) return;
      e.preventDefault();
      dragCounter.current = 0;

      const validation = validateDragData(e);
      if (!validation.valid) {
        // Show rejection animation
        setIsInvalid(true);
        setDropMessage(validation.message);
        setTimeout(() => {
          setIsExternalDragOver(false);
          setIsInvalid(false);
        }, 500);
        return;
      }

      setIsExternalDragOver(false);
      handleExternalDrop(e);
    };

    // Use capture phase to intercept before default behavior
    document.addEventListener('dragenter', handleDragEnter, true);
    document.addEventListener('dragover', handleDragOver, true);
    document.addEventListener('dragleave', handleDragLeave, true);
    document.addEventListener('drop', handleDrop, true);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter, true);
      document.removeEventListener('dragover', handleDragOver, true);
      document.removeEventListener('dragleave', handleDragLeave, true);
      document.removeEventListener('drop', handleDrop, true);
    };
  }, [isInternalDrag, validateDragData, handleExternalDrop, groups]);

  if (isLoading) {
    return (
      <div className={clsx(styles.app, styles.loading)}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <Tabs />
      <div className={styles.tabContent}>
        {activeTab === 'collections' && <CollectionsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
      <ExternalDropOverlay
        visible={isExternalDragOver}
        message={dropMessage}
        isInvalid={isInvalid}
      />
      <DropSelectionModal
        isOpen={showDropSelection}
        items={dropSelectionItems}
        targetGroupId={externalDropTargetGroupId}
        onConfirm={(items) => handleDropSelectionConfirm(items, externalDropTargetGroupId)}
        onClose={() => {
          setShowDropSelection(false);
          setDropSelectionItems([]);
          setExternalDropTargetGroupId(null);
        }}
      />
    </div>
  );
}

// Map UI scale to Radix scaling
const SCALE_MAP: Record<string, '90%' | '95%' | '100%' | '105%' | '110%'> = {
  small: '90%',
  medium: '100%',
  large: '110%',
};

// Wrapper that applies Theme with settings from context
function ThemedApp() {
  const { settings } = useApp();

  // Map our accent color setting to Radix accent colors
  const accentColor = (settings.theme || 'blue') as
    | 'blue'
    | 'indigo'
    | 'violet'
    | 'purple'
    | 'pink'
    | 'red'
    | 'orange'
    | 'amber'
    | 'green'
    | 'teal'
    | 'cyan';

  const scaling = SCALE_MAP[settings.uiScale] || '100%';

  // Apply density to document root for CSS variable switching
  useEffect(() => {
    const density = settings.density || 'comfortable';
    document.documentElement.setAttribute('data-density', density);
  }, [settings.density]);

  return (
    <Theme appearance="light" accentColor={accentColor} radius="medium" scaling={scaling}>
      <AppContent />
    </Theme>
  );
}

function App() {
  return (
    <AppProvider>
      <ThemedApp />
    </AppProvider>
  );
}

export default App;
