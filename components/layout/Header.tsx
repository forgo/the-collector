import clsx from 'clsx';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/common/Button';
import { IconButton } from '@/components/common/IconButton';
import styles from './Header.module.css';

interface HeaderProps {
  onDownload: () => void;
  onAddGroup: () => void;
  onGallery: () => void;
}

export function Header({ onDownload, onAddGroup, onGallery }: HeaderProps) {
  const { viewMode, setViewMode, selectAllImages, deselectAll, clearAll, getSelectedCount } =
    useApp();

  const selectedCount = getSelectedCount();

  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <h3 className={styles.title}>Collected Images</h3>
        {selectedCount > 0 && (
          <span className={clsx(styles.selection, styles.selectionVisible)}>
            <span className={styles.selectionCount}>{selectedCount} selected</span>
            <Button
              variant="primary"
              size="sm"
              icon="folder-plus"
              onClick={onAddGroup}
              title="Add selected to new group"
            />
          </span>
        )}
      </div>
      <div className={styles.actions}>
        <div className={clsx(styles.viewToggle, styles.btnGroup)}>
          <IconButton
            icon="list"
            size="sm"
            active={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            title="List view"
          />
          <IconButton
            icon="grid"
            size="sm"
            active={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          />
        </div>
        <div className={styles.btnGroup}>
          <IconButton
            icon="check-circle"
            size="sm"
            onClick={selectAllImages}
            title="Select all images"
          />
          <IconButton icon="x-circle" size="sm" onClick={deselectAll} title="Deselect all images" />
        </div>
        <Button variant="primary" size="sm" icon="folder-plus" onClick={onAddGroup}>
          New
        </Button>
        <IconButton icon="play" size="sm" onClick={onGallery} title="Open gallery slideshow" />
        <Button variant="default" size="sm" icon="download" onClick={onDownload}>
          Download
        </Button>
        <Button variant="danger" size="sm" icon="trash" onClick={clearAll}>
          Clear
        </Button>
      </div>
    </div>
  );
}
