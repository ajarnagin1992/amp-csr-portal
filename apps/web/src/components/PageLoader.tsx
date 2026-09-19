import { useEffect, useState } from 'react';
import { Center, Loader, Stack, Text } from '@mantine/core';

export const SLOW_LOAD_NOTICE_DELAY_MS = 3000;

export function PageLoader() {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), SLOW_LOAD_NOTICE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Center py="xl">
      <Stack align="center" gap="sm" maw={420}>
        <Loader aria-label="Loading" />
        {isSlow && (
          <Text size="sm" c="dimmed" ta="center" role="status">
            Still loading. For the purposes of this assessment the API is hosted on Render's free tier, which sleeps
            when idle. The first request can take up to a minute while it wakes up, so thanks for your patience.
          </Text>
        )}
      </Stack>
    </Center>
  );
}
