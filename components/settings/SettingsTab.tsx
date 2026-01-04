import { useApp } from '@/context/AppContext';
import { SettingSection } from './SettingSection';
import { SettingItem } from './SettingItem';
import { ThemeSelector } from './ThemeSelector';
import styles from './SettingsTab.module.css';

export function SettingsTab() {
  const { settings, updateSettings } = useApp();

  return (
    <div className={styles.settingsTab}>
      <div className={styles.content}>
        <SettingSection title="Download Settings">
          <SettingItem
            label="Root Download Folder"
            tooltip="All downloaded images will be saved inside this folder. Group subfolders are created within it. Leave empty to use your browser's default download location."
          >
            <input
              type="text"
              value={settings.downloadDirectory}
              onChange={(e) => updateSettings({ downloadDirectory: e.target.value })}
              placeholder="e.g., my-images"
            />
          </SettingItem>

          <SettingItem
            label="Filename Template"
            tooltip="Customize filenames. Tokens: {name} = image name, {index} = number, {group} = group name. Dates: {YYYY} {YY} {MM} {DD} {hh} {mm} {ss} or {date} {time} {iso}"
          >
            <input
              type="text"
              value={settings.filenameTemplate}
              onChange={(e) => updateSettings({ filenameTemplate: e.target.value })}
              placeholder="{name}"
            />
          </SettingItem>

          <SettingItem
            label="Auto-rename duplicates"
            tooltip="When enabled, if a file with the same name already exists, a number suffix will be added automatically (e.g., image_1.jpg, image_2.jpg) instead of overwriting."
            checkbox
          >
            <input
              type="checkbox"
              checked={settings.autoRename}
              onChange={(e) => updateSettings({ autoRename: e.target.checked })}
            />
          </SettingItem>

          <SettingItem
            label="Confirm before download"
            tooltip="Show a confirmation dialog before starting the download, displaying the number of images and destination folder."
            checkbox
          >
            <input
              type="checkbox"
              checked={settings.confirmDownload}
              onChange={(e) => updateSettings({ confirmDownload: e.target.checked })}
            />
          </SettingItem>
        </SettingSection>

        <SettingSection title="Display Settings">
          <SettingItem
            label="List View Thumbnail Size"
            tooltip="Controls the size of image previews when viewing collections in list mode."
          >
            <div className={styles.sliderRow}>
              <input
                type="range"
                min="32"
                max="256"
                step="2"
                value={settings.listThumbnailSize}
                onChange={(e) => updateSettings({ listThumbnailSize: Number(e.target.value) })}
              />
              <span className={styles.sliderValue}>{settings.listThumbnailSize}px</span>
            </div>
          </SettingItem>

          <SettingItem
            label="Grid View Thumbnail Size"
            tooltip="Controls the size of image previews when viewing collections in grid mode."
          >
            <div className={styles.sliderRow}>
              <input
                type="range"
                min="32"
                max="256"
                step="2"
                value={settings.gridThumbnailSize}
                onChange={(e) => updateSettings({ gridThumbnailSize: Number(e.target.value) })}
              />
              <span className={styles.sliderValue}>{settings.gridThumbnailSize}px</span>
            </div>
          </SettingItem>

          <SettingItem
            label="Show image dimensions"
            tooltip="Display the width x height (in pixels) below each image thumbnail."
            checkbox
          >
            <input
              type="checkbox"
              checked={settings.showDimensions}
              onChange={(e) => updateSettings({ showDimensions: e.target.checked })}
            />
          </SettingItem>

          <SettingItem
            label="Show file type"
            tooltip="Display the file extension (JPG, PNG, GIF, etc.) next to each image."
            checkbox
          >
            <input
              type="checkbox"
              checked={settings.showFiletype}
              onChange={(e) => updateSettings({ showFiletype: e.target.checked })}
            />
          </SettingItem>
        </SettingSection>

        <SettingSection title="Behavior">
          <SettingItem
            label="Clear list after download"
            tooltip="Automatically remove all images from the collection after a successful download completes."
            checkbox
          >
            <input
              type="checkbox"
              checked={settings.clearOnDownload}
              onChange={(e) => updateSettings({ clearOnDownload: e.target.checked })}
            />
          </SettingItem>

          <SettingItem
            label="Remember groups"
            tooltip="Keep your group organization saved between browser sessions."
            checkbox
          >
            <input
              type="checkbox"
              checked={settings.rememberGroups}
              onChange={(e) => updateSettings({ rememberGroups: e.target.checked })}
            />
          </SettingItem>
        </SettingSection>

        <SettingSection title="Appearance">
          <SettingItem label="UI Scale" tooltip="Controls the size of text, icons, and buttons.">
            <select
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
      </div>
    </div>
  );
}
