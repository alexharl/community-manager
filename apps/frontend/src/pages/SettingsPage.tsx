import { Monitor, Moon, Sun } from 'lucide-react';
import { PageContent } from '../components/layout/PageContent';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, SegmentedControl, Stack, Text, type SegmentedOption } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { useTheme } from '../theme/context';
import type { ThemePreference } from '../theme/theme';

const THEME_OPTIONS: SegmentedOption<ThemePreference>[] = [
  { value: 'light', label: 'Hell', icon: <Sun /> },
  { value: 'dark', label: 'Dunkel', icon: <Moon /> },
  { value: 'system', label: 'System', icon: <Monitor /> },
];

export function SettingsPage() {
  usePageTitle('Einstellungen');
  const { preference, setPreference } = useTheme();

  return (
    <>
      <PageHeader title="Einstellungen" />
      <PageContent>
        <Card title="Darstellung">
          <Stack gap={3} align="flex-start">
            <SegmentedControl
              label="Farbschema"
              value={preference}
              options={THEME_OPTIONS}
              onChange={setPreference}
            />
            <Text tone="muted" size="sm">
              Wird nur in diesem Browser gespeichert.
            </Text>
          </Stack>
        </Card>
      </PageContent>
    </>
  );
}
