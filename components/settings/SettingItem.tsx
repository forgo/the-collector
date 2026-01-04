import { Flex, Text } from '@radix-ui/themes';
import { Tooltip } from '@/components/common/Tooltip';
import { Icon } from '@/components/common/Icon';

interface SettingItemProps {
  label: string;
  tooltip?: string;
  checkbox?: boolean;
  children: React.ReactNode;
}

export function SettingItem({ label, tooltip, checkbox, children }: SettingItemProps) {
  return (
    <Flex
      justify="between"
      align={checkbox ? 'center' : 'start'}
      gap="3"
      direction={checkbox ? 'row' : 'column'}
    >
      <Flex align="center" gap="1">
        <Text as="label" size="2" weight="medium">
          {label}
        </Text>
        {tooltip && (
          <Tooltip content={tooltip}>
            <Text color="gray" style={{ cursor: 'help', display: 'flex' }}>
              <Icon name="info" size={14} />
            </Text>
          </Tooltip>
        )}
      </Flex>
      <Flex align="center" style={checkbox ? {} : { width: '100%' }}>
        {children}
      </Flex>
    </Flex>
  );
}
