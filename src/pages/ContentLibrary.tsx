import { useEffect, useState } from 'react';
import type { ContentItem, ContentLevel, ContentStatus, ContentType, ContentVersion } from '../services/contentService';
import { deleteContentItem, getAllContentItems, getContentVersions, getCurricula } from '../services/contentService';
import StatusWorkflow from '../components/StatusWorkflow';
import { Edit, Filter, History, PlayCircle, Search, Trash2, X } from 'lucide-react';
import { processUserAttempt } from '../services/adaptiveService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const STATUSES: ContentStatus[] = ['draft', 'review', 'published'];
const LEVELS = ['', 'lv0', 'lv1', 'lv2', 'lv3'];
const TYPES: (ContentType | '')[] = ['', 'mcq_single', 'mcq_multi', 'true_false', 'fill_blank', 'match_following', 'short_answer', 'article', 'video', 'drag_drop', 'categorization', 'hotspot', 'voice_answer', 'case_study'];

const STATUS_COLOR: Record<ContentStatus, string> = {
  draft: 'badge-warning',
  review: 'badge-info',
  published: 'badge-success',
};

const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Draft',
  review: 'In Review',
  published: 'Published',
};

export default function ContentLibrary() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [curricula, setCurricula] = useState<{ id?: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [curriculumId, setCurriculumId] = useState('');
  const [status, setStatus] = useState<ContentStatus | ''>('');
  const [level, setLevel] = useState('');
  const [type, setType] = useState<ContentType | ''>('');
  const [search, setSearch] = useState('');
  const [showSim, setShowSim] = useState<ContentItem | null>(null);
  const [simQuality, setSimQuality] = useState(5);
  const [simLoading, setSimLoading] = useState(false);
  const [historyFor, setHistoryFor] = useState<ContentItem | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const results = await getAllContentItems({
      curriculum_id: curriculumId || undefined,
      state: status || undefined,
      level: (level || undefined) as ContentLevel | undefined,
      type: type || undefined,
    });
    setItems(results);
    setLoading(false);
  };

  useEffect(() => { getCurricula().then(setCurricula); }, []);
  useEffect(() => { load(); }, [curriculumId, status, level, type]);

  const filtered = items.filter(item => {
    const haystack = `${item.meta?.title ?? ''} ${item.content?.body ?? ''} ${item.type}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const handleStatusUpdate = (id: string, newStatus: ContentStatus) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, state: newStatus } : item));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this content item? This cannot be undone.')) return;
    await deleteContentItem(id);
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSimulate = async () => {
    if (!showSim || !user) return;
    setSimLoading(true);
    try {
      await processUserAttempt(
        user.uid,
        showSim.id!,
        showSim.taxonomy?.topic_id || '',
        simQuality >= 3,
        15,
        simQuality
      );
      alert('Simulation successful! Check user_progress and user_reviews collections.');
      setShowSim(null);
    } catch (e) {
      alert('Simulation failed: ' + (e as Error).message);
    } finally {
      setSimLoading(false);
    }
  };

  const openHistory = async (item: ContentItem) => {
    setHistoryFor(item);
    setHistoryLoading(true);
    const results = await getContentVersions(item.id!);
    setVersions(results);
    setHistoryLoading(false);
  };

  const formatDate = (version: ContentVersion) => {
    const raw = version.created_at;
    if (!raw) return 'Just now';
    return raw.toDate().toLocaleString();
  };

  return (
    <div className="library-screen">
      {historyFor && (
        <div className="modal-backdrop">
          <div className="card history-modal">
            <div className="flex-between">
              <div>
                <h2>Version History</h2>
                <p>{historyFor.meta?.title || historyFor.id}</p>
              </div>
              <button className="icon-btn" onClick={() => setHistoryFor(null)}><X size={18} /></button>
            </div>
            {historyLoading ? (
              <div className="empty-state">Loading saved versions...</div>
            ) : versions.length === 0 ? (
              <div className="empty-state">No versions have been recorded for this content yet.</div>
            ) : (
              <div className="history-list">
                {versions.map(version => (
                  <article key={version.id} className="history-row">
                    <div>
                      <strong>{version.change_type}</strong>
                      <span>{formatDate(version)} by {version.changed_by}</span>
                    </div>
                    <p>{typeof version.snapshot.content?.body === 'string' ? version.snapshot.content.body : version.snapshot.meta?.title}</p>
                    <code>{version.id}</code>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="page-heading">
        <div>
          <h1>Existing Curriculum</h1>
          <p>Edit, delete, push content for review, publish after approval, and check version history.</p>
        </div>
      </div>

      <section className="card filter-panel">
        <Filter size={16} />
        <select className="field" value={curriculumId} onChange={e => setCurriculumId(e.target.value)}>
          <option value="">All Curricula</option>
          {curricula.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select className="field" value={status} onChange={e => setStatus(e.target.value as ContentStatus | '')}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select className="field" value={level} onChange={e => setLevel(e.target.value)}>
          <option value="">All Levels</option>
          {LEVELS.slice(1).map(l => <option key={l} value={l}>Level {l.replace('lv', '')}</option>)}
        </select>
        <select className="field" value={type} onChange={e => setType(e.target.value as ContentType | '')}>
          <option value="">All Content Types</option>
          {TYPES.slice(1).map(t => <option key={t} value={t}>{String(t).replaceAll('_', ' ')}</option>)}
        </select>
        <div className="search-field">
          <Search size={14} />
          <input className="field" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search content" />
        </div>
        <span>{filtered.length} content items</span>
      </section>

      <section className="card table-card">
        {loading ? (
          <div className="empty-state">Loading content...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No content found for these filters.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {['Content', 'Curriculum', 'Level', 'Type', 'Status', 'Review Flow', 'Version History', 'Actions'].map(header => <th key={header}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.meta?.title || (typeof item.content?.body === 'string' ? item.content.body.slice(0, 50) : '') || '(Untitled)'}</strong>
                      <span>{item.id}</span>
                    </td>
                    <td>{item.taxonomy?.board} / {item.taxonomy?.medium} / Class {item.taxonomy?.class} / {item.taxonomy?.subject}</td>
                    <td><span className="badge badge-info">Level {item.meta?.level.replace('lv', '')}</span></td>
                    <td>{item.type.replaceAll('_', ' ')}</td>
                    <td><span className={`badge ${STATUS_COLOR[item.state]}`}>{STATUS_LABEL[item.state]}</span></td>
                    <td><StatusWorkflow questionId={item.id!} currentStatus={item.state} onUpdated={s => handleStatusUpdate(item.id!, s)} /></td>
                    <td><button className="mini-action" onClick={() => openHistory(item)}><History size={13} /> View</button></td>
                    <td><button className="mini-action" onClick={() => setShowSim(item)}><PlayCircle size={13} /> Sim</button></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="Edit" onClick={() => navigate(`/builder?curriculum=${item.taxonomy?.curriculum_id}&chapter=${item.taxonomy?.chapter_id}&topic=${item.taxonomy?.topic_id}&subtopic=${item.taxonomy?.subtopic_id}`)}><Edit size={14} /></button>
                        <button className="icon-btn danger" title="Delete" onClick={() => handleDelete(item.id!)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {showSim && (
        <div className="modal-backdrop">
          <div className="card modal-card">
            <div className="flex-between">
              <h3>Simulate Student Attempt</h3>
              <button className="icon-btn" onClick={() => setShowSim(null)}><X size={18} /></button>
            </div>
            <p>Testing <strong>{showSim.meta.title}</strong></p>
            <div style={{ margin: '20px 0' }}>
              <label>Simulated Recall Quality (0-5)
                <select className="field" value={simQuality} onChange={e => setSimQuality(Number(e.target.value))}>
                  <option value={5}>5 - Perfect Recall</option>
                  <option value={4}>4 - Hesitant but Correct</option>
                  <option value={3}>3 - Difficult but Correct</option>
                  <option value={2}>2 - Wrong (Correct answer recognized)</option>
                  <option value={1}>1 - Wrong (Correct answer seemed familiar)</option>
                  <option value={0}>0 - Complete Blackout</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowSim(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSimulate} disabled={simLoading}>
                {simLoading ? 'Processing...' : 'Execute Simulation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
