import clsx from 'clsx';
import { useApp } from '@/context/AppContext';
import { THEME_PRESETS } from '@/lib/constants';
import { SettingItem } from './SettingItem';
import type { ThemeId } from '@/types';
import styles from './ThemeSelector.module.css';

const themeIds = Object.keys(THEME_PRESETS) as ThemeId[];

export function ThemeSelector() {
  const { settings, updateSettings } = useApp();

  const handleThemeChange = (themeId: string) => {
    const preset = THEME_PRESETS[themeId as ThemeId];
    if (preset) {
      updateSettings({
        theme: themeId,
        customTheme: preset.variables,
      });
    }
  };

  return (
    <SettingItem label="Color Theme" tooltip="Choose a color scheme for the extension interface.">
      <div className={styles.themeSelector}>
        <select value={settings.theme} onChange={(e) => handleThemeChange(e.target.value)}>
          {themeIds.map((id) => (
            <option key={id} value={id}>
              {THEME_PRESETS[id].name}
            </option>
          ))}
        </select>
        <div className={styles.themePreview}>
          {themeIds.map((id) => {
            const preset = THEME_PRESETS[id];
            const primary = preset.variables['--color-primary'] || '#4a90d9';
            const background = preset.variables['--bg-body'] || '#ffffff';
            return (
              <button
                key={id}
                className={clsx(styles.themeSwatch, settings.theme === id && styles.active)}
                onClick={() => handleThemeChange(id)}
                title={preset.name}
                style={{
                  background: `linear-gradient(135deg, ${primary} 50%, ${background} 50%)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </SettingItem>
  );
}
