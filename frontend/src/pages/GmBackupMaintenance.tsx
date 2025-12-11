import { useEffect, useState } from 'react';
import { get, post, del } from '../api/client';

type BackupType = 'PLAYER' | 'WEAPON';

type RestoreMode = 'FILL_EMPTY_OR_CREATE' | 'OVERWRITE';

interface BackupMetadata {
  id: string;
  type: BackupType;
  label?: string | null;
  createdAt?: string | null;
  schemaVersion?: string | null;
  playerCount?: number | null;
  weaponCount?: number | null;
  weaponBackupId?: string | null;
}

export default function GmBackupMaintenance() {
  const [weaponBackups, setWeaponBackups] = useState<BackupMetadata[]>([]);
  const [playerBackups, setPlayerBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'player' | 'weapon' | null>(null);
  const [createTarget, setCreateTarget] = useState<'player' | 'weapon' | null>(null);
  const [createLabel, setCreateLabel] = useState('');
  const [createLinkLatestWeapon, setCreateLinkLatestWeapon] = useState(true);
  const [restoreTarget, setRestoreTarget] = useState<
    | { kind: 'weapon'; id: string; mode: RestoreMode }
    | { kind: 'player'; id: string; mode: RestoreMode; restorePairedWeapon: boolean }
    | null
  >(null);
  const [deleteBackupTarget, setDeleteBackupTarget] = useState<
    | { kind: 'weapon'; id: string; label?: string | null }
    | { kind: 'player'; id: string; label?: string | null }
    | null
  >(null);

  useEffect(() => {
    document.title = 'GM Backup & Maintenance';
    void loadBackups();
  }, []);

  async function loadBackups() {
    try {
      setLoading(true);
      setError(null);
      const [w, p] = await Promise.all([
        get<BackupMetadata[]>('/backups/weapon'),
        get<BackupMetadata[]>('/backups/player'),
      ]);
      setWeaponBackups(w ?? []);
      setPlayerBackups(p ?? []);
    } catch (e) {
      setError('Failed to load backups. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmRestore() {
    if (!restoreTarget) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (restoreTarget.kind === 'weapon') {
        await post<void>(`/backups/weapon/${encodeURIComponent(restoreTarget.id)}/restore`, {
          mode: restoreTarget.mode,
        });
        setMessage('Weapon backup restored.');
      } else {
        await post<void>(`/backups/player/${encodeURIComponent(restoreTarget.id)}/restore`, {
          mode: restoreTarget.mode,
          restorePairedWeapon: restoreTarget.restorePairedWeapon,
        });
        setMessage('Player backup restored.');
      }
      await loadBackups();
    } catch (e) {
      setError(restoreTarget.kind === 'weapon' ? 'Failed to restore weapon backup.' : 'Failed to restore player backup.');
    } finally {
      setBusy(false);
      setRestoreTarget(null);
    }
  }

  function handleCancelRestore() {
    if (busy) return;
    setRestoreTarget(null);
  }

  async function handleConfirmCreateBackup() {
    if (!createTarget) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (createTarget === 'weapon') {
        const trimmed = createLabel.trim();
        const body = trimmed ? { label: trimmed } : undefined;
        await post<BackupMetadata>('/backups/weapon', body);
        setMessage('Weapon backup created.');
      } else {
        const trimmed = createLabel.trim();
        const body: any = {};
        if (trimmed) body.label = trimmed;
        if (createLinkLatestWeapon && weaponBackups.length > 0) {
          body.weaponBackupId = weaponBackups[0].id;
        }
        await post<BackupMetadata>('/backups/player', body);
        setMessage('Player backup created.');
      }
      await loadBackups();
    } catch (e) {
      setError(createTarget === 'weapon' ? 'Failed to create weapon backup.' : 'Failed to create player backup.');
    } finally {
      setBusy(false);
      setCreateTarget(null);
      setCreateLabel('');
    }
  }

  function handleCancelCreateBackup() {
    if (busy) return;
    setCreateTarget(null);
    setCreateLabel('');
  }

  function formatDate(value?: string | null): string {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return d.toLocaleString();
    } catch {
      return value;
    }
  }

  function handleCreateWeaponBackup() {
    setError(null);
    setMessage(null);
    setCreateTarget('weapon');
    setCreateLabel('');
    setCreateLinkLatestWeapon(false);
  }

  function handleCreatePlayerBackup() {
    setError(null);
    setMessage(null);
    setCreateTarget('player');
    setCreateLabel('');
    setCreateLinkLatestWeapon(weaponBackups.length > 0);
  }

  async function restoreWeapon(id: string, mode: RestoreMode) {
    setError(null);
    setMessage(null);
    setRestoreTarget({ kind: 'weapon', id, mode });
  }

  async function restorePlayer(id: string, mode: RestoreMode, restorePairedWeapon: boolean) {
    setError(null);
    setMessage(null);
    setRestoreTarget({ kind: 'player', id, mode, restorePairedWeapon });
  }

  async function handleDownloadWeaponBackup(id: string) {
    setError(null);
    setMessage(null);
    try {
      const payload = await get<any>(`/backups/weapon/${encodeURIComponent(id)}/download`);
      if (!payload) {
        setError('Weapon backup not found.');
        return;
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weapon-backup-${id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Failed to download weapon backup.');
    }
  }

  async function handleDownloadPlayerBackup(id: string) {
    setError(null);
    setMessage(null);
    try {
      const payload = await get<any>(`/backups/player/${encodeURIComponent(id)}/download`);
      if (!payload) {
        setError('Player backup not found.');
        return;
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `player-backup-${id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Failed to download player backup.');
    }
  }

  async function handleConfirmDeleteBackup() {
    if (!deleteBackupTarget) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (deleteBackupTarget.kind === 'weapon') {
        await del(`/backups/weapon/${encodeURIComponent(deleteBackupTarget.id)}`);
        setMessage('Weapon backup deleted.');
      } else {
        await del(`/backups/player/${encodeURIComponent(deleteBackupTarget.id)}`);
        setMessage('Player backup deleted.');
      }
      await loadBackups();
    } catch (e) {
      setError(deleteBackupTarget.kind === 'weapon' ? 'Failed to delete weapon backup.' : 'Failed to delete player backup.');
    } finally {
      setBusy(false);
      setDeleteBackupTarget(null);
    }
  }

  function handleCancelDeleteBackup() {
    if (busy) return;
    setDeleteBackupTarget(null);
  }

  async function handleUploadWeaponBackup(file: File) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await post<BackupMetadata>('/backups/weapon/import', payload);
      setMessage('Weapon backup imported.');
      await loadBackups();
    } catch (e) {
      setError('Failed to import weapon backup. Make sure it is a valid JSON backup file.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadPlayerBackup(file: File) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await post<BackupMetadata>('/backups/player/import', payload);
      setMessage('Player backup imported.');
      await loadBackups();
    } catch (e) {
      setError('Failed to import player backup. Make sure it is a valid JSON backup file.');
    } finally {
      setBusy(false);
    }
  }

  function deleteAllPlayerData() {
    setError(null);
    setMessage(null);
    setDeleteTarget('player');
  }

  function deleteAllWeaponData() {
    setError(null);
    setMessage(null);
    setDeleteTarget('weapon');
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (deleteTarget === 'player') {
        await del('/data/player');
        setMessage('All Player data deleted.');
      } else {
        await del('/data/weapon');
        setMessage('All Weapon data deleted.');
      }
    } catch (e) {
      setError(deleteTarget === 'player' ? 'Failed to delete Player data.' : 'Failed to delete Weapon data.');
    } finally {
      setBusy(false);
      setDeleteTarget(null);
    }
  }

  function handleCancelDelete() {
    if (busy) return;
    setDeleteTarget(null);
  }

  function handleBackToInn() {
    try {
      const homeUrl = new URL('/home', window.location.origin).toString();
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.location.href = homeUrl;
          window.opener.focus();
          window.close();
          return;
        } catch {}
      }
      window.location.href = homeUrl;
    } catch {}
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginTop: 0, textAlign: 'center' }}>GM: Backup &amp; Maintenance</h1>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <button
          type="button"
          onClick={handleBackToInn}
          style={{ padding: '6px 12px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', minWidth: 160, fontWeight: 600 }}
        >
          Back to the Inn
        </button>
      </div>

      <div style={{ marginBottom: 12, textAlign: 'center' }}>
        {loading && <p>Loading backups...</p>}
        {error && <p style={{ color: '#d32f2f', fontWeight: 600 }}>{error}</p>}
        {message && <p style={{ color: '#2fa84f', fontWeight: 600 }}>{message}</p>}
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <section style={{ flex: '1 1 320px', minWidth: 320 }}>
          <h2>Weapon Backups</h2>
          <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleCreateWeaponBackup}
              disabled={busy}
              style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #2f5597', background: '#2f5597', color: '#fff', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}
            >
              Create Weapon Backup
            </button>
            <label
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: '1px solid #2f5597',
                background: '#ffffff',
                color: '#2f5597',
                fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer'
              }}
            >
              Import Weapon Backup
              <input
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) {
                    void handleUploadWeaponBackup(file);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 4 }}>Label</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 4, fontSize: 10, width: 220, color: '#ffffff' }}>ID</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 4 }}>Created</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 4, textAlign: 'center', width: 70 }}>Count</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 4 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {weaponBackups.map((b) => (
                  <tr key={b.id}>
                    <td style={{ borderBottom: '1px solid #eee', padding: 4 }}>{b.label ?? ''}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 4, fontSize: 10, color: '#ffffff' }}>{b.id}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 4 }}>{formatDate(b.createdAt)}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 4, textAlign: 'center' }}>{b.weaponCount ?? ''}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 4, whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => restoreWeapon(b.id, 'OVERWRITE')}
                        disabled={busy}
                        style={{ marginRight: 4, padding: '2px 6px', fontSize: 11 }}
                      >
                        Restore (Overwrite)
                      </button>
                      <button
                        type="button"
                        onClick={() => restoreWeapon(b.id, 'FILL_EMPTY_OR_CREATE')}
                        disabled={busy}
                        style={{ marginRight: 4, padding: '2px 6px', fontSize: 11 }}
                      >
                        Restore (Fill-Empty)
                      </button>
                      <button
                        type="button"
                        onClick={() => { void handleDownloadWeaponBackup(b.id); }}
                        disabled={busy}
                        style={{ marginRight: 4, padding: '2px 6px', fontSize: 11 }}
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setMessage(null);
                          setDeleteBackupTarget({ kind: 'weapon', id: b.id, label: b.label });
                        }}
                        disabled={busy}
                        style={{ padding: '2px 6px', fontSize: 11 }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {weaponBackups.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} style={{ padding: 6, textAlign: 'center', color: '#666' }}>No weapon backups yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ flex: '1 1 320px', minWidth: 320 }}>
          <h2>Player Backups</h2>
          <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleCreatePlayerBackup}
              disabled={busy}
              style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #2f5597', background: '#2f5597', color: '#fff', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}
            >
              Create Player Backup
            </button>
            <label
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: '1px solid #2f5597',
                background: '#ffffff',
                color: '#2f5597',
                fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer'
              }}
            >
              Import Player Backup
              <input
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) {
                    void handleUploadPlayerBackup(file);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 4 }}>Label</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 4 }}>Created</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 4, textAlign: 'center', width: 70 }}>Players</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 4 }}>Paired Weapon</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 4 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {playerBackups.map((b) => (
                  <tr key={b.id}>
                    <td style={{ borderBottom: '1px solid #eee', padding: 4 }}>{b.label ?? ''}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 4 }}>{formatDate(b.createdAt)}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 4, textAlign: 'center' }}>{b.playerCount ?? ''}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 4 }}>{b.weaponBackupId ?? ''}</td>
                    <td style={{ borderBottom: '1px solid #eee', padding: 4, whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => restorePlayer(b.id, 'OVERWRITE', true)}
                        disabled={busy}
                        style={{ marginRight: 4, padding: '2px 6px', fontSize: 11 }}
                      >
                        Restore P+W (Overwrite)
                      </button>
                      <button
                        type="button"
                        onClick={() => restorePlayer(b.id, 'OVERWRITE', false)}
                        disabled={busy}
                        style={{ marginRight: 4, padding: '2px 6px', fontSize: 11 }}
                      >
                        Restore P Only
                      </button>
                      <button
                        type="button"
                        onClick={() => restorePlayer(b.id, 'FILL_EMPTY_OR_CREATE', true)}
                        disabled={busy}
                        style={{ marginRight: 4, padding: '2px 6px', fontSize: 11 }}
                      >
                        Fill-Empty P+W
                      </button>
                      <button
                        type="button"
                        onClick={() => { void handleDownloadPlayerBackup(b.id); }}
                        disabled={busy}
                        style={{ marginRight: 4, padding: '2px 6px', fontSize: 11 }}
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setMessage(null);
                          setDeleteBackupTarget({ kind: 'player', id: b.id, label: b.label });
                        }}
                        disabled={busy}
                        style={{ padding: '2px 6px', fontSize: 11 }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {playerBackups.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} style={{ padding: 6, textAlign: 'center', color: '#666' }}>No player backups yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section style={{ marginTop: 24 }}>
        <h2>Danger Zone</h2>
        <p style={{ fontSize: 12, color: '#b00020', marginBottom: 8 }}>
          These actions permanently delete data from the database. Make sure you have recent backups before using them.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button
            type="button"
            onClick={deleteAllPlayerData}
            disabled={busy}
            style={{ padding: '6px 12px', background: '#b00020', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            DELETE ALL PLAYER DATA
          </button>
          <button
            type="button"
            onClick={deleteAllWeaponData}
            disabled={busy}
            style={{ padding: '6px 12px', background: '#b00020', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            DELETE ALL WEAPON DATA
          </button>
          <button
            type="button"
            onClick={() => { void loadBackups(); }}
            disabled={busy}
            style={{ padding: '6px 12px', background: '#2f5597', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            Refresh Backups
          </button>
        </div>
      </section>
      {createTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 20,
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              border: '1px solid #2f5597'
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 8, color: '#2f5597' }}>
              {createTarget === 'weapon' ? 'Create Weapon backup' : 'Create Player backup'}
            </h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#2f5597' }}>
                Optional label
              </label>
              <input
                type="text"
                value={createLabel}
                onChange={(e) => setCreateLabel(e.target.value)}
                disabled={busy}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '6px 8px',
                  borderRadius: 4,
                  border: '1px solid #ccc'
                }}
              />
            </div>
            {createTarget === 'player' && weaponBackups.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 16, color: '#2f5597' }}>
                <input
                  type="checkbox"
                  checked={createLinkLatestWeapon}
                  disabled={busy}
                  onChange={(e) => setCreateLinkLatestWeapon(e.target.checked)}
                />
                Link to latest Weapon backup so they can be restored together
              </label>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={handleCancelCreateBackup}
                disabled={busy}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  background: '#ffffff',
                  color: '#2f5597',
                  cursor: busy ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleConfirmCreateBackup(); }}
                disabled={busy}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#2f5597',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: busy ? 'not-allowed' : 'pointer'
                }}
              >
                Create backup
              </button>
            </div>
          </div>
        </div>
      )}
      {restoreTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 20,
              maxWidth: 440,
              width: '90%',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              border: '1px solid #2f5597'
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 4, color: '#2f5597' }}>
              {restoreTarget.kind === 'weapon' ? 'Restore Weapon backup?' : 'Restore Player backup?'}
            </h2>
            <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: '#444' }}>
              {restoreTarget.mode === 'OVERWRITE'
                ? 'This will overwrite existing data with the contents of the selected backup.'
                : 'This will only restore into empty tables. If there is already data, the restore will fail.'}
            </p>
            {restoreTarget.kind === 'player' && (restoreTarget as any).restorePairedWeapon && (
              <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: '#2f5597' }}>
                This will also restore the paired Weapon backup (if available).
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={handleCancelRestore}
                disabled={busy}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  background: '#ffffff',
                  color: '#2f5597',
                  cursor: busy ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleConfirmRestore(); }}
                disabled={busy}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#2f5597',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: busy ? 'not-allowed' : 'pointer'
                }}
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteBackupTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 20,
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              border: '1px solid #2f5597'
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 4, color: '#2f5597' }}>
              {deleteBackupTarget.kind === 'weapon' ? 'Delete Weapon backup?' : 'Delete Player backup?'}
            </h2>
            <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: '#444' }}>
              This will remove the selected backup file from disk. It does not delete any data from the database.
            </p>
            {deleteBackupTarget.label && (
              <p style={{ marginTop: 0, marginBottom: 12, fontSize: 12, color: '#2f5597' }}>
                Label: <strong>{deleteBackupTarget.label}</strong>
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={handleCancelDeleteBackup}
                disabled={busy}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  background: '#ffffff',
                  color: '#2f5597',
                  cursor: busy ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleConfirmDeleteBackup(); }}
                disabled={busy}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#2f5597',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: busy ? 'not-allowed' : 'pointer'
                }}
              >
                Delete backup
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 20,
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              border: '1px solid #b00020'
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 4, color: '#b00020' }}>
              {deleteTarget === 'player' ? 'Delete all Player data?' : 'Delete all Weapon data?'}
            </h2>
            <p style={{ marginTop: 0, marginBottom: 16, fontSize: 13, color: '#444' }}>
              This will permanently delete data from the database.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={busy}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  background: '#ffffff',
                  color: '#2f5597',
                  cursor: busy ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleConfirmDelete(); }}
                disabled={busy}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#b00020',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: busy ? 'not-allowed' : 'pointer'
                }}
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
