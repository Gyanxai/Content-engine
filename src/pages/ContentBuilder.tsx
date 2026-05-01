import { useState, useEffect } from 'react';
import { Save, Play, Copy, Plus, Trash2, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Chapter, Topic, Subtopic, Question, QuestionType, QuestionLevel } from '../services/contentService';
import {
  getChapters, getTopics, getSubtopics, addQuestion, updateQuestion, uploadMedia
} from '../services/contentService';
import { translateAll, LANGUAGES } from '../services/translationService';

const SUBJECTS = ['Mathematics', 'Science'];
const CLASSES = ['5','6','7','8','9','10','11','12'];
const LEVELS = [
  { id: 'lv0' as QuestionLevel, label: 'Level 0 — Foundational', color: '#4EB679' },
  { id: 'lv1' as QuestionLevel, label: 'Level 1 — Core',        color: '#8A5CFF' },
  { id: 'lv2' as QuestionLevel, label: 'Level 2 — Advanced',    color: '#1DAAF4' },
];
const QUESTION_TYPES: { id: QuestionType; name: string }[] = [
  { id: 'mcq',               name: 'Multiple Choice'    },
  { id: 'trueFalse',         name: 'True / False'       },
  { id: 'fillBlank',         name: 'Fill in the Blank'  },
  { id: 'interactive_graph', name: 'Interactive Graph'  },
  { id: 'slider_simulation', name: 'Slider Simulation'  },
  { id: 'logic_puzzle',      name: 'Logic Puzzle'       },
  { id: 'step_by_step',      name: 'Step by Step'       },
];
const DEFAULT_DSL: Record<string, string> = {
  mcq:               '{\n  "options": ["A", "B", "C", "D"],\n  "correct_index": 0\n}',
  trueFalse:         '{\n  "answer": true\n}',
  fillBlank:         '{\n  "template": "The ___ is ...",\n  "answer": ""\n}',
  interactive_graph: '{\n  "equation": "y=x^2",\n  "target": {"x":3,"y":9},\n  "tolerance": 0.1\n}',
  slider_simulation: '{\n  "variable": "angle",\n  "min": 0,\n  "max": 90,\n  "unit": "degrees"\n}',
  logic_puzzle:      '{\n  "elements": ["A","B","C"],\n  "answer_order": [0,1,2]\n}',
  step_by_step:      '{\n  "steps": [\n    {"instruction":"Step 1","input_type":"text"}\n  ]\n}',
};

interface LocalQuestion {
  localId: string;
  firestoreId?: string;
  title: string;
  type: QuestionType;
  level: QuestionLevel;
  difficulty: number;
  text_en: string;
  options_en: string[];
  answer_en: string;
  explanation_en: string;
  dsl_params: string;
  lottie_url: string;
  media_url: string;
  translations: Record<string, string>;
  order: number;
  status: 'draft';
  saving?: boolean;
  saved?: boolean;
}

function blankQ(level: QuestionLevel, order: number): LocalQuestion {
  return {
    localId: `local_${Date.now()}_${Math.random()}`,
    title: '', type: 'mcq', level, difficulty: level === 'lv0' ? 0.2 : level === 'lv1' ? 0.5 : 0.8,
    text_en: '', options_en: ['','','',''], answer_en: '', explanation_en: '',
    dsl_params: DEFAULT_DSL['mcq'], lottie_url: '', media_url: '',
    translations: {}, order, status: 'draft',
  };
}

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-color)', outline: 'none', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box', backgroundColor: '#0a0a0a', color: 'inherit' };
const lbl: React.CSSProperties = { display: 'block', marginBottom: 5, fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)' };

