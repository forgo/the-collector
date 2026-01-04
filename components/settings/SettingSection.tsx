import { Box, Heading, Flex } from '@radix-ui/themes';

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <Box mb="5" className="setting-section">
      <Heading size="3" mb="3">
        {title}
      </Heading>
      <Flex direction="column" gap="3">
        {children}
      </Flex>
    </Box>
  );
}
