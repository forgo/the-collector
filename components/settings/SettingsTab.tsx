import { Box, ScrollArea, TextField, Checkbox, Slider, Flex, Text } from '@radix-ui/themes';
import { useApp } from '@/context/AppContext';
import { SettingSection } from './SettingSection';
import { SettingItem } from './SettingItem';
import { ThemeSelector } from './ThemeSelector';
import styles from './SettingsTab.module.css';

export function SettingsTab() {
  const { settings, updateSettings } = useApp();

  return (
    <div className={styles.settingsTab}>
      <ScrollArea className={styles.scrollArea}>
        <Box p="4" pb="6">
          <SettingSection title="Download Settings">
            <SettingItem
              label="Root Download Folder"
              tooltip="Subfolder name within your browser's Downloads directory. Group folders are created inside this. Leave empty to download directly to your Downloads folder."
            >
              <TextField.Root
                value={settings.downloadDirectory}
                onChange={(e) => updateSettings({ downloadDirectory: e.target.value })}
                placeholder="e.g., collected-images"
                style={{ width: '100%' }}
              />
            </SettingItem>

            <SettingItem
              label="Filename Template"
              tooltip="Customize filenames. Tokens: {name} = image name, {index} = number, {group} = group name. Dates: {YYYY} {YY} {MM} {DD} {hh} {mm} {ss} or {date} {time} {iso}"
            >
              <TextField.Root
                value={settings.filenameTemplate}
                onChange={(e) => updateSettings({ filenameTemplate: e.target.value })}
                placeholder="{name}"
                style={{ width: '100%' }}
              />
            </SettingItem>

            <SettingItem
              label="Auto-rename duplicates"
              tooltip="When enabled, if a file with the same name already exists, a number suffix will be added automatically (e.g., image_1.jpg, image_2.jpg) instead of overwriting."
              checkbox
            >
              <Checkbox
                checked={settings.autoRename}
                onCheckedChange={(checked) => updateSettings({ autoRename: !!checked })}
              />
            </SettingItem>

            <SettingItem
              label="Confirm before download"
              tooltip="Show a confirmation dialog before starting the download, displaying the number of images and destination folder."
              checkbox
            >
              <Checkbox
                checked={settings.confirmDownload}
                onCheckedChange={(checked) => updateSettings({ confirmDownload: !!checked })}
              />
            </SettingItem>
          </SettingSection>

          <SettingSection title="Display Settings">
            <SettingItem
              label="List View Thumbnail Size"
              tooltip="Controls the size of image previews when viewing collections in list mode."
            >
              <Flex gap="3" align="center" width="100%">
                <Slider
                  value={[settings.listThumbnailSize]}
                  onValueChange={(value) => updateSettings({ listThumbnailSize: value[0] })}
                  min={32}
                  max={256}
                  step={2}
                  style={{ flex: 1 }}
                />
                <Text size="2" color="gray" style={{ minWidth: '50px', textAlign: 'right' }}>
                  {settings.listThumbnailSize}px
                </Text>
              </Flex>
            </SettingItem>

            <SettingItem
              label="Grid View Thumbnail Size"
              tooltip="Controls the size of image previews when viewing collections in grid mode."
            >
              <Flex gap="3" align="center" width="100%">
                <Slider
                  value={[settings.gridThumbnailSize]}
                  onValueChange={(value) => updateSettings({ gridThumbnailSize: value[0] })}
                  min={32}
                  max={256}
                  step={2}
                  style={{ flex: 1 }}
                />
                <Text size="2" color="gray" style={{ minWidth: '50px', textAlign: 'right' }}>
                  {settings.gridThumbnailSize}px
                </Text>
              </Flex>
            </SettingItem>

            <SettingItem
              label="Show image dimensions"
              tooltip="Display the width x height (in pixels) below each image thumbnail."
              checkbox
            >
              <Checkbox
                checked={settings.showDimensions}
                onCheckedChange={(checked) => updateSettings({ showDimensions: !!checked })}
              />
            </SettingItem>

            <SettingItem
              label="Show file type"
              tooltip="Display the file extension (JPG, PNG, GIF, etc.) next to each image."
              checkbox
            >
              <Checkbox
                checked={settings.showFiletype}
                onCheckedChange={(checked) => updateSettings({ showFiletype: !!checked })}
              />
            </SettingItem>
          </SettingSection>

          <SettingSection title="Behavior">
            <SettingItem
              label="Clear list after download"
              tooltip="Automatically remove all images from the collection after a successful download completes."
              checkbox
            >
              <Checkbox
                checked={settings.clearOnDownload}
                onCheckedChange={(checked) => updateSettings({ clearOnDownload: !!checked })}
              />
            </SettingItem>

            <SettingItem
              label="Remember groups"
              tooltip="Keep your group organization saved between browser sessions."
              checkbox
            >
              <Checkbox
                checked={settings.rememberGroups}
                onCheckedChange={(checked) => updateSettings({ rememberGroups: !!checked })}
              />
            </SettingItem>
          </SettingSection>

          <SettingSection title="Appearance">
            <SettingItem label="UI Scale" tooltip="Controls the size of text, icons, and buttons.">
              <select
                className={styles.nativeSelect}
                value={settings.uiScale}
                onChange={(e) =>
                  updateSettings({ uiScale: e.target.value as 'small' | 'medium' | 'large' })
                }
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </SettingItem>

            <SettingItem
              label="Spacing Density"
              tooltip="Controls padding and spacing between elements."
            >
              <select
                className={styles.nativeSelect}
                value={settings.density}
                onChange={(e) =>
                  updateSettings({
                    density: e.target.value as 'compact' | 'comfortable' | 'spacious',
                  })
                }
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
            </SettingItem>

            <ThemeSelector />
          </SettingSection>
        </Box>
      </ScrollArea>
    </div>
  );
}
