import { useState, useCallback } from 'react';
import type { ImageItem } from '@/types';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/layout/Header';
import { GroupCard } from './GroupCard';
import { UngroupedSection } from './UngroupedSection';
import { PreviewModal } from '@/components/modals/PreviewModal';
import { AddToGroupModal } from '@/components/modals/AddToGroupModal';
import { DirectoryEditModal } from '@/components/modals/DirectoryEditModal';
import { DownloadPreviewModal } from '@/components/modals/DownloadPreviewModal';
import { DragIntentModal } from '@/components/modals/DragIntentModal';
import styles from './CollectionsTab.module.css';

export function CollectionsTab() {
  const { groups, ungrouped, pendingDropIntent, confirmDropIntent, cancelDropIntent } = useApp();

  // Modal states
  const [previewImage, setPreviewImage] = useState<{
    image: ImageItem;
    groupId?: string | null;
  } | null>(null);
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [showDownloadPreview, setShowDownloadPreview] = useState(false);
  const [editingDirectory, setEditingDirectory] = useState<{
    groupId?: string;
    currentValue?: string;
  } | null>(null);

  const handlePreviewImage = (image: ImageItem, groupId?: string | null) => {
    setPreviewImage({ image, groupId });
  };

  const handleEditDirectory = (groupId?: string, currentDir?: string) => {
    setEditingDirectory({ groupId, currentValue: currentDir });
  };

  // Open gallery for all images or a specific group
  const handleOpenGallery = useCallback((groupId?: string) => {
    browser.runtime.sendMessage({
      action: 'openGallery',
      groupId,
    });
  }, []);

  const totalImages = ungrouped.length + groups.reduce((sum, g) => sum + g.images.length, 0);

  return (
    <div className={styles.collectionsTab}>
      <Header
        onDownload={() => setShowDownloadPreview(true)}
        onAddGroup={() => setShowAddToGroup(true)}
        onGallery={() => handleOpenGallery()}
      />

      <div className={styles.mainContentWrapper}>
        <div className={styles.mainContent}>
          {groups.length > 0 && (
            <div className={styles.groupsContainer}>
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onPreviewImage={handlePreviewImage}
                  onEditDirectory={handleEditDirectory}
                  onGallery={handleOpenGallery}
                />
              ))}
            </div>
          )}

          <UngroupedSection
            onPreviewImage={handlePreviewImage}
            onEditDirectory={() => handleEditDirectory()}
          />

          {totalImages === 0 && (
            <div className={styles.emptyState}>
              <p>No images collected yet.</p>
              <p>Hover over images on any webpage and click the collect button.</p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.status}>
          {totalImages} image{totalImages !== 1 ? 's' : ''} collected
        </div>
      </div>

      {/* Modals */}
      <PreviewModal
        image={previewImage?.image ?? null}
        groupId={previewImage?.groupId}
        onClose={() => setPreviewImage(null)}
      />

      <AddToGroupModal isOpen={showAddToGroup} onClose={() => setShowAddToGroup(false)} />

      <DownloadPreviewModal
        isOpen={showDownloadPreview}
        onClose={() => setShowDownloadPreview(false)}
      />

      <DirectoryEditModal
        isOpen={!!editingDirectory}
        groupId={editingDirectory?.groupId}
        currentValue={editingDirectory?.currentValue}
        onClose={() => setEditingDirectory(null)}
      />

      <DragIntentModal
        isOpen={!!pendingDropIntent}
        selectedCount={pendingDropIntent?.selectedUrls.length ?? 0}
        onMoveOne={() => confirmDropIntent(false)}
        onMoveAll={() => confirmDropIntent(true)}
        onCancel={cancelDropIntent}
      />
    </div>
  );
}
