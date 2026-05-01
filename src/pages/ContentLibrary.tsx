import { useEffect, useState } from 'react';
import type { ContentStatus, Question } from '../services/contentService';
import { getAllQuestions, deleteQuestion } from '../services/contentService';
import StatusWorkflow from '../components/StatusWorkflow';
import { Trash2, Edit, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SUBJECTS = ['', 'Mathematics', 'Science'];
const CLASSES = ['', '5', '6', '7', '8', '9', '10', '11', '12'];
const STATUSES: ContentStatus[] = ['draft', 'in_review', 'published'];
const LEVELS = ['', 'lv0', 'lv1', 'lv2'];

const STATUS_COLOR: Record<ContentStatus, string> = {
  draft: 'badge-warning',
  in_review: 'badge-info',
  published: 'badge-success',
};
const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  published: 'Published',
};

export default function ContentLibrary() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [cls, setCls] = useState('');
  const [status, setStatus] = useState<ContentStatus | ''>('');
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const results = await getAllQuestions({
      subject: subject || undefined,
      class: cls || undefined,
      status: (status || undefined) as ContentStatus | undefined,
      level: (level || undefined) as Question['level'] | undefined,
    });
    setQuestions(results);
    setLoading(false);
  };

  useEffect(() => { load(); }, [subject, cls, status, level]);

  const handleStatusUpdate = (id: string, newStatus: ContentStatus) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    await deleteQuestion(id);
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const filtered = questions.filter(q => {
    if (!search) return true;
    const text = q.content_en?.text?.toLowerCase() ?? '';
    return text.includes(search.toLowerCase());
  });

  const selectStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontFamily: 'inherit', fontSize: 14, outline: 'none', backgroundColor: '#0a0a0a', color: 'inherit' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="flex-between">
        <div><h1>Content Library</h1><p style={{ color: 'var(--text-secondary)' }}>All questions from Cloud Firestore.</p></div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={16} color="var(--text-secondary)" />
          <select style={selectStyle} value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {SUBJECTS.slice(1).map(s => <option key={s}>{s}</option>)}
          </select>
          <select style={selectStyle} value={cls} onChange={e => setCls(e.target.value)}>
            <option value="">All Classes</option>
            {CLASSES.slice(1).map(c => <option key={c}>Class {c}</option>)}
          </select>
          <select style={selectStyle} value={status} onChange={e => setStatus(e.target.value as ContentStatus | '')}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select style={selectStyle} value={level} onChange={e => setLevel(e.target.value)}>
            <option value="">All Levels</option>
            {LEVELS.slice(1).map(l => <option key={l} value={l}>{l === 'lv0' ? 'Level 0' : l === 'lv1' ? 'Level 1' : 'Level 2'}</option>)}
          </select>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input placeholder="Search question text…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...selectStyle, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{filtered.length} questions</span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>⏳ Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            No questions found. Try adjusting your filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: '#050505' }}>
                  {['Question', 'Subject', 'Class', 'Level', 'Type', 'Status', 'Workflow', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.1s' }}
                    onMouseOver={e => (e.currentTarget.style.backgroundColor = 'var(--bg-main)')}
                    onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px', maxWidth: 280 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {q.content_en?.text || '(No text)'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13 }}>{q.subject || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13 }}>Class {q.class || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-info">{q.level}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{q.type}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${STATUS_COLOR[q.status]}`}>{STATUS_LABEL[q.status]}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusWorkflow
                        questionId={q.id!}
                        currentStatus={q.status}
                        onUpdated={(s) => handleStatusUpdate(q.id!, s)}
                      />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => navigate('/builder')} title="Edit"
                          style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDelete(q.id!)} title="Delete"
                          style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

