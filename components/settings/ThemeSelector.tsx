import { Flex, Box } from '@radix-ui/themes';
import { useApp } from '@/context/AppContext';
import { SettingItem } from './SettingItem';
import styles from './SettingsTab.module.css';

// Radix accent colors that look good
const ACCENT_COLORS = [
  { id: 'blue', name: 'Blue', color: '#3b82f6' },
  { id: 'indigo', name: 'Indigo', color: '#6366f1' },
  { id: 'violet', name: 'Violet', color: '#8b5cf6' },
  { id: 'purple', name: 'Purple', color: '#a855f7' },
  { id: 'pink', name: 'Pink', color: '#ec4899' },
  { id: 'red', name: 'Red', color: '#ef4444' },
  { id: 'orange', name: 'Orange', color: '#f97316' },
  { id: 'amber', name: 'Amber', color: '#f59e0b' },
  { id: 'green', name: 'Green', color: '#22c55e' },
  { id: 'teal', name: 'Teal', color: '#14b8a6' },
  { id: 'cyan', name: 'Cyan', color: '#06b6d4' },
] as const;

export function ThemeSelector() {
  const { settings, updateSettings } = useApp();

  // Map old theme names to accent colors, default to blue
  const currentAccent = settings.theme || 'blue';

  const handleAccentChange = (accentColor: string) => {
    updateSettings({ theme: accentColor });
  };

  return (
    <SettingItem
      label="Accent Color"
      tooltip="Choose the primary accent color for buttons and highlights."
    >
      <Flex direction="column" gap="2" width="100%">
        {/* Color swatch picker - works in all modes */}
        <Flex gap="1" wrap="wrap">
          {ACCENT_COLORS.map((accent) => (
            <Box
              key={accent.id}
              onClick={() => handleAccentChange(accent.id)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: accent.color,
                cursor: 'pointer',
                border:
                  currentAccent === accent.id
                    ? '3px solid var(--gray-12)'
                    : '2px solid var(--gray-6)',
                transition: 'border-color 0.15s, transform 0.1s',
                transform: currentAccent === accent.id ? 'scale(1.1)' : 'scale(1)',
              }}
              title={accent.name}
            />
          ))}
        </Flex>

        {/* Native select as fallback */}
        <select
          className={styles.nativeSelect}
          value={currentAccent}
          onChange={(e) => handleAccentChange(e.target.value)}
        >
          {ACCENT_COLORS.map((accent) => (
            <option key={accent.id} value={accent.id}>
              {accent.name}
            </option>
          ))}
        </select>
      </Flex>
    </SettingItem>
  );
}