export default function ContentBuilder() {
  const { user } = useAuth();
  // Taxonomy
  const [subject, setSubject] = useState('Mathematics');
  const [cls, setCls] = useState('9');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [chapterId, setChapterId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  // Questions per level
  const [questions, setQuestions] = useState<Record<QuestionLevel, LocalQuestion[]>>({ lv0: [blankQ('lv0',0)], lv1: [blankQ('lv1',0)], lv2: [blankQ('lv2',0)] });
  const [activeLevel, setActiveLevel] = useState<QuestionLevel>('lv1');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  // Load taxonomy
  useEffect(() => { getChapters(subject, cls).then(setChapters); setChapterId(''); setTopics([]); setTopicId(''); setSubtopics([]); setSubtopicId(''); }, [subject, cls]);
  useEffect(() => { if (chapterId) getTopics(chapterId).then(setTopics); }, [chapterId]);
  useEffect(() => { if (topicId) getSubtopics(topicId).then(setSubtopics); }, [topicId]);

  const levelQs = questions[activeLevel];

  const updateQ = (localId: string, patch: Partial<LocalQuestion>) => {
    setQuestions(prev => ({ ...prev, [activeLevel]: prev[activeLevel].map(q => q.localId === localId ? { ...q, ...patch } : q) }));
  };

  const addQ = () => {
    const q = blankQ(activeLevel, levelQs.length);
    setQuestions(prev => ({ ...prev, [activeLevel]: [...prev[activeLevel], q] }));
    setExpandedId(q.localId);
  };

  const removeQ = (localId: string) => {
    setQuestions(prev => ({ ...prev, [activeLevel]: prev[activeLevel].filter(q => q.localId !== localId).map((q, i) => ({ ...q, order: i })) }));
  };

  const moveQ = (localId: string, dir: 'up' | 'down') => {
    const list = [...levelQs];
    const idx = list.findIndex(q => q.localId === localId);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === list.length - 1) return;
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    [list[idx], list[swap]] = [list[swap], list[idx]];
    setQuestions(prev => ({ ...prev, [activeLevel]: list.map((q, i) => ({ ...q, order: i })) }));
  };

  const copyToLevel = (q: LocalQuestion, target: QuestionLevel) => {
    const copy: LocalQuestion = { ...JSON.parse(JSON.stringify(q)), localId: `local_${Date.now()}`, firestoreId: undefined, level: target, order: questions[target].length };
    setQuestions(prev => ({ ...prev, [target]: [...prev[target], copy] }));
  };

  const autoTranslate = async (q: LocalQuestion) => {
    if (!q.text_en.trim()) return alert('Enter English question text first.');
    setTranslating(prev => ({ ...prev, [q.localId]: true }));
    const newTrans = { ...q.translations };
    await translateAll(q.text_en, (code, result) => { newTrans[code] = result; });
    updateQ(q.localId, { translations: newTrans });
    setTranslating(prev => ({ ...prev, [q.localId]: false }));
  };

  const saveQuestion = async (q: LocalQuestion) => {
    if (!user || !subtopicId) return alert('Select full taxonomy (down to Subtopic) before saving.');
    updateQ(q.localId, { saving: true });
    let parsedDsl = {};
    try { parsedDsl = JSON.parse(q.dsl_params); } catch { /* ignore */ }

    const langFields: Record<string, unknown> = {};
    LANGUAGES.forEach(lang => {
      if (q.translations[lang.code]) {
        langFields[`content_${lang.code}`] = { text: q.translations[lang.code] };
      }
    });

    const payload = {
      subject, class: cls, chapter_id: chapterId, topic_id: topicId, subtopic_id: subtopicId,
      type: q.type, level: q.level, order: q.order, difficulty: q.difficulty, status: q.status,
      lottie_url: q.lottie_url, media_url: q.media_url, dsl_params: parsedDsl,
      content_en: { text: q.text_en, options: q.options_en.filter(Boolean), answer: q.answer_en, explanation: q.explanation_en },
      ...langFields, created_by: user.uid,
    } as Omit<Question, 'id'>;

    if (q.firestoreId) {
      await updateQuestion(q.firestoreId, payload);
      updateQ(q.localId, { saving: false, saved: true });
    } else {
      const id = await addQuestion(payload);
      updateQ(q.localId, { firestoreId: id, saving: false, saved: true });
    }
  };

  const handleMediaUpload = async (q: LocalQuestion, file: File, field: 'media_url' | 'lottie_url') => {
    const path = `questions/${user?.uid}/${Date.now()}_${file.name}`;
    const url = await uploadMedia(file, path);
    updateQ(q.localId, { [field]: url });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="flex-between">
        <div><h1 style={{ fontSize: 26 }}>Content Builder</h1><p style={{ color: 'var(--text-secondary)', margin: 0 }}>Build questions and save to Firestore.</p></div>
        <button className="btn btn-outline"><Play size={16} /> Preview</button>
      </div>

      {/* Taxonomy */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>📚 Taxonomy</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 2fr 2fr', gap: 12 }}>
          <div>
            <label style={lbl}>Subject</label>
            <select style={inp} value={subject} onChange={e => setSubject(e.target.value)}>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Class</label>
            <select style={inp} value={cls} onChange={e => setCls(e.target.value)}>
              {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Chapter</label>
            <select style={inp} value={chapterId} onChange={e => setChapterId(e.target.value)}>
              <option value="">— Select Chapter —</option>
              {chapters.map(c => <option key={c.id} value={c.id!}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Topic</label>
            <select style={inp} value={topicId} onChange={e => setTopicId(e.target.value)} disabled={!chapterId}>
              <option value="">— Select Topic —</option>
              {topics.map(t => <option key={t.id} value={t.id!}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Subtopic / Learning Step</label>
            <select style={inp} value={subtopicId} onChange={e => setSubtopicId(e.target.value)} disabled={!topicId}>
              <option value="">— Select Subtopic —</option>
              {subtopics.map(s => <option key={s.id} value={s.id!}>{s.name}</option>)}
            </select>
          </div>
        </div>
        {!subtopicId && <p style={{ fontSize: 12, color: 'var(--warning-yellow)', margin: 0 }}>⚠️ Select the full hierarchy to save questions to Firestore.</p>}
      </div>

      {/* Level Tabs */}
      <div style={{ display: 'flex', gap: 12 }}>
        {LEVELS.map(lv => (
          <button key={lv.id} onClick={() => setActiveLevel(lv.id)}
            style={{ padding: '10px 22px', borderRadius: 8, fontFamily: 'inherit', fontWeight: 600, fontSize: 14, border: `2px solid ${activeLevel === lv.id ? lv.color : 'var(--border-color)'}`, backgroundColor: activeLevel === lv.id ? lv.color + '18' : 'white', color: activeLevel === lv.id ? lv.color : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }}>
            {lv.label}
            <span style={{ marginLeft: 8, background: lv.color + '28', color: lv.color, borderRadius: 999, padding: '2px 8px', fontSize: 12 }}>{questions[lv.id].length}</span>
          </button>
        ))}
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {levelQs.map((q, idx) => {
          const isOpen = expandedId === q.localId;
          const color = LEVELS.find(l => l.id === activeLevel)?.color ?? '#8A5CFF';
          return (
            <div key={q.localId} className="card" style={{ padding: 0, overflow: 'hidden', border: `1px solid ${isOpen ? color : 'var(--border-color)'}`, transition: 'border-color 0.2s' }}>
              {/* Row header */}
              <div onClick={() => setExpandedId(isOpen ? null : q.localId)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', cursor: 'pointer', backgroundColor: isOpen ? color + '08' : 'white' }}>
                <span style={{ fontWeight: 700, color, fontSize: 13, minWidth: 20 }}>#{idx + 1}</span>
                <span style={{ flex: 1, fontWeight: 600, color: q.title ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{q.title || 'Untitled Question'}</span>
                {q.saved && <span style={{ fontSize: 11, color: 'var(--success-green)', fontWeight: 600 }}>✓ Saved</span>}
                {q.firestoreId && <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{q.firestoreId.slice(0,8)}…</span>}
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 8 }}>{QUESTION_TYPES.find(t => t.id === q.type)?.name}</span>
                <button onClick={e => { e.stopPropagation(); moveQ(q.localId, 'up'); }} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',padding:3 }}><ChevronUp size={15}/></button>
                <button onClick={e => { e.stopPropagation(); moveQ(q.localId, 'down'); }} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',padding:3 }}><ChevronDown size={15}/></button>
                <button onClick={e => { e.stopPropagation(); removeQ(q.localId); }} style={{ background:'none',border:'none',cursor:'pointer',color:'#ef4444',padding:3 }}><Trash2 size={15}/></button>
              </div>

              {isOpen && (
                <div style={{ padding: '18px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Basic Info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 14 }}>
                    <div><label style={lbl}>Title</label><input style={inp} placeholder="Short admin title" value={q.title} onChange={e => updateQ(q.localId, { title: e.target.value })} /></div>
                    <div>
                      <label style={lbl}>Question Type</label>
                      <select style={inp} value={q.type} onChange={e => updateQ(q.localId, { type: e.target.value as QuestionType, dsl_params: DEFAULT_DSL[e.target.value] || '{}' })}>
                        {QUESTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div><label style={lbl}>Difficulty (0–1)</label><input type="number" style={inp} step="0.1" min="0" max="1" value={q.difficulty} onChange={e => updateQ(q.localId, { difficulty: parseFloat(e.target.value) })} /></div>
                  </div>

                  {/* English Content */}
                  <div>
                    <label style={lbl}>Question Text (English)</label>
                    <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }} placeholder="Write the question in English…" value={q.text_en} onChange={e => updateQ(q.localId, { text_en: e.target.value })} />
                  </div>

                  {/* Options (MCQ) */}
                  {(q.type === 'mcq') && (
                    <div>
                      <label style={lbl}>Options (English)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {q.options_en.map((opt, i) => (
                          <input key={i} style={inp} placeholder={`Option ${String.fromCharCode(65+i)}`} value={opt} onChange={e => { const o = [...q.options_en]; o[i] = e.target.value; updateQ(q.localId, { options_en: o }); }} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div><label style={lbl}>Correct Answer</label><input style={inp} placeholder="Answer…" value={q.answer_en} onChange={e => updateQ(q.localId, { answer_en: e.target.value })} /></div>
                    <div><label style={lbl}>Explanation</label><input style={inp} placeholder="Explanation…" value={q.explanation_en} onChange={e => updateQ(q.localId, { explanation_en: e.target.value })} /></div>
                  </div>

                  {/* DSL Params */}
                  <div>
                    <label style={lbl}>Interaction Parameters (JSON DSL)</label>
                    <textarea style={{ ...inp, minHeight: 100, fontFamily: 'monospace', fontSize: 12, backgroundColor: '#1E1E1E', color: '#D4D4D4', resize: 'vertical' }}
                      value={q.dsl_params} onChange={e => updateQ(q.localId, { dsl_params: e.target.value })} />
                  </div>

                  {/* Media */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={lbl}>Lottie Animation URL</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input style={{ ...inp, flex: 1 }} placeholder="Firebase Storage URL…" value={q.lottie_url} onChange={e => updateQ(q.localId, { lottie_url: e.target.value })} />
                        <label style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', backgroundColor: 'white' }}>
                          <Upload size={14} /> Upload
                          <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => { if(e.target.files?.[0]) handleMediaUpload(q, e.target.files[0], 'lottie_url'); }} />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>Media / Image URL</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input style={{ ...inp, flex: 1 }} placeholder="Firebase Storage URL…" value={q.media_url} onChange={e => updateQ(q.localId, { media_url: e.target.value })} />
                        <label style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', backgroundColor: 'white' }}>
                          <Upload size={14} /> Upload
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if(e.target.files?.[0]) handleMediaUpload(q, e.target.files[0], 'media_url'); }} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

                  {/* Translations */}
                  <div>
                    <div className="flex-between" style={{ marginBottom: 12 }}>
                      <p style={{ fontWeight: 600, margin: 0 }}>🌐 Multilingual Translations</p>
                      <button className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}
                        onClick={() => autoTranslate(q)} disabled={translating[q.localId]}>
                        {translating[q.localId] ? '🔄 Translating…' : '⚡ Auto Translate All'}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {LANGUAGES.map(lang => (
                        <div key={lang.code}>
                          <label style={lbl}>{lang.name} ({lang.script})</label>
                          <textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }} placeholder={`${lang.name} translation…`}
                            value={q.translations[lang.code] || ''}
                            onChange={e => updateQ(q.localId, { translations: { ...q.translations, [lang.code]: e.target.value } })} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

                  {/* Footer actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Copy to:</span>
                      {LEVELS.filter(l => l.id !== activeLevel).map(lv => (
                        <button key={lv.id} onClick={() => copyToLevel(q, lv.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', border: `1px solid ${lv.color}`, borderRadius: 6, background: lv.color + '12', color: lv.color, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <Copy size={12} /> {lv.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => saveQuestion(q)} disabled={q.saving}
                      className="btn btn-primary" style={{ padding: '9px 24px' }}>
                      <Save size={15} /> {q.saving ? 'Saving…' : q.firestoreId ? 'Update in Firestore' : 'Save to Firestore'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button onClick={addQ}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, border: '2px dashed var(--border-color)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)', transition: 'all 0.15s' }}
          onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--primary-purple)')}
          onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}>
          <Plus size={18} /> Add Question to {LEVELS.find(l => l.id === activeLevel)?.label}
        </button>
      </div>
    </div>
  );
}

