import { useEffect, useState } from 'react';
import {
  addChapter, addCurriculum, addTopic,
  deleteChapter, deleteCurriculum, deleteTopic,
  duplicateChapterTree,
  getChapters, getCurricula, getTopics,
  importBulkJsonContent, updateChapter, updateTopic
} from '../services/contentService';
import type { Board, BulkJsonContentRow, Chapter, Curriculum, Medium, Subject, Topic } from '../services/contentService';
import {
  BookOpen, ChevronDown, ChevronRight, Copy, Edit2, Layers,
  Plus, Target, Trash2, Upload, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ContentBuilder from './ContentBuilder';

const BOARDS: Board[] = ['NCERT', 'ICSE', 'CBSE'];
const MEDIUMS: Medium[] = ['English', 'Hindi', 'Kannada'];
const CLASSES = ['5', '6', '7', '8', '9', '10'];
const SUBJECTS: Subject[] = ['Mathematics', 'Science'];

interface NameModalProps {
  isOpen: boolean;
  title: string;
  initialValue?: string;
  onClose: () => void;
  onSave: (value: string) => void;
}

function NameModal({ isOpen, title, initialValue = '', onClose, onSave }: NameModalProps) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => setValue(initialValue), [initialValue, isOpen]);
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="card modal-card">
        <div className="flex-between">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <input
          autoFocus
          className="field"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSave(value)}
          placeholder="Enter name"
        />
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(value)}>Save</button>
        </div>
      </div>
    </div>
  );
}

function CurriculumSelector({
  curricula, activeId, onSelect, onDelete
}: {
  curricula: Curriculum[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!curricula.length) {
    return <div className="empty-state">No curricula found. Click "Create New Curriculum" to begin.</div>;
  }

  return (
    <div className="curriculum-list">
      {curricula.map(curriculum => (
        <button
          key={curriculum.id}
          className={`curriculum-card ${activeId === curriculum.id ? 'active' : ''}`}
          onClick={() => onSelect(curriculum.id!)}
        >
          <div className="flex-between">
            <strong>{curriculum.title}</strong>
            <div className="icon-btn danger" onClick={(e) => { e.stopPropagation(); onDelete(curriculum.id!); }}><Trash2 size={16} /></div>
          </div>
          <span>{curriculum.board} / {curriculum.medium} / Standard {curriculum.class} / {curriculum.subject}</span>
          <em>{curriculum.state === 'published' ? 'Published to app' : curriculum.state === 'review' ? 'In review' : 'Draft'}</em>
        </button>
      ))}
    </div>
  );
}

function CreateCurriculumModal({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave: (data: { board: Board, medium: Medium, cls: string, subject: Subject }) => void }) {
  const [board, setBoard] = useState<Board>('NCERT');
  const [medium, setMedium] = useState<Medium>('English');
  const [cls, setCls] = useState('5');
  const [subject, setSubject] = useState<Subject>('Mathematics');

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="card modal-card" style={{ maxWidth: 500 }}>
        <div className="flex-between">
          <h3>Create New Curriculum</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="selection-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <label>Board<select className="field" value={board} onChange={e => setBoard(e.target.value as Board)}>{BOARDS.map(v => <option key={v}>{v}</option>)}</select></label>
          <label>Medium<select className="field" value={medium} onChange={e => setMedium(e.target.value as Medium)}>{MEDIUMS.map(v => <option key={v}>{v}</option>)}</select></label>
          <label>Class<select className="field" value={cls} onChange={e => setCls(e.target.value)}>{CLASSES.map(v => <option key={v}>{v}</option>)}</select></label>
          <label>Subject<select className="field" value={subject} onChange={e => setSubject(e.target.value as Subject)}>{SUBJECTS.map(v => <option key={v}>{v}</option>)}</select></label>
        </div>
        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave({ board, medium, cls, subject })}>Create Curriculum</button>
        </div>
      </div>
    </div>
  );
}

