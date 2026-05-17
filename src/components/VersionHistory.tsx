import { useEffect, useState } from 'react';
import { getContentVersions, type ContentVersion } from '../services/contentService';

interface Props {
  contentId: string;
  onClose: () => void;
}

const CHANGE_LABEL: Record<string, string> = {
  created: 'Created',
  updated: 'Updated',
  status:  'Status changed',
};

const CHANGE_COLOR: Record<string, string> = {
  created: '#4EB679',
  updated: '#1DAAF4',
  status:  '#FEC61F',
};

export default function VersionHistory({ contentId, onClose }: Props) {
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getContentVersions(contentId)
      .then(setVersions)
      .finally(() => setLoading(false));
  }, [contentId]);

  const fmt = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ zIndex: 1000 }}
    >
      <div className="modal-card" style={{ maxWidth: 560, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#fafafa', fontSize: 16 }}>Version History</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading && (
          <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '24px 0' }}>
            Loading…
          </p>
        )}

        {!loading && versions.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '24px 0' }}>
            No version history found.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
          {versions.map((v, i) => {
            const isOpen = expanded === v.id;
            const color = CHANGE_COLOR[v.change_type] ?? '#8A5CFF';
            return (
              <div
                key={v.id ?? i}
                style={{
                  background: '#27272a', borderRadius: 8, border: '1px solid #3f3f46',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : (v.id ?? null))}
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: color,
                    flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, color: '#fafafa', fontSize: 13 }}>
                    <span style={{ color }}>{CHANGE_LABEL[v.change_type] ?? v.change_type}</span>
                    {' — '}
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: 11 }}>
                      {v.changed_by}
                    </span>
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, flexShrink: 0 }}>
                    {fmt(v.created_at)}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 16px 12px', borderTop: '1px solid #3f3f46' }}>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 6 }}>
                        State: <span style={{ color: '#fafafa' }}>{v.snapshot.state}</span>
                        {v.snapshot.meta?.title && (
                          <> · Title: <span style={{ color: '#fafafa' }}>{v.snapshot.meta.title}</span></>
                        )}
                        {v.snapshot.type && (
                          <> · Type: <span style={{ color: '#fafafa' }}>{v.snapshot.type}</span></>
                        )}
                      </div>
                      <pre style={{
                        background: '#18181b', borderRadius: 6, padding: '8px 10px',
                        fontSize: 11, color: 'rgba(255,255,255,0.55)', overflow: 'auto',
                        maxHeight: 180, margin: 0,
                      }}>
                        {JSON.stringify(v.snapshot.dsl_params, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
