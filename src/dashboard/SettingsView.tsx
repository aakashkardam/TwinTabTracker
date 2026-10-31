import { useEffect, useState } from 'react';
import { KEYBOARD_SHORTCUTS } from '../shared/copy';
import { DEFAULT_SETTINGS } from '../shared/settings/defaults';
import type { AppSettings } from '../shared/types';
import { Button } from '../ui/components/Button';
import { NAV } from './nav';
import styles from './DashboardApp.module.css';

export function SettingsView({
  settings,
  onSave,
}: {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onSave(next);
  }

  return (
    <>
      <header className={styles.heading}>
        <div>
          <h1>Settings</h1>
          <p>All preferences stay on this browser. Restore defaults at any time.</p>
        </div>
        <Button onClick={() => onSave({ ...DEFAULT_SETTINGS, onboardingCompleted: true })}>Restore defaults</Button>
      </header>
      <div className={styles.grid}>
        <label className={styles.field}>
          Duplicate matching
          <select value={draft.matchMode} onChange={(event) => update('matchMode', event.target.value as AppSettings['matchMode'])}>
            <option value="exact">Exact canonical URL</option>
            <option value="smart">Smart (ignore common tracking parameters)</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.stripTrackingParams}
            onChange={(event) => update('stripTrackingParams', event.target.checked)}
          />{' '}
          Strip known tracking parameters in smart mode
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.ignoreFragmentInSmartMode}
            onChange={(event) => update('ignoreFragmentInSmartMode', event.target.checked)}
          />{' '}
          Ignore URL fragments in smart mode
        </label>
        <label className={styles.field}>
          Extra tracking parameters (comma separated)
          <input
            value={draft.extraTrackingParams.join(', ')}
            onChange={(event) =>
              update(
                'extraTrackingParams',
                event.target.value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.protectPinned}
            onChange={(event) => update('protectPinned', event.target.checked)}
          />{' '}
          Protect pinned tabs
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.protectActive}
            onChange={(event) => update('protectActive', event.target.checked)}
          />{' '}
          Protect the active tab
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.protectLastTabInWindow}
            onChange={(event) => update('protectLastTabInWindow', event.target.checked)}
          />{' '}
          Do not close the last tab in a window
        </label>
        <label className={styles.field}>
          Duplicate awareness
          <select
            value={draft.duplicateNotice}
            onChange={(event) => update('duplicateNotice', event.target.value as AppSettings['duplicateNotice'])}
          >
            <option value="off">Off</option>
            <option value="badge">Badge only</option>
            <option value="banner">Popup banner and badge</option>
          </select>
        </label>
        <label className={styles.field}>
          Theme
          <select value={draft.theme} onChange={(event) => update('theme', event.target.value as AppSettings['theme'])}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className={styles.field}>
          Accent color
          <select value={draft.accent} onChange={(event) => update('accent', event.target.value as AppSettings['accent'])}>
            <option value="teal">Teal</option>
            <option value="slate">Slate</option>
            <option value="indigo">Indigo</option>
          </select>
        </label>
        <Button onClick={() => update('onboardingCompleted', false)}>Show first-run tour</Button>
        <label className={styles.field}>
          Cleanup history size
          <input
            type="number"
            min={1}
            max={50}
            value={draft.cleanupHistoryLimit}
            onChange={(event) => update('cleanupHistoryLimit', Number(event.target.value))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.deleteParkedAfterRestore}
            onChange={(event) => update('deleteParkedAfterRestore', event.target.checked)}
          />{' '}
          Remove parked entries after restore
        </label>
        <label className={styles.field}>
          Default dashboard view
          <select
            value={draft.defaultDashboardView}
            onChange={(event) => update('defaultDashboardView', event.target.value as AppSettings['defaultDashboardView'])}
          >
            {NAV.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Keyboard shortcuts</h2>
          <p className={styles.muted}>
            Suggested shortcuts. Your browser may ask you to confirm them in the extension shortcuts page.
          </p>
          <ul className={styles.shortcutList}>
            {KEYBOARD_SHORTCUTS.map((item) => (
              <li key={item.keys}>
                <kbd>{item.keys}</kbd> {item.action}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
