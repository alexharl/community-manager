import { LOGO_ACCEPT, LOGO_MAX_BYTES, type Settings } from '@cm/shared';
import { Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';
import { useRemoveLogo, useUploadLogo } from '../../api/settings';
import { Button, Field, useToast } from '../../components/ui';
import { errorMessage } from '../../lib/errors';
import { CommunityLogo } from './CommunityLogo';
import styles from './LogoUpload.module.css';

export function LogoUpload({ settings }: { settings: Settings }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadLogo();
  const remove = useRemoveLogo();
  const toast = useToast();
  const callbacks = {
    onError: (error: unknown) => toast.error(errorMessage(error)),
  };

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > LOGO_MAX_BYTES) {
      toast.error('Das Logo darf höchstens 2 MB groß sein.');
      return;
    }
    upload.mutate(file, { ...callbacks, onSuccess: () => toast.success('Logo gespeichert.') });
  }

  return (
    <Field label="Logo" hint="PNG, JPG, WebP oder SVG, höchstens 2 MB.">
      {(control) => (
        <div className={styles.row}>
          <CommunityLogo url={settings.logoUrl} name={settings.communityName} size="md" />
          <input
            {...control}
            ref={inputRef}
            type="file"
            accept={LOGO_ACCEPT}
            hidden
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
              // Erlaubt, dieselbe Datei erneut zu wählen
              event.target.value = '';
            }}
          />
          <Button
            icon={<Upload />}
            loading={upload.isPending}
            disabled={remove.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {settings.logoUrl ? 'Ändern' : 'Logo hochladen'}
          </Button>
          {settings.logoUrl && (
            <Button
              variant="ghost"
              icon={<Trash2 />}
              loading={remove.isPending}
              disabled={upload.isPending}
              onClick={() => remove.mutate(undefined, callbacks)}
            >
              Entfernen
            </Button>
          )}
        </div>
      )}
    </Field>
  );
}