export default function TaxonomyManager() {
  const { user, permissions, role } = useAuth();
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [curriculumId, setCurriculumId] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [topics, setTopics] = useState<Record<string, Topic[]>>({});
  const [selectedPath, setSelectedPath] = useState<{
    curriculumId: string;
    chapterId: string;
    topicId: string;
    label: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; initialValue?: string; onSave: (value: string) => void }>({
    isOpen: false,
    title: '',
    onSave: () => undefined,
  });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const selectedCurriculum = curricula.find(c => c.id === curriculumId);
  const canBulkImport = role === 'super_admin' || permissions.includes('bulk_import');

  const loadCurricula = async () => {
    setLoading(true);
    try {
      const results = await getCurricula({});
      setCurricula(results);
      if (results.length > 0 && !curriculumId) {
        setCurriculumId(results[0].id!);
      }
    } catch (e) {
      console.error("Failed to load curricula:", e);
      alert('Failed to load curricula: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async (id = curriculumId) => {
    if (!id) {
      setChapters([]);
      return;
    }
    try {
      const results = await getChapters(id);
      setChapters(results);
    } catch (e) {
      console.error("Failed to load chapters:", e);
      alert('Failed to load chapters: ' + (e as Error).message);
    }
  };

  useEffect(() => { loadCurricula(); }, []);
  useEffect(() => {
    loadChapters();
    setSelectedPath(null);
  }, [curriculumId]);

  const openModal = (title: string, initialValue: string, onSave: (value: string) => void) => {
    setModal({ isOpen: true, title, initialValue, onSave: value => { onSave(value.trim()); setModal(prev => ({ ...prev, isOpen: false })); } });
  };

  const handleCreateCurriculum = async (data: { board: Board, medium: Medium, cls: string, subject: Subject }) => {
    if (!user) return;
    try {
      const title = `${data.board} ${data.medium} Standard ${data.cls} ${data.subject}`;
      const id = await addCurriculum({ board: data.board, medium: data.medium, class: data.cls, subject: data.subject, title, state: 'draft', created_by: user.uid });
      setIsCreateModalOpen(false);
      await loadCurricula();
      setCurriculumId(id);
    } catch (e) {
      console.error("Failed to create curriculum:", e);
      alert('Failed to create curriculum: ' + (e as Error).message);
    }
  };

  const handleDeleteCurriculum = async (id: string) => {
    if (!confirm('Are you sure you want to delete this curriculum? This action cannot be undone.')) return;
    try {
      await deleteCurriculum(id);
      if (curriculumId === id) setCurriculumId('');
      await loadCurricula();
    } catch (e) {
      console.error(e);
      alert('Failed to delete curriculum.');
    }
  };

  const handleJsonImport = async (file: File) => {
    if (!user || !selectedCurriculum) return;
    setImporting(true);
    setImportResult('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BulkJsonContentRow[] | { items: BulkJsonContentRow[] };
      const rows = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(rows)) throw new Error('JSON must be an array or an object with an items array.');
      const result = await importBulkJsonContent(selectedCurriculum, rows, user.uid);
      setImportResult(`Imported ${result.imported} items. Created ${result.chaptersCreated} chapters, ${result.topicsCreated} topics.`);
      await reloadTree();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Invalid JSON import file.');
    } finally {
      setImporting(false);
    }
  };

  const toggleChapter = async (id: string) => {
    setExpandedChapter(prev => prev === id ? null : id);
    if (!topics[id]) setTopics(prev => ({ ...prev, [id]: [] }));
    if (!topics[id]) {
      const results = await getTopics(id);
      setTopics(prev => ({ ...prev, [id]: results }));
    }
  };

  const handleAddChapter = () => {
    if (!selectedCurriculum) return;
    openModal('Create Chapter', '', async name => {
      if (!name) return;
      const id = await addChapter({
        curriculum_id: selectedCurriculum.id!,
        name,
        order: chapters.length,
        state: 'draft',
        board: selectedCurriculum.board,
        medium: selectedCurriculum.medium,
        class: selectedCurriculum.class,
        subject: selectedCurriculum.subject,
      });
      setChapters(prev => [...prev, { id, curriculum_id: selectedCurriculum.id!, name, order: prev.length, state: 'draft' }]);
    });
  };

  const handleAddTopic = (chapter: Chapter) => {
    openModal('Create Topic', '', async name => {
      if (!name) return;
      const id = await addTopic({ curriculum_id: chapter.curriculum_id, chapter_id: chapter.id!, name, order: topics[chapter.id!]?.length ?? 0 });
      setTopics(prev => ({ ...prev, [chapter.id!]: [...(prev[chapter.id!] ?? []), { id, curriculum_id: chapter.curriculum_id, chapter_id: chapter.id!, name, order: prev[chapter.id!]?.length ?? 0 }] }));
    });
  };

  const reloadTree = async () => {
    await loadChapters();
    setTopics({});
  };

  const openContentEditor = (chapter: Chapter, topic: Topic) => {
    setSelectedPath({
      curriculumId,
      chapterId: chapter.id!,
      topicId: topic.id!,
      label: `${chapter.name} / ${topic.name}`,
    });
  };

  return (
    <div className="taxonomy-screen">
      <NameModal
        {...modal}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
      />

      <CreateCurriculumModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateCurriculum}
      />

      {!selectedPath && (
        <>
          <div className="page-heading">
            <div>
              <h1>Curriculum Builder</h1>
              <p>Build the path that the Android app will consume after review approval.</p>
            </div>
            <div className="row-actions">
              {selectedCurriculum && canBulkImport && (
                <label className="btn btn-outline">
                  <Upload size={16} /> {importing ? 'Importing...' : 'Import JSON'}
                  <input type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleJsonImport(e.target.files[0])} />
                </label>
              )}
              <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}><Plus size={16} /> Create New Curriculum</button>
            </div>
          </div>

          {importResult && <div className="card access-note"><Upload size={18} /><span>{importResult}</span></div>}

          {loading ? <div className="empty-state">Loading curricula...</div> : (
            <CurriculumSelector curricula={curricula} activeId={curriculumId} onSelect={setCurriculumId} onDelete={handleDeleteCurriculum} />
          )}

          {selectedCurriculum && (
            <section className="card tree-panel">
              <div className="flex-between tree-header">
                <div>
                  <h2><BookOpen size={20} /> Chapters</h2>
                  <p>{selectedCurriculum.title}</p>
                </div>
                <button className="btn btn-primary" onClick={handleAddChapter}><Plus size={16} /> Add Chapter</button>
              </div>

              <div className="tree-list">
                {chapters.length === 0 && <div className="empty-state">Create the first chapter for this curriculum.</div>}
                {chapters.map(chapter => (
                  <div key={chapter.id} className="tree-node">
                    <div className="tree-row">
                      <button className="icon-btn" onClick={() => toggleChapter(chapter.id!)}>
                        {expandedChapter === chapter.id ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                      </button>
                      <strong>{chapter.name}</strong>
                      <span className="badge badge-warning">{chapter.state}</span>
                      <div className="row-actions">
                        <button className="mini-action" onClick={() => duplicateChapterTree(chapter).then(reloadTree)}><Copy size={14} /> Duplicate</button>
                        <button className="icon-btn" onClick={() => openModal('Edit Chapter', chapter.name, async name => { await updateChapter(chapter.id!, { name }); await loadChapters(); })}><Edit2 size={14} /></button>
                        <button className="icon-btn danger" onClick={() => { if (confirm('Delete chapter and its tree reference?')) deleteChapter(chapter.id!).then(reloadTree); }}><Trash2 size={14} /></button>
                      </div>
                    </div>

                    {expandedChapter === chapter.id && (
                      <div className="tree-children">
                        <div className="flex-between tree-subheader">
                          <span><Layers size={14} /> Topics</span>
                          <button className="mini-action" onClick={() => handleAddTopic(chapter)}>+ Add Topic</button>
                        </div>
                        {(topics[chapter.id!] ?? []).map(topic => (
                          <div key={topic.id} className="topic-block">
                            <div className="tree-row compact" style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                <Target size={16} style={{ color: '#4F46E5' }} />
                                <strong style={{ fontSize: '14px' }}>{topic.name}</strong>
                              </div>
                              <div className="row-actions">
                                <button className="icon-btn" onClick={() => openModal('Edit Topic', topic.name, async name => { await updateTopic(topic.id!, { name }); setTopics(prev => ({ ...prev, [chapter.id!]: prev[chapter.id!].map(t => t.id === topic.id ? { ...t, name } : t) })); })}><Edit2 size={13} /></button>
                                <button className="icon-btn danger" onClick={() => { if (confirm('Delete topic?')) deleteTopic(topic.id!).then(() => setTopics(prev => ({ ...prev, [chapter.id!]: prev[chapter.id!].filter(t => t.id !== topic.id) }))); }}><Trash2 size={13} /></button>
                              </div>
                            </div>
                            <div style={{ marginTop: '4px', marginBottom: '16px' }}>
                              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => {
                                openContentEditor(chapter, topic);
                                window.scrollTo(0, 0);
                              }}>
                                <BookOpen size={16} /> Open Content Editor & Mobile Preview
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {selectedCurriculum && (
            <section className="empty-state">
              Select a topic and click Content to add learning material. The path is built automatically from the curriculum tree.
            </section>
          )}
        </>
      )}

      {selectedPath && (
        <section className="embedded-builder-wrap">
          <div style={{ marginBottom: '16px' }}>
            <button className="btn btn-outline" onClick={() => setSelectedPath(null)}>
              ← Back to Curriculum Tree
            </button>
          </div>
          <ContentBuilder key={selectedPath.topicId} embedded initialSelection={selectedPath} />
        </section>
      )}
    </div>
  );
}
