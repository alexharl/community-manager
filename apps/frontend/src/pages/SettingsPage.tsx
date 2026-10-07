import type { SettingsUpdate } from '@cm/shared';
import { useSettings, useUpdateSettings } from '../api/settings';
import { PageContent } from '../components/layout/PageContent';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, LoadingState, SaveStatus } from '../components/ui';
import { MailAccountsCard } from '../features/mail/MailAccountsCard';
import { AppearanceCard } from '../features/settings/AppearanceCard';
import { GeneralSettingsCard } from '../features/settings/GeneralSettingsCard';
import { useAutosave } from '../hooks/useAutosave';
import { usePageTitle } from '../hooks/usePageTitle';

export function SettingsPage() {
  usePageTitle('Einstellungen');
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const autosave = useAutosave((patch: SettingsUpdate) => updateSettings.mutateAsync(patch));

  return (
    <>
      <PageHeader
        title="Einstellungen"
        status={<SaveStatus state={autosave.state} error={autosave.error} />}
      />
      <PageContent>
        {settings ? (
          <GeneralSettingsCard
            settings={settings}
            onNameChange={(communityName) => autosave.schedule({ communityName })}
          />
        ) : (
          <Card title="Allgemein">
            <LoadingState />
          </Card>
        )}
        <AppearanceCard />
        <MailAccountsCard />
      </PageContent>
    </>
  );
}
