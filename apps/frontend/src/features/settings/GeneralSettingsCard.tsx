import { SettingsUpdateSchema, type Settings } from '@cm/shared';
import { useState } from 'react';
import { Card, Stack, TextField } from '../../components/ui';
import styles from './GeneralSettingsCard.module.css';
import { LogoUpload } from './LogoUpload';

interface GeneralSettingsCardProps {
  settings: Settings;
  /** Wird nur mit gültigen (nicht leeren) Namen aufgerufen. */
  onNameChange: (communityName: string) => void;
}

export function GeneralSettingsCard({ settings, onNameChange }: GeneralSettingsCardProps) {
  // Lokaler Zustand, damit Autosave-Antworten die Eingabe nicht überschreiben
  const [name, setName] = useState(settings.communityName);
  const validation = SettingsUpdateSchema.safeParse({ communityName: name });

  return (
    <Card title="Allgemein">
      <Stack gap={5}>
        <TextField
          className={styles.name}
          label="Name der Community"
          value={name}
          maxLength={100}
          error={validation.success ? undefined : validation.error.issues[0]?.message}
          onChange={(event) => {
            const value = event.target.value;
            setName(value);
            const result = SettingsUpdateSchema.safeParse({ communityName: value });
            if (result.success) onNameChange(result.data.communityName);
          }}
        />
        <LogoUpload settings={settings} />
      </Stack>
    </Card>
  );
}
