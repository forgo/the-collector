import { Flex, Text, Badge, SegmentedControl } from '@radix-ui/themes';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/common/Button';
import { IconButton } from '@/components/common/IconButton';

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
    <Flex
      align="center"
      justify="between"
      px="3"
      py="2"
      gap="3"
      wrap="wrap"
      style={{
        borderBottom: '1px solid var(--gray-5)',
        flexShrink: 0,
        background: 'var(--color-background)',
      }}
    >
      <Flex align="center" gap="2">
        <Text weight="bold" size="3">
          Collected Images
        </Text>
        {selectedCount > 0 && (
          <Flex align="center" gap="2">
            <Badge color="blue">{selectedCount} selected</Badge>
            <Button
              variant="primary"
              size="sm"
              icon="folder-plus"
              onClick={onAddGroup}
              title="Add selected to new group"
            />
          </Flex>
        )}
      </Flex>

      <Flex align="center" gap="2" wrap="wrap">
        <SegmentedControl.Root
          size="1"
          value={viewMode}
          onValueChange={(v) => setViewMode(v as 'list' | 'grid')}
        >
          <SegmentedControl.Item value="list">List</SegmentedControl.Item>
          <SegmentedControl.Item value="grid">Grid</SegmentedControl.Item>
        </SegmentedControl.Root>

        <Flex gap="1">
          <IconButton icon="check-circle" size="sm" onClick={selectAllImages} label="Select all" />
          <IconButton icon="x-circle" size="sm" onClick={deselectAll} label="Deselect all" />
        </Flex>

        <Button variant="primary" size="sm" icon="folder-plus" onClick={onAddGroup}>
          New
        </Button>

        <IconButton icon="play" size="sm" onClick={onGallery} label="Open gallery" />

        <Button variant="default" size="sm" icon="download" onClick={onDownload}>
          Download
        </Button>

        <Button variant="danger" size="sm" icon="trash" onClick={clearAll}>
          Clear
        </Button>
      </Flex>
    </Flex>
  );
}
