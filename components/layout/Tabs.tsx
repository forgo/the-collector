import { Tabs as RadixTabs, Flex } from '@radix-ui/themes';
import { useApp } from '@/context/AppContext';
import { IconButton } from '@/components/common/IconButton';

export function Tabs() {
  const { activeTab, setActiveTab } = useApp();

  const handleUndock = async () => {
    await browser.runtime.sendMessage({ action: 'openInWindow' });
    window.close();
  };

  return (
    <Flex
      align="center"
      justify="between"
      px="3"
      py="2"
      style={{ borderBottom: '1px solid var(--gray-5)', flexShrink: 0 }}
    >
      <RadixTabs.Root
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'collections' | 'settings')}
      >
        <RadixTabs.List>
          <RadixTabs.Trigger value="collections">Collections</RadixTabs.Trigger>
          <RadixTabs.Trigger value="settings">Settings</RadixTabs.Trigger>
        </RadixTabs.List>
      </RadixTabs.Root>

      <IconButton
        icon="arrow-top-right-on-square"
        size="sm"
        label="Open in separate window"
        onClick={handleUndock}
      />
    </Flex>
  );
}
