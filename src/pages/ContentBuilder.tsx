import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Check, Copy, Eye, FileQuestion, FileText, FlaskConical,
  Image, Layers3, Plus, Save, Send, Trash2, X, UploadCloud,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type {
  ContentItem, ContentLevel, ContentStatus, ContentType,
  Curriculum, RichContent, RichMediaKind, TextOrMedia,
} from '../types/content';
import {
  addContentItem, getChapters, getContentItems, getCurricula,
  getCurriculum, getTopics, updateContentItem, uploadMedia,
} from '../services/contentService';
import { validateDsl } from '../services/dslValidator';

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVELS: { id: ContentLevel; label: string; hint: string; color: string }[] = [
  { id: 'lv0', label: 'Level 0', hint: 'Foundation', color: '#4EB679' },
  { id: 'lv1', label: 'Level 1', hint: 'Core',       color: '#8A5CFF' },
  { id: 'lv2', label: 'Level 2', hint: 'Practice',   color: '#1DAAF4' },
  { id: 'lv3', label: 'Level 3', hint: 'Challenge',  color: '#FEC61F' },
];

const CONTENT_TYPES: { id: ContentType; name: string; icon: React.ElementType }[] = [
  { id: 'mcq_single',        name: 'MCQ (Single Correct)',     icon: FileQuestion },
  { id: 'mcq_multi',         name: 'MCQ (Multi Correct)',      icon: FileQuestion },
  { id: 'true_false',        name: 'True / False',             icon: FileQuestion },
  { id: 'fill_blank',        name: 'Fill in the Blanks',       icon: FileText     },
  { id: 'match_following',   name: 'Match the Following',      icon: Layers3      },
  { id: 'short_answer',      name: 'Short Answer',             icon: FileText     },
  { id: 'article',           name: 'Article / Explanation',    icon: FileText     },
  { id: 'video',             name: 'Video',                    icon: Image        },
  { id: 'drag_drop',         name: 'Drag & Drop',              icon: Layers3      },
  { id: 'categorization',    name: 'Categorization',           icon: Layers3      },
  { id: 'hotspot',           name: 'Hotspot (Image)',          icon: Image        },
  { id: 'voice_answer',      name: 'Voice Answer',             icon: BookOpen     },
  { id: 'case_study',        name: 'Case Study (Composite)',   icon: FileText     },
  { id: 'pdf',               name: 'PDF',                      icon: FileText     },
  { id: 'interactive_graph', name: 'Interactive Graph',        icon: FlaskConical },
  { id: 'slider_simulation', name: 'Slider Simulation',        icon: Layers3      },
  { id: 'logic_puzzle',      name: 'Logic Puzzle',             icon: FileQuestion },
];

// DSL defaults aligned with Zod schemas in dslValidator.ts
const DEFAULT_DSL: Record<string, string> = {
  mcq_single:        JSON.stringify({ options: ['Option A', 'Option B', 'Option C', 'Option D'], correct_index: 0, explanation: '' }, null, 2),
  mcq_multi:         JSON.stringify({ options: ['Option A', 'Option B', 'Option C', 'Option D'], correct_indices: [0], explanation: '' }, null, 2),
  true_false:        JSON.stringify({ correct: true, explanation: '' }, null, 2),
  fill_blank:        JSON.stringify({ text_with_blanks: 'The capital of India is [blank].', answers: ['New Delhi'] }, null, 2),
  match_following:   JSON.stringify({ pairs: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }] }, null, 2),
  short_answer:      JSON.stringify({ expected_answer: '', keywords: [], explanation: '' }, null, 2),
  article:           JSON.stringify({ body: '', read_time_sec: 5 }, null, 2),
  video:             JSON.stringify({ video_url: '', start_time_sec: 0, end_time_sec: 0 }, null, 2),
  drag_drop:         JSON.stringify({ items: [{ id: '1', label: 'Item 1' }, { id: '2', label: 'Item 2' }], drop_zones: [{ id: 'A', label: 'Zone A' }], correct: { '1': 'A', '2': 'A' } }, null, 2),
  categorization:    JSON.stringify({ categories: ['Category 1', 'Category 2'], items: [{ label: 'Item 1', correct_category: 'Category 1' }] }, null, 2),
  hotspot:           JSON.stringify({ image_url: '', hotspots: [] }, null, 2),
  voice_answer:      JSON.stringify({ prompt: 'Describe your answer.', expected_keywords: [], max_duration_sec: 30 }, null, 2),
  case_study:        JSON.stringify({ passage: '', child_items: [] }, null, 2),
  pdf:               JSON.stringify({ pdf_url: '', page_count: 1, start_page: 1 }, null, 2),
  interactive_graph: JSON.stringify({ chart_type: 'bar', data: [], x_label: '', y_label: '' }, null, 2),
  slider_simulation: JSON.stringify({ min: 0, max: 100, step: 1, correct_value: 50, label: 'Adjust the slider', unit: '', tolerance: 5 }, null, 2),
  logic_puzzle:      JSON.stringify({ puzzle: 'What comes next?', answer: '', hints: [], explanation: '' }, null, 2),
};

// ── TextOrMediaInput ──────────────────────────────────────────────────────────
// Universal input: every option, answer, label, prompt, or body field can be
// plain text, an image, a GIF, or an audio clip.

function TextOrMediaInput({
  value, onChange, placeholder = '', multiline = false, disabled = false,
}: {
  value: TextOrMedia;
  onChange: (v: TextOrMedia) => void;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const asText = typeof value === 'string' ? value : value.kind === 'text' ? (value.value ?? '') : '';
  const isMedia = typeof value === 'object' && value.kind !== 'text';

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const url = await uploadMedia(file, `content_media/${Date.now()}_${file.name}`);
      const kind: RichMediaKind = file.type === 'image/gif' ? 'gif'
        : file.type.startsWith('audio/') ? 'audio'
        : 'image';
      onChange({ kind, url });
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (isMedia) {
    const m = value as RichContent;
    return (
      <div className="tom-media-preview">
        {(m.kind === 'image' || m.kind === 'gif') && m.url && (
          <img src={m.url} alt={m.alt ?? ''} className="tom-img" />
        )}
        {m.kind === 'audio' && m.url && (
          <audio src={m.url} controls className="tom-audio" />
        )}
        <div className="tom-media-badge">{m.kind.toUpperCase()}</div>
        <input
          className="field"
          placeholder="Caption (optional)"
          value={m.caption ?? ''}
          onChange={e => onChange({ ...m, caption: e.target.value })}
          style={{ fontSize: 12, marginTop: 6 }}
        />
        <div className="tom-media-actions">
          <button
            className="btn btn-outline"
            style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={() => onChange(asText)}
          >
            ← Text
          </button>
          <label className="rich-upload-btn small">
            ↺ Replace
            <input
              type="file"
              hidden
              accept="image/*,audio/*"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ''; }}
            />
          </label>
        </div>
      </div>
    );
  }

  const sharedProps = {
    className: 'field',
    value: asText,
    placeholder,
    disabled: disabled || busy,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    style: { flex: 1, minWidth: 0 } as React.CSSProperties,
  };

  return (
    <div className="tom-text-row">
      {multiline
        ? <textarea {...sharedProps} rows={3} />
        : <input    {...sharedProps} />
      }
      {!disabled && (
        <div className="tom-btns">
          <label className="tom-btn" title={busy ? 'Uploading…' : 'Image / GIF'}>
            {busy ? '⏳' : '🖼'}
            <input
              type="file" hidden accept="image/*"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ''; }}
            />
          </label>
          <label className="tom-btn" title={busy ? 'Uploading…' : 'Audio'}>
            {busy ? '⏳' : '🎵'}
            <input
              type="file" hidden accept="audio/*"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ''; }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

// ── RenderTOM — render a TextOrMedia value inside the phone preview ────────────

function RenderTOM({ v, imgStyle }: { v: TextOrMedia; imgStyle?: React.CSSProperties }) {
  if (typeof v === 'string') return <>{v}</>;
  switch (v.kind) {
    case 'text':  return <>{v.value ?? ''}</>;
    case 'image':
    case 'gif':   return <img src={v.url} alt={v.alt ?? ''} style={{ maxWidth: '100%', maxHeight: 64, borderRadius: 8, objectFit: 'cover', ...imgStyle }} />;
    case 'audio': return <audio src={v.url} controls style={{ width: '100%', height: 32 }} />;
    default:      return null;
  }
}

// ── Local state type ──────────────────────────────────────────────────────────

interface LocalContent {
  localId: string;
  firestoreId?: string;
  version: number;
  type: ContentType;
  state: ContentStatus;
  meta: {
    title: string;
    instruction: string;
    difficulty: 'easy' | 'medium' | 'hard';
    level: ContentLevel;
    tags: string[];
    skills: string[];
    time_estimate_sec: number;
    icon?: string;
    lottie_url?: string;
  };
  media: { type: 'image' | 'video' | 'audio' | 'pdf' | null; url?: string; thumbnail_url?: string };
  scoring: { marks: number; negative_marks?: number; partial_scoring?: boolean };
  behavior: { shuffle_options?: boolean; max_attempts?: number; show_explanation_after_attempt?: boolean; retry_enabled?: boolean; time_limit_sec?: number };
  content: { body?: TextOrMedia };
  dsl_params: string;  // JSON string stored locally, parsed on read
  tracking: { concept_id?: string; skill?: string };
  saving?: boolean;
  saved?: boolean;
}

interface ContentBuilderProps {
  embedded?: boolean;
  initialSelection?: { curriculumId: string; chapterId: string; topicId: string; label?: string };
}

function blankItem(level: ContentLevel): LocalContent {
  return {
    localId: `local_${Date.now()}_${Math.random()}`,
    version: 2, type: 'mcq_single', state: 'draft',
    meta: { title: '', instruction: '', difficulty: 'medium', level, tags: [], skills: [], time_estimate_sec: 120, icon: 'BookOpen' },
    media: { type: null },
    scoring: { marks: 1 },
    behavior: {},
    content: { body: '' },
    dsl_params: DEFAULT_DSL.mcq_single,
    tracking: {},
  };
}

function fromContentItem(item: ContentItem): LocalContent {
  return {
    localId: item.id ?? `local_${Date.now()}`,
    firestoreId: item.id,
    version: item.version ?? 2,
    type: item.type, state: item.state,
    meta: { ...item.meta }, media: { ...item.media },
    scoring: { ...item.scoring }, behavior: { ...item.behavior },
    content: { ...item.content },
    dsl_params: JSON.stringify(item.dsl_params ?? {}, null, 2),
    tracking: { ...item.tracking },
    saved: true,
  };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ContentBuilder({ embedded = false, initialSelection }: ContentBuilderProps) {
  const { user } = useAuth();
  const [curricula,    setCurricula]    = useState<Curriculum[]>([]);
  const [curriculum,   setCurriculum]   = useState<Curriculum | null>(null);
  const [curriculumId, setCurriculumId] = useState('');
  const [chapters,     setChapters]     = useState<{ id?: string; name: string }[]>([]);
  const [topics,       setTopics]       = useState<{ id?: string; name: string }[]>([]);
  const [chapterId,    setChapterId]    = useState('');
  const [topicId,      setTopicId]      = useState('');
  const [activeLevel,  setActiveLevel]  = useState<ContentLevel>('lv0');
  const [items, setItems] = useState<Record<ContentLevel, LocalContent[]>>({
    lv0: [blankItem('lv0')], lv1: [], lv2: [], lv3: [],
  });
  const [activeId,       setActiveId]       = useState<string | null>(items.lv0[0].localId);
  const [previewItem,    setPreviewItem]    = useState<LocalContent | null>(null);
  const [previewSelected, setPreviewSelected] = useState<number | null>(null);
  const [locationOpen,   setLocationOpen]   = useState(!embedded);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPreviewItem(null); setPreviewSelected(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    getCurricula().then(results => {
      setCurricula(results);
      const p = new URLSearchParams(window.location.search);
      setCurriculumId(initialSelection?.curriculumId || p.get('curriculum') || results[0]?.id || '');
      setChapterId(initialSelection?.chapterId || p.get('chapter') || '');
      setTopicId(initialSelection?.topicId   || p.get('topic')   || '');
    });
  }, []);

  useEffect(() => {
    if (!initialSelection) return;
    setCurriculumId(initialSelection.curriculumId);
    setChapterId(initialSelection.chapterId);
    setTopicId(initialSelection.topicId);
  }, [initialSelection?.curriculumId, initialSelection?.chapterId, initialSelection?.topicId]);

  useEffect(() => {
    if (!curriculumId) return;
    getCurriculum(curriculumId).then(setCurriculum);
    getChapters(curriculumId).then(setChapters);
  }, [curriculumId]);

  useEffect(() => {
    if (!chapterId) { setTopics([]); return; }
    getTopics(chapterId).then(setTopics);
  }, [chapterId]);

  useEffect(() => {
    if (!topicId) return;
    Promise.all(LEVELS.map(l => getContentItems(topicId, l.id))).then(results => {
      const next = LEVELS.reduce((acc, l, i) => {
        acc[l.id] = results[i].map(fromContentItem);
        if (!acc[l.id].length && l.id === 'lv0') acc[l.id] = [blankItem('lv0')];
        return acc;
      }, {} as Record<ContentLevel, LocalContent[]>);
      setItems(next);
      setActiveId(next[activeLevel]?.[0]?.localId ?? null);
    });
  }, [topicId]);

  const levelItems  = items[activeLevel] ?? [];
  const activeItem  = useMemo(() => levelItems.find(i => i.localId === activeId) ?? levelItems[0], [levelItems, activeId]);
  const isLocked    = activeItem?.state === 'published';

  const updateItem = (localId: string, patch: Partial<LocalContent>) =>
    setItems(prev => ({
      ...prev,
      [activeLevel]: prev[activeLevel].map(i => i.localId === localId ? { ...i, ...patch, saved: false } : i),
    }));

  const updateMeta = (localId: string, patch: Partial<LocalContent['meta']>) => {
    const item = items[activeLevel].find(i => i.localId === localId);
    if (item) updateItem(localId, { meta: { ...item.meta, ...patch } });
  };

  const parseDsl = (item: LocalContent): Record<string, any> => {
    try { return JSON.parse(item.dsl_params || '{}'); } catch { return {}; }
  };

  // ── Dynamic editor — per content type ────────────────────────────────────────

  const renderDynamicEditorFields = (item: LocalContent) => {
    const dsl = parseDsl(item);
    const setDsl = (next: any) => updateItem(item.localId, { dsl_params: JSON.stringify(next, null, 2) });
    const disabled = isLocked;

    // Shared: question body (text OR media)
    const renderBodyField = (label = 'Question Body', ml = true) => (
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
        {label}
        <TextOrMediaInput
          value={item.content.body ?? ''}
          onChange={v => updateItem(item.localId, { content: { body: v } })}
          placeholder="Enter question text, or upload an image / audio / GIF…"
          multiline={ml}
          disabled={disabled}
        />
      </label>
    );

    // Shared: explanation (text OR media)
    const renderExplField = () => (
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
        Explanation
        <TextOrMediaInput
          value={(dsl.explanation as TextOrMedia) ?? ''}
          onChange={v => setDsl({ ...dsl, explanation: v })}
          placeholder="Optional explanation shown after attempt…"
          multiline
          disabled={disabled}
        />
      </label>
    );

    switch (item.type) {

      // ── MCQ Single / Multi ──────────────────────────────────────────────────
      case 'mcq_single':
      case 'mcq_multi': {
        const options: TextOrMedia[] = (dsl.options as TextOrMedia[]) ?? ['', '', '', ''];
        const isMulti = item.type === 'mcq_multi';
        const correctIndex: number   = (dsl.correct_index as number) ?? 0;
        const correctIndices: number[] = (dsl.correct_indices as number[]) ?? [];

        const setOption = (i: number, v: TextOrMedia) => {
          const next = [...options]; next[i] = v;
          setDsl({ ...dsl, options: next });
        };
        const toggleCorrect = (i: number) => {
          if (!isMulti) { setDsl({ ...dsl, correct_index: i }); return; }
          const next = [...correctIndices];
          const idx  = next.indexOf(i);
          if (idx > -1) next.splice(idx, 1); else next.push(i);
          setDsl({ ...dsl, correct_indices: next });
        };
        const addOption    = () => setDsl({ ...dsl, options: [...options, ''] });
        const removeOption = (i: number) => {
          const next = options.filter((_, j) => j !== i);
          setDsl({ ...dsl, options: next, ...(isMulti ? { correct_indices: correctIndices.filter(x => x !== i).map(x => x > i ? x - 1 : x) } : { correct_index: Math.min(correctIndex, next.length - 1) }) });
        };

        return (
          <div className="v2-editor-group">
            {renderBodyField()}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="option-grid-header">
                <span>✓</span><span>Option (text, image, audio, or GIF)</span><span></span>
              </div>
              {options.map((opt, i) => {
                const checked = isMulti ? correctIndices.includes(i) : correctIndex === i;
                return (
                  <div key={i} className="option-row">
                    <input
                      type={isMulti ? 'checkbox' : 'radio'}
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleCorrect(i)}
                      style={{ marginTop: 2 }}
                    />
                    <TextOrMediaInput
                      value={opt}
                      onChange={v => setOption(i, v)}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      disabled={disabled}
                    />
                    {!disabled && options.length > 2 && (
                      <button className="icon-btn danger" onClick={() => removeOption(i)} tabIndex={-1}><X size={13} /></button>
                    )}
                  </div>
                );
              })}
              {!disabled && options.length < 6 && (
                <button className="btn btn-outline" style={{ alignSelf: 'flex-start', fontSize: 13 }} onClick={addOption}>+ Add Option</button>
              )}
            </div>
            {renderExplField()}
          </div>
        );
      }

      // ── True / False ────────────────────────────────────────────────────────
      case 'true_false':
        return (
          <div className="v2-editor-group">
            {renderBodyField()}
            {/* Optional: the statement can itself be a media object (e.g. judge an image) */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Statement (optional media)
              <TextOrMediaInput
                value={(dsl.statement as TextOrMedia) ?? ''}
                onChange={v => setDsl({ ...dsl, statement: v })}
                placeholder="Leave blank to use question body above…"
                disabled={disabled}
              />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Correct Answer
              <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}>
                  <input type="radio" disabled={disabled} checked={dsl.correct === true}  onChange={() => setDsl({ ...dsl, correct: true })}  /> ✅ True
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}>
                  <input type="radio" disabled={disabled} checked={dsl.correct === false} onChange={() => setDsl({ ...dsl, correct: false })} /> ❌ False
                </label>
              </div>
            </label>
            {renderExplField()}
          </div>
        );

      // ── Fill in the Blank ────────────────────────────────────────────────────
      case 'fill_blank': {
        const answers: TextOrMedia[] = (dsl.answers as TextOrMedia[]) ?? [''];
        return (
          <div className="v2-editor-group">
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Question with [blank] — or upload an image that contains blanks
              <TextOrMediaInput
                value={(dsl.text_with_blanks as TextOrMedia) ?? ''}
                onChange={v => setDsl({ ...dsl, text_with_blanks: v })}
                placeholder="e.g. The capital of India is [blank]."
                multiline
                disabled={disabled}
              />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Correct Answers</span>
              {answers.map((ans, i) => (
                <div key={i} className="option-row" style={{ gridTemplateColumns: '1fr 28px' }}>
                  <TextOrMediaInput
                    value={ans}
                    onChange={v => { const next = [...answers]; next[i] = v; setDsl({ ...dsl, answers: next }); }}
                    placeholder={`Answer ${i + 1}`}
                    disabled={disabled}
                  />
                  {!disabled && answers.length > 1 && (
                    <button className="icon-btn danger" onClick={() => setDsl({ ...dsl, answers: answers.filter((_, j) => j !== i) })}><X size={13} /></button>
                  )}
                </div>
              ))}
              {!disabled && (
                <button className="btn btn-outline" style={{ alignSelf: 'flex-start', fontSize: 13 }} onClick={() => setDsl({ ...dsl, answers: [...answers, ''] })}>+ Add Answer</button>
              )}
            </div>
          </div>
        );
      }

      // ── Match the Following ──────────────────────────────────────────────────
      case 'match_following': {
        const pairs: { left: TextOrMedia; right: TextOrMedia }[] = dsl.pairs ?? [];
        const setPair = (i: number, side: 'left' | 'right', v: TextOrMedia) => {
          const next = pairs.map((p, j) => j === i ? { ...p, [side]: v } : p);
          setDsl({ ...dsl, pairs: next });
        };
        return (
          <div className="v2-editor-group">
            {renderBodyField('Instruction', false)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', padding: '0 4px 2px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <span>Left</span><span>Right</span><span></span>
              </div>
              {pairs.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', gap: 8, alignItems: 'flex-start' }}>
                  <TextOrMediaInput value={p.left}  onChange={v => setPair(i, 'left', v)}  placeholder="Left item"  disabled={disabled} />
                  <TextOrMediaInput value={p.right} onChange={v => setPair(i, 'right', v)} placeholder="Right item" disabled={disabled} />
                  {!disabled && (
                    <button className="icon-btn danger" style={{ marginTop: 6 }} onClick={() => setDsl({ ...dsl, pairs: pairs.filter((_, j) => j !== i) })}><X size={13} /></button>
                  )}
                </div>
              ))}
              {!disabled && pairs.length < 6 && (
                <button className="btn btn-outline" style={{ alignSelf: 'flex-start', fontSize: 13 }} onClick={() => setDsl({ ...dsl, pairs: [...pairs, { left: '', right: '' }] })}>+ Add Pair</button>
              )}
            </div>
          </div>
        );
      }

      // ── Short Answer ─────────────────────────────────────────────────────────
      case 'short_answer':
        return (
          <div className="v2-editor-group">
            {renderBodyField()}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Expected Answer
              <TextOrMediaInput
                value={(dsl.expected_answer as TextOrMedia) ?? ''}
                onChange={v => setDsl({ ...dsl, expected_answer: v })}
                placeholder="Model answer (may be an image)"
                multiline
                disabled={disabled}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Keywords (comma separated)
              <input className="field" disabled={disabled}
                value={((dsl.keywords as string[]) ?? []).join(', ')}
                onChange={e => setDsl({ ...dsl, keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              />
            </label>
            {renderExplField()}
          </div>
        );

      // ── Article ──────────────────────────────────────────────────────────────
      case 'article':
        return (
          <div className="v2-editor-group">
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Article Title
              <input className="field" value={item.meta.title} disabled={disabled}
                onChange={e => updateMeta(item.localId, { title: e.target.value })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Article Body (text or cover image / audio)
              <TextOrMediaInput
                value={(dsl.body as TextOrMedia) ?? ''}
                onChange={v => setDsl({ ...dsl, body: v })}
                placeholder="Article content… (Markdown supported for text)"
                multiline
                disabled={disabled}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Est. Read Time (sec)
              <input type="number" className="field" disabled={disabled}
                value={dsl.read_time_sec ?? 300}
                onChange={e => setDsl({ ...dsl, read_time_sec: Number(e.target.value) })}
              />
            </label>
          </div>
        );

      // ── Video ────────────────────────────────────────────────────────────────
      case 'video':
        return (
          <div className="v2-editor-group">
            {renderBodyField('Question / Context', false)}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Video URL
              <input className="field" disabled={disabled} value={dsl.video_url ?? ''}
                onChange={e => setDsl({ ...dsl, video_url: e.target.value })} />
            </label>
            <label className="btn btn-primary" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
              <UploadCloud size={15} /> Upload Video
              <input type="file" hidden accept="video/*" onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                updateItem(item.localId, { saving: true });
                try {
                  const url = await uploadMedia(f, `content_media/${Date.now()}_${f.name}`);
                  setDsl({ ...dsl, video_url: url });
                } catch { alert('Upload failed'); }
                finally { updateItem(item.localId, { saving: false }); e.currentTarget.value = ''; }
              }} />
            </label>
          </div>
        );

      // ── Drag & Drop ──────────────────────────────────────────────────────────
      case 'drag_drop': {
        const items2: { id: string; label: TextOrMedia }[] = dsl.items ?? [];
        const zones:  { id: string; label: TextOrMedia }[] = dsl.drop_zones ?? [];
        const correct: Record<string, string> = dsl.correct ?? {};

        return (
          <div className="v2-editor-group">
            {renderBodyField()}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Draggable Items</div>
              {items2.map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <input className="field" style={{ width: 64, flexShrink: 0 }} placeholder="ID" disabled={disabled}
                    value={it.id}
                    onChange={e => { const n = [...items2]; n[i] = { ...it, id: e.target.value }; setDsl({ ...dsl, items: n }); }}
                  />
                  <TextOrMediaInput value={it.label} onChange={v => { const n = [...items2]; n[i] = { ...it, label: v }; setDsl({ ...dsl, items: n }); }} placeholder="Item label" disabled={disabled} />
                  {!disabled && <button className="icon-btn danger" style={{ marginTop: 6 }} onClick={() => setDsl({ ...dsl, items: items2.filter((_, j) => j !== i) })}><X size={13} /></button>}
                </div>
              ))}
              {!disabled && <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => setDsl({ ...dsl, items: [...items2, { id: String(items2.length + 1), label: '' }] })}>+ Item</button>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Drop Zones</div>
              {zones.map((z, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <input className="field" style={{ width: 64, flexShrink: 0 }} placeholder="ID" disabled={disabled}
                    value={z.id}
                    onChange={e => { const n = [...zones]; n[i] = { ...z, id: e.target.value }; setDsl({ ...dsl, drop_zones: n }); }}
                  />
                  <TextOrMediaInput value={z.label} onChange={v => { const n = [...zones]; n[i] = { ...z, label: v }; setDsl({ ...dsl, drop_zones: n }); }} placeholder="Zone label" disabled={disabled} />
                  {!disabled && <button className="icon-btn danger" style={{ marginTop: 6 }} onClick={() => setDsl({ ...dsl, drop_zones: zones.filter((_, j) => j !== i) })}><X size={13} /></button>}
                </div>
              ))}
              {!disabled && <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => setDsl({ ...dsl, drop_zones: [...zones, { id: String.fromCharCode(65 + zones.length), label: '' }] })}>+ Zone</button>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Correct Mapping (item ID → zone ID)</div>
              {items2.map(it => (
                <div key={it.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, minWidth: 60, color: 'var(--text-secondary)' }}>{it.id}</span>
                  <select className="field" disabled={disabled} value={correct[it.id] ?? ''}
                    onChange={e => setDsl({ ...dsl, correct: { ...correct, [it.id]: e.target.value } })}>
                    <option value="">Select zone…</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.id}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── Categorization ───────────────────────────────────────────────────────
      case 'categorization': {
        const cats:  TextOrMedia[]                              = dsl.categories ?? [];
        const citems: { label: TextOrMedia; correct_category: string }[] = dsl.items ?? [];
        return (
          <div className="v2-editor-group">
            {renderBodyField()}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Categories</div>
              {cats.map((cat, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <TextOrMediaInput value={cat} onChange={v => { const n = [...cats]; n[i] = v; setDsl({ ...dsl, categories: n }); }} placeholder={`Category ${i + 1}`} disabled={disabled} />
                  {!disabled && cats.length > 2 && <button className="icon-btn danger" style={{ marginTop: 6 }} onClick={() => setDsl({ ...dsl, categories: cats.filter((_, j) => j !== i) })}><X size={13} /></button>}
                </div>
              ))}
              {!disabled && <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => setDsl({ ...dsl, categories: [...cats, ''] })}>+ Category</button>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Items</div>
              {citems.map((ci, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <TextOrMediaInput value={ci.label} onChange={v => { const n = [...citems]; n[i] = { ...ci, label: v }; setDsl({ ...dsl, items: n }); }} placeholder="Item label" disabled={disabled} />
                  <select className="field" style={{ flexShrink: 0, width: 160 }} disabled={disabled}
                    value={ci.correct_category}
                    onChange={e => { const n = [...citems]; n[i] = { ...ci, correct_category: e.target.value }; setDsl({ ...dsl, items: n }); }}>
                    <option value="">Category…</option>
                    {cats.map((c, j) => <option key={j} value={typeof c === 'string' ? c : c.value ?? ''}>{typeof c === 'string' ? c : c.value ?? `Cat ${j + 1}`}</option>)}
                  </select>
                  {!disabled && <button className="icon-btn danger" style={{ marginTop: 6 }} onClick={() => setDsl({ ...dsl, items: citems.filter((_, j) => j !== i) })}><X size={13} /></button>}
                </div>
              ))}
              {!disabled && <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => setDsl({ ...dsl, items: [...citems, { label: '', correct_category: '' }] })}>+ Item</button>}
            </div>
          </div>
        );
      }

      // ── Hotspot ──────────────────────────────────────────────────────────────
      case 'hotspot': {
        const hotspots: { x: number; y: number; radius: number; label: TextOrMedia; is_correct?: boolean }[] = dsl.hotspots ?? [];
        return (
          <div className="v2-editor-group">
            {renderBodyField('Question', false)}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Background Image URL
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="field" disabled={disabled} value={dsl.image_url ?? ''}
                  onChange={e => setDsl({ ...dsl, image_url: e.target.value })} />
                <label className="btn btn-outline" style={{ cursor: 'pointer', flexShrink: 0 }}>
                  Upload
                  <input type="file" hidden accept="image/*" onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const url = await uploadMedia(f, `content_media/${Date.now()}_${f.name}`);
                    setDsl({ ...dsl, image_url: url }); e.currentTarget.value = '';
                  }} />
                </label>
              </div>
            </label>
            {dsl.image_url && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                💡 Hotspot positions are percentages (0–100) of the image dimensions.
              </div>
            )}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Hotspot Points</div>
              {hotspots.map((hs, i) => (
                <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                    {(['x', 'y', 'radius'] as const).map(k => (
                      <label key={k} style={{ fontSize: 12 }}>
                        {k === 'x' ? 'X %' : k === 'y' ? 'Y %' : 'Radius'}
                        <input type="number" className="field" disabled={disabled} value={hs[k]}
                          onChange={e => { const n = [...hotspots]; (n[i] as any)[k] = Number(e.target.value); setDsl({ ...dsl, hotspots: n }); }}
                        />
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Label (text or audio)</div>
                      <TextOrMediaInput
                        value={hs.label}
                        onChange={v => { const n = [...hotspots]; n[i] = { ...hs, label: v }; setDsl({ ...dsl, hotspots: n }); }}
                        placeholder="Hotspot label"
                        disabled={disabled}
                      />
                    </div>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, marginTop: 22, flexShrink: 0 }}>
                      <input type="checkbox" disabled={disabled} checked={hs.is_correct ?? false}
                        onChange={e => { const n = [...hotspots]; n[i] = { ...hs, is_correct: e.target.checked }; setDsl({ ...dsl, hotspots: n }); }}
                      /> Correct
                    </label>
                    {!disabled && (
                      <button className="icon-btn danger" style={{ marginTop: 22 }} onClick={() => setDsl({ ...dsl, hotspots: hotspots.filter((_, j) => j !== i) })}><X size={13} /></button>
                    )}
                  </div>
                </div>
              ))}
              {!disabled && (
                <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => setDsl({ ...dsl, hotspots: [...hotspots, { x: 50, y: 50, radius: 20, label: '', is_correct: false }] })}>+ Hotspot</button>
              )}
            </div>
          </div>
        );
      }

      // ── Voice Answer ─────────────────────────────────────────────────────────
      case 'voice_answer':
        return (
          <div className="v2-editor-group">
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Prompt (text, image, or audio)
              <TextOrMediaInput
                value={(dsl.prompt as TextOrMedia) ?? ''}
                onChange={v => setDsl({ ...dsl, prompt: v })}
                placeholder="What should the student respond to?"
                multiline
                disabled={disabled}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Keywords (comma separated)
              <input className="field" disabled={disabled}
                value={((dsl.expected_keywords as string[]) ?? []).join(', ')}
                onChange={e => setDsl({ ...dsl, expected_keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Max Duration (sec)
              <input type="number" className="field" disabled={disabled}
                value={dsl.max_duration_sec ?? 30}
                onChange={e => setDsl({ ...dsl, max_duration_sec: Number(e.target.value) })}
              />
            </label>
          </div>
        );

      // ── Case Study ───────────────────────────────────────────────────────────
      case 'case_study':
        return (
          <div className="v2-editor-group">
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Passage / Stimulus (text, image, or audio)
              <TextOrMediaInput
                value={(dsl.passage as TextOrMedia) ?? ''}
                onChange={v => setDsl({ ...dsl, passage: v })}
                placeholder="Enter the case study passage, or upload an image / audio…"
                multiline
                disabled={disabled}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Child Item IDs (comma separated)
              <input className="field" disabled={disabled}
                value={((dsl.child_items as string[]) ?? []).join(', ')}
                onChange={e => setDsl({ ...dsl, child_items: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="id1, id2, id3…"
              />
            </label>
          </div>
        );

      // ── PDF ──────────────────────────────────────────────────────────────────
      case 'pdf':
        return (
          <div className="v2-editor-group">
            {renderBodyField('Context / Instruction', false)}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              PDF URL
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="field" disabled={disabled} value={dsl.pdf_url ?? ''}
                  onChange={e => setDsl({ ...dsl, pdf_url: e.target.value })} />
                <label className="btn btn-outline" style={{ cursor: 'pointer', flexShrink: 0 }}>
                  Upload PDF
                  <input type="file" hidden accept="application/pdf" onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const url = await uploadMedia(f, `content_media/${Date.now()}_${f.name}`);
                    setDsl({ ...dsl, pdf_url: url }); e.currentTarget.value = '';
                  }} />
                </label>
              </div>
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ k: 'page_count', l: 'Page Count' }, { k: 'start_page', l: 'Start Page' }].map(({ k, l }) => (
                <label key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
                  {l}<input type="number" className="field" disabled={disabled} value={(dsl as any)[k] ?? 1} onChange={e => setDsl({ ...dsl, [k]: Number(e.target.value) })} />
                </label>
              ))}
            </div>
          </div>
        );

      // ── Interactive Graph ─────────────────────────────────────────────────────
      case 'interactive_graph':
        return (
          <div className="v2-editor-group">
            {renderBodyField('Question (text or image)')}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Chart Type
              <select className="field" disabled={disabled} value={dsl.chart_type ?? 'bar'}
                onChange={e => setDsl({ ...dsl, chart_type: e.target.value })}>
                {['bar', 'line', 'pie', 'scatter', 'histogram'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ k: 'x_label', l: 'X-Axis Label' }, { k: 'y_label', l: 'Y-Axis Label' }].map(({ k, l }) => (
                <label key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
                  {l}<input className="field" disabled={disabled} value={(dsl as any)[k] ?? ''} onChange={e => setDsl({ ...dsl, [k]: e.target.value })} />
                </label>
              ))}
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Data (JSON array)
              <textarea className="field code-field" rows={5} disabled={disabled}
                value={JSON.stringify(dsl.data ?? [], null, 2)}
                onChange={e => { try { setDsl({ ...dsl, data: JSON.parse(e.target.value) }); } catch { /* keep raw */ } }}
              />
            </label>
          </div>
        );

      // ── Slider Simulation ─────────────────────────────────────────────────────
      case 'slider_simulation':
        return (
          <div className="v2-editor-group">
            {renderBodyField('Question / Context')}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Slider Label (text or image)
              <TextOrMediaInput
                value={(dsl.label as TextOrMedia) ?? ''}
                onChange={v => setDsl({ ...dsl, label: v })}
                placeholder="e.g. Temperature (°C)"
                disabled={disabled}
              />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[{ k: 'min', l: 'Min' }, { k: 'max', l: 'Max' }, { k: 'step', l: 'Step' }, { k: 'correct_value', l: 'Correct Value' }].map(({ k, l }) => (
                <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
                  {l}<input type="number" className="field" disabled={disabled} value={(dsl as any)[k] ?? 0} onChange={e => setDsl({ ...dsl, [k]: Number(e.target.value) })} />
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
                Unit<input className="field" disabled={disabled} value={dsl.unit ?? ''} onChange={e => setDsl({ ...dsl, unit: e.target.value })} />
              </label>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
                Tolerance (± accepted delta)
                <input type="number" className="field" disabled={disabled} value={dsl.tolerance ?? 0} onChange={e => setDsl({ ...dsl, tolerance: Number(e.target.value) })} />
              </label>
            </div>
          </div>
        );

      // ── Logic Puzzle ──────────────────────────────────────────────────────────
      case 'logic_puzzle': {
        const hints: TextOrMedia[] = (dsl.hints as TextOrMedia[]) ?? [];
        return (
          <div className="v2-editor-group">
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Puzzle (text, image, or audio)
              <TextOrMediaInput
                value={(dsl.puzzle as TextOrMedia) ?? ''}
                onChange={v => setDsl({ ...dsl, puzzle: v })}
                placeholder="Describe the puzzle…"
                multiline disabled={disabled}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Answer
              <TextOrMediaInput
                value={(dsl.answer as TextOrMedia) ?? ''}
                onChange={v => setDsl({ ...dsl, answer: v })}
                placeholder="Correct answer"
                disabled={disabled}
              />
            </label>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Hints</div>
              {hints.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <TextOrMediaInput value={h} onChange={v => { const n = [...hints]; n[i] = v; setDsl({ ...dsl, hints: n }); }} placeholder={`Hint ${i + 1}`} disabled={disabled} />
                  {!disabled && <button className="icon-btn danger" style={{ marginTop: 6 }} onClick={() => setDsl({ ...dsl, hints: hints.filter((_, j) => j !== i) })}><X size={13} /></button>}
                </div>
              ))}
              {!disabled && <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => setDsl({ ...dsl, hints: [...hints, ''] })}>+ Hint</button>}
            </div>
            {renderExplField()}
          </div>
        );
      }

      // ── Fallback ─────────────────────────────────────────────────────────────
      default:
        return (
          <div className="v2-editor-group">
            {renderBodyField()}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              DSL Params (JSON)
              <textarea className="field textarea code-field" value={item.dsl_params}
                onChange={e => updateItem(item.localId, { dsl_params: e.target.value })} />
            </label>
          </div>
        );
    }
  };

  // ── Phone preview ─────────────────────────────────────────────────────────────

  const renderPhoneContent = (item: LocalContent) => {
    const dsl = parseDsl(item);

    // Renders the question body media (image/audio/gif) above the options
    const QuestionMedia = () => {
      if (!item.content.body) return null;
      const b = item.content.body;
      if (typeof b === 'object' && b.kind !== 'text') {
        return (
          <div className="phone-question-img">
            <RenderTOM v={b} imgStyle={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
          </div>
        );
      }
      return null;
    };

    // Parses fill-blank template and renders slots inline
    const FillBlankText = ({ template }: { template: TextOrMedia }) => {
      if (typeof template === 'object' && template.kind !== 'text') {
        return <RenderTOM v={template} />;
      }
      const raw = typeof template === 'string' ? template : (template.value ?? '');
      const parts = raw.split('[blank]');
      return (
        <span>
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {i < parts.length - 1 && <span className="phone-blank-slot" />}
            </span>
          ))}
        </span>
      );
    };

    // Option label — text, or icon badge for audio
    const OptionLabel = ({ v, index }: { v: TextOrMedia; index: number }) => {
      const letter = String.fromCharCode(65 + index); // A, B, C…
      if (typeof v === 'object' && v.kind === 'audio') {
        return (
          <div className="phone-audio-option">
            <span className="phone-audio-badge">🎵</span>
            <span style={{ fontSize: 13, color: '#475569' }}>Tap to play</span>
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
          <span className="phone-option-letter">{letter}</span>
          <span style={{ flex: 1 }}><RenderTOM v={v} imgStyle={{ maxHeight: 52, borderRadius: 8, objectFit: 'cover' }} /></span>
        </div>
      );
    };

    // Option card for grid (image-focused)
    const OptionCard = ({ v, index, selected, onClick }: { v: TextOrMedia; index: number; selected: boolean; onClick: () => void }) => {
      const isImg = typeof v === 'object' && (v.kind === 'image' || v.kind === 'gif');
      const isAudio = typeof v === 'object' && v.kind === 'audio';
      return (
        <div className={`phone-option-card${selected ? ' selected' : ''}`} onClick={onClick}>
          {isImg && v.url && <img src={v.url} alt="" className="phone-card-img" />}
          {isAudio && <div className="phone-audio-badge large">🎵</div>}
          {!isImg && !isAudio && (
            <span style={{ fontSize: 14, fontWeight: 500 }}><RenderTOM v={v} /></span>
          )}
          {(isImg || isAudio) && (
            <span style={{ fontSize: 12, color: selected ? '#7c3aed' : '#475569', marginTop: 4, fontWeight: 500 }}>
              {typeof v === 'object' && v.caption ? v.caption : String.fromCharCode(65 + index)}
            </span>
          )}
        </div>
      );
    };

    switch (item.type) {

      // ── MCQ ────────────────────────────────────────────────────────────────────
      case 'mcq_single':
      case 'mcq_multi': {
        const options: TextOrMedia[] = (dsl.options as TextOrMedia[]) ?? [];
        const hasMedia   = options.some(o => typeof o === 'object' && o.kind !== 'text');
        const isMulti    = item.type === 'mcq_multi';
        const sel        = (i: number) => previewSelected === i;
        const toggle     = (i: number) => setPreviewSelected(sel(i) ? null : i);

        return (
          <>
            <QuestionMedia />
            {hasMedia ? (
              // 2-column media grid
              <div className="phone-options-grid media">
                {options.map((opt, i) => (
                  <OptionCard key={i} v={opt} index={i} selected={sel(i)} onClick={() => toggle(i)} />
                ))}
              </div>
            ) : options.length >= 4 ? (
              // 2-column text grid
              <div className="phone-options-grid">
                {options.map((opt, i) => (
                  <div key={i} className={`phone-option-card${sel(i) ? ' selected' : ''}`} onClick={() => toggle(i)}>
                    <span className="phone-option-letter">{String.fromCharCode(65 + i)}</span>
                    <span style={{ fontSize: 14 }}><RenderTOM v={opt} /></span>
                  </div>
                ))}
              </div>
            ) : (
              // Single-column pill list
              <div className="phone-options-list">
                {options.map((opt, i) => (
                  <div key={i} className={`phone-option-pill${sel(i) ? ' correct' : ''}`} onClick={() => toggle(i)}>
                    <OptionLabel v={opt} index={i} />
                    {isMulti && (
                      <span className={`phone-check-box${sel(i) ? ' checked' : ''}`}>{sel(i) ? '✓' : ''}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {dsl.explanation && previewSelected !== null && (
              <div className="phone-explanation">
                💡 <RenderTOM v={dsl.explanation as TextOrMedia} />
              </div>
            )}
          </>
        );
      }

      // ── True / False ───────────────────────────────────────────────────────────
      case 'true_false': {
        const stmt = dsl.statement as TextOrMedia | undefined;
        return (
          <div style={{ padding: '0 20px 16px' }}>
            <QuestionMedia />
            {stmt && (
              <div className="phone-tf-statement">
                <RenderTOM v={stmt} imgStyle={{ maxWidth: '100%', borderRadius: 12 }} />
              </div>
            )}
            <div className="phone-tf-cards">
              {[
                { label: 'TRUE',  emoji: '✅', bg: '#f0fdf4', border: '#86efac', text: '#15803d', i: 0 },
                { label: 'FALSE', emoji: '❌', bg: '#fff1f2', border: '#fca5a5', text: '#dc2626', i: 1 },
              ].map(({ label, emoji, bg, border, text, i }) => (
                <div
                  key={i}
                  className="phone-tf-card"
                  onClick={() => setPreviewSelected(previewSelected === i ? null : i)}
                  style={{
                    background:   previewSelected === i ? bg       : '#f8fafc',
                    borderColor:  previewSelected === i ? border   : '#e2e8f0',
                    color:        previewSelected === i ? text     : '#475569',
                  }}
                >
                  <span className="phone-tf-emoji">{emoji}</span>
                  <span className="phone-tf-label">{label}</span>
                </div>
              ))}
            </div>
            {dsl.explanation && previewSelected !== null && (
              <div className="phone-explanation">💡 <RenderTOM v={dsl.explanation as TextOrMedia} /></div>
            )}
          </div>
        );
      }

      // ── Fill in the Blank ──────────────────────────────────────────────────────
      case 'fill_blank': {
        const template = (dsl.text_with_blanks as TextOrMedia) ?? '';
        const answers: TextOrMedia[] = (dsl.answers as TextOrMedia[]) ?? [];
        return (
          <div style={{ paddingBottom: 12 }}>
            <QuestionMedia />
            <div className="phone-fill-prompt">
              <FillBlankText template={template} />
            </div>
            {answers.length > 0 && (
              <>
                <div className="phone-wordbank-label">Choose an answer</div>
                <div className="phone-wordbank">
                  {answers.slice(0, 8).map((w, i) => (
                    <div key={i} className="phone-word-chip">
                      <RenderTOM v={w} imgStyle={{ height: 28, borderRadius: 6, objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      }

      // ── Short Answer ───────────────────────────────────────────────────────────
      case 'short_answer': {
        const keywords: string[] = (dsl.keywords as string[]) ?? [];
        return (
          <div style={{ paddingBottom: 16 }}>
            <QuestionMedia />
            <div className="phone-short-area">
              <div className="phone-short-placeholder">Write your answer here…</div>
              {[1, 2, 3].map(n => <div key={n} className="phone-answer-line" style={{ marginTop: n === 1 ? 32 : 0 }}><span>{n}.</span></div>)}
            </div>
            {keywords.length > 0 && (
              <div style={{ padding: '8px 20px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginRight: 4, alignSelf: 'center' }}>KEYWORDS</span>
                {keywords.slice(0, 5).map((kw, i) => (
                  <span key={i} style={{ background: '#f3f0ff', color: '#7c3aed', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{kw}</span>
                ))}
              </div>
            )}
          </div>
        );
      }

      // ── Match the Following ────────────────────────────────────────────────────
      case 'match_following': {
        const pairs: { left: TextOrMedia; right: TextOrMedia }[] = dsl.pairs ?? [];
        const PAIR_COLORS = [
          { border: '#c4b5fd', bg: '#faf5ff', text: '#7c3aed', dot: '#7c3aed' },
          { border: '#86efac', bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
          { border: '#fca5a5', bg: '#fff1f2', text: '#dc2626', dot: '#ef4444' },
          { border: '#fde68a', bg: '#fffbeb', text: '#92400e', dot: '#f59e0b' },
        ];
        // Shuffle right side for the "match" UX
        const rightShuffled = [...pairs.map((_, i) => i)].reverse();
        return (
          <div className="phone-match-layout">
            {/* Left column */}
            <div className="phone-match-col">
              {pairs.map((p, i) => {
                const c = PAIR_COLORS[i % PAIR_COLORS.length];
                return (
                  <div key={i} className="phone-match-card" style={{ borderColor: c.border, background: c.bg }}>
                    <span className="phone-match-dot" style={{ background: c.dot }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.text, flex: 1 }}>
                      <RenderTOM v={p.left} imgStyle={{ maxHeight: 50, borderRadius: 8 }} />
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Line divider */}
            <div className="phone-match-divider">
              {pairs.map((_, i) => <div key={i} className="phone-match-line" />)}
            </div>
            {/* Right column — shuffled */}
            <div className="phone-match-col">
              {rightShuffled.map((origIdx, i) => {
                const p = pairs[origIdx];
                const c = PAIR_COLORS[origIdx % PAIR_COLORS.length];
                return (
                  <div key={i} className="phone-match-card right" style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', flex: 1 }}>
                      <RenderTOM v={p.right} imgStyle={{ maxHeight: 50, borderRadius: 8 }} />
                    </span>
                    <span className="phone-match-dot" style={{ background: c.dot }} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // ── Article ────────────────────────────────────────────────────────────────
      case 'article': {
        const body = dsl.body as TextOrMedia | undefined;
        const readSec = (dsl.read_time_sec as number) ?? 0;
        const isBodyMedia = body && typeof body === 'object' && body.kind !== 'text';
        return (
          <div style={{ paddingBottom: 16 }}>
            {isBodyMedia && (
              <div className="phone-article-cover">
                <RenderTOM v={body!} imgStyle={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
              </div>
            )}
            {readSec > 0 && (
              <div style={{ padding: '10px 20px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="phone-read-chip">📖 {Math.ceil(readSec / 60)} min read</span>
              </div>
            )}
            <div className="phone-article-body">
              {!body
                ? <span style={{ color: '#94a3b8' }}>Article content will appear here.</span>
                : isBodyMedia ? <span style={{ color: '#64748b', fontSize: 13 }}>Media content — see cover above.</span>
                : <RenderTOM v={body} />}
            </div>
          </div>
        );
      }

      // ── Video ──────────────────────────────────────────────────────────────────
      case 'video':
        return (
          <div style={{ padding: '12px 20px 20px' }}>
            <QuestionMedia />
            {dsl.video_url ? (
              <video src={dsl.video_url as string} controls className="phone-video-player" />
            ) : (
              <div className="phone-video-placeholder">
                <span className="phone-video-play">▶</span>
                <span style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>Video will play here</span>
              </div>
            )}
            {(dsl.start_time_sec || dsl.end_time_sec) && (
              <div className="phone-video-range">
                <span>▶ {dsl.start_time_sec ?? 0}s</span>
                <div className="phone-video-track"><div className="phone-video-fill" /></div>
                <span>⏹ {dsl.end_time_sec ?? 0}s</span>
              </div>
            )}
          </div>
        );

      // ── Drag & Drop ────────────────────────────────────────────────────────────
      case 'drag_drop': {
        const dragItems: { id: string; label: TextOrMedia }[] = dsl.items ?? [];
        const dropZones: { id: string; label: TextOrMedia }[] = dsl.drop_zones ?? [];
        const CHIP_COLORS = ['#f3f0ff', '#fef3c7', '#ecfdf5', '#fff1f2', '#e0f2fe'];
        const CHIP_TEXT   = ['#7c3aed', '#92400e', '#15803d', '#dc2626', '#0369a1'];
        return (
          <div style={{ padding: '8px 20px 16px' }}>
            <QuestionMedia />
            {/* Drop zones */}
            <div className="phone-drop-zones">
              {dropZones.map((z) => (
                <div key={z.id} className="phone-drop-zone">
                  <span className="phone-drop-zone-label"><RenderTOM v={z.label} /></span>
                  <div className="phone-drop-target" />
                </div>
              ))}
            </div>
            {/* Draggable items */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', margin: '14px 0 8px', textTransform: 'uppercase' }}>Drag items above ↑</div>
            <div className="phone-drag-items">
              {dragItems.map((it, i) => (
                <div key={it.id} className="phone-drag-chip"
                  style={{ background: CHIP_COLORS[i % CHIP_COLORS.length], color: CHIP_TEXT[i % CHIP_TEXT.length] }}>
                  <span style={{ cursor: 'grab', color: '#94a3b8', fontSize: 12 }}>⠿⠿</span>
                  <RenderTOM v={it.label} imgStyle={{ height: 28, borderRadius: 6 }} />
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── Categorization ─────────────────────────────────────────────────────────
      case 'categorization': {
        const cats:  TextOrMedia[]                                       = dsl.categories ?? [];
        const citems: { label: TextOrMedia; correct_category: string }[] = dsl.items ?? [];
        const CAT_COLORS = [
          { h: '#f3f0ff', b: '#c4b5fd', t: '#7c3aed' },
          { h: '#ecfdf5', b: '#86efac', t: '#15803d' },
          { h: '#fff7ed', b: '#fed7aa', t: '#c2410c' },
          { h: '#eff6ff', b: '#bfdbfe', t: '#1d4ed8' },
        ];
        return (
          <div style={{ padding: '8px 20px 16px' }}>
            <QuestionMedia />
            <div className="phone-cat-cols">
              {cats.slice(0, 4).map((cat, ci) => {
                const c = CAT_COLORS[ci % CAT_COLORS.length];
                const catKey = typeof cat === 'string' ? cat : cat.value ?? '';
                const placed = citems.filter(it => it.correct_category === catKey);
                return (
                  <div key={ci} className="phone-cat-col">
                    <div className="phone-cat-header" style={{ background: c.h, borderColor: c.b, color: c.t }}>
                      <RenderTOM v={cat} />
                    </div>
                    <div className="phone-cat-body" style={{ borderColor: c.b }}>
                      {placed.slice(0, 3).map((it, j) => (
                        <div key={j} className="phone-cat-item" style={{ background: c.h, color: c.t }}>
                          <RenderTOM v={it.label} imgStyle={{ height: 22, borderRadius: 4 }} />
                        </div>
                      ))}
                      {placed.length === 0 && <div className="phone-cat-empty">Drop here</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Item pool */}
            <div className="phone-drag-items" style={{ marginTop: 12 }}>
              {citems.slice(0, 6).map((it, i) => (
                <div key={i} className="phone-drag-chip" style={{ background: '#f8fafc', color: '#334155' }}>
                  <span style={{ cursor: 'grab', color: '#94a3b8', fontSize: 12 }}>⠿⠿</span>
                  <RenderTOM v={it.label} imgStyle={{ height: 24, borderRadius: 4 }} />
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── Hotspot ────────────────────────────────────────────────────────────────
      case 'hotspot': {
        const hotspots: { x: number; y: number; radius: number; label: TextOrMedia; is_correct?: boolean }[] = dsl.hotspots ?? [];
        return (
          <div style={{ padding: '12px 20px 16px' }}>
            <div className="phone-hotspot-wrap">
              {dsl.image_url ? (
                <img src={dsl.image_url as string} alt="" className="phone-hotspot-img" />
              ) : (
                <div className="phone-hotspot-placeholder">
                  <span style={{ fontSize: 32 }}>🗺️</span>
                  <span style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>Upload image to see hotspots</span>
                </div>
              )}
              {hotspots.map((hs, i) => (
                <div
                  key={i}
                  className={`phone-hotspot-dot${hs.is_correct ? ' correct' : ''}`}
                  style={{ left: `${hs.x}%`, top: `${hs.y}%`, width: hs.radius * 2, height: hs.radius * 2 }}
                  title={typeof hs.label === 'string' ? hs.label : hs.label.caption ?? ''}
                >
                  <span className="phone-hotspot-num">{i + 1}</span>
                </div>
              ))}
            </div>
            {hotspots.length > 0 && (
              <div className="phone-hotspot-legend">
                {hotspots.map((hs, i) => (
                  <div key={i} className="phone-hotspot-legend-row">
                    <span className={`phone-hotspot-badge${hs.is_correct ? ' correct' : ''}`}>{i + 1}</span>
                    <span style={{ fontSize: 12, color: '#334155' }}><RenderTOM v={hs.label} /></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      // ── Voice Answer ───────────────────────────────────────────────────────────
      case 'voice_answer': {
        const prompt = dsl.prompt as TextOrMedia | undefined;
        const dur    = (dsl.max_duration_sec as number) ?? 30;
        return (
          <div style={{ padding: '12px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {prompt && (
              <div className="phone-voice-prompt">
                <RenderTOM v={prompt} imgStyle={{ maxWidth: '100%', borderRadius: 12 }} />
              </div>
            )}
            {/* Waveform decoration */}
            <div className="phone-waveform">
              {Array.from({ length: 24 }).map((_, i) => {
                const h = [20, 40, 60, 80, 55, 35, 70, 90, 45, 30, 75, 50, 65, 85, 40, 55, 70, 35, 50, 80, 30, 60, 45, 25];
                return <div key={i} className="phone-wave-bar" style={{ height: h[i] }} />;
              })}
            </div>
            <div className="phone-voice-timer">{dur}s limit</div>
            <div className="phone-voice-mic">🎤</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Tap to record</div>
          </div>
        );
      }

      // ── Case Study ─────────────────────────────────────────────────────────────
      case 'case_study': {
        const passage   = dsl.passage as TextOrMedia | undefined;
        const childIds: string[] = dsl.child_items ?? [];
        return (
          <div style={{ padding: '12px 20px 16px' }}>
            <div className="phone-case-passage">
              <div className="phone-case-label">📄 Read the passage</div>
              {passage
                ? <div className="phone-case-text"><RenderTOM v={passage} imgStyle={{ maxWidth: '100%', borderRadius: 10 }} /></div>
                : <div style={{ color: '#94a3b8', fontSize: 13, padding: '8px 0' }}>Passage will appear here.</div>}
            </div>
            {childIds.length > 0 && (
              <div className="phone-case-count">
                ❓ {childIds.length} question{childIds.length !== 1 ? 's' : ''} based on this passage
              </div>
            )}
          </div>
        );
      }

      // ── PDF ────────────────────────────────────────────────────────────────────
      case 'pdf': {
        const pdfUrl  = dsl.pdf_url as string | undefined;
        const pages   = (dsl.page_count as number) ?? 1;
        const startPg = (dsl.start_page  as number) ?? 1;
        return (
          <div style={{ padding: '12px 20px 20px' }}>
            <QuestionMedia />
            <div className="phone-pdf-viewer">
              <div className="phone-pdf-icon">📄</div>
              {pdfUrl
                ? <><span className="phone-pdf-filename">{pdfUrl.split('/').pop()}</span><span className="phone-pdf-meta">Page {startPg} of {pages}</span></>
                : <span style={{ fontSize: 13, color: '#94a3b8' }}>PDF will load here</span>}
              <div className="phone-pdf-nav">
                <button className="phone-pdf-btn">‹ Prev</button>
                <span className="phone-pdf-pg">{startPg}</span>
                <button className="phone-pdf-btn">Next ›</button>
              </div>
            </div>
          </div>
        );
      }

      // ── Interactive Graph ──────────────────────────────────────────────────────
      case 'interactive_graph': {
        const chartType = (dsl.chart_type as string) ?? 'bar';
        const data      = (dsl.data as Record<string, any>[]) ?? [];
        const xLabel    = dsl.x_label as string | undefined;
        const yLabel    = dsl.y_label as string | undefined;
        const question  = dsl.question as TextOrMedia | undefined;

        // Build bar values from first numeric key
        const numKey = data[0] ? Object.keys(data[0]).find(k => typeof data[0][k] === 'number') : undefined;
        const vals   = numKey ? data.map(d => Number(d[numKey] ?? 0)) : [];
        const maxVal = Math.max(...vals, 1);
        const labels = data.map(d => d.label ?? d.x ?? '');

        return (
          <div style={{ padding: '12px 20px 20px' }}>
            {question && (
              <div style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
                <RenderTOM v={question} />
              </div>
            )}
            <div className="phone-chart-wrap">
              {yLabel && <div className="phone-chart-ylabel">{yLabel}</div>}
              <div className="phone-bar-chart">
                {data.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: 13, padding: 20 }}>No data yet</div>
                ) : (
                  vals.map((v, i) => (
                    <div key={i} className="phone-bar-col">
                      <span className="phone-bar-val">{v}</span>
                      <div className="phone-bar" style={{ height: `${(v / maxVal) * 100}%` }} />
                      <span className="phone-bar-label">{labels[i]}</span>
                    </div>
                  ))
                )}
              </div>
              {xLabel && <div className="phone-chart-xlabel">{xLabel}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {['bar', 'line', 'pie'].map(t => (
                <span key={t} className={`phone-chart-tab${t === chartType ? ' active' : ''}`}>{t}</span>
              ))}
            </div>
          </div>
        );
      }

      // ── Slider Simulation ──────────────────────────────────────────────────────
      case 'slider_simulation': {
        const min    = (dsl.min           as number) ?? 0;
        const max    = (dsl.max           as number) ?? 100;
        const step   = (dsl.step          as number) ?? 1;
        const corr   = (dsl.correct_value as number) ?? 50;
        const unit   = (dsl.unit          as string) ?? '';
        const label  = dsl.label          as TextOrMedia | undefined;
        const tol    = (dsl.tolerance     as number) ?? 0;

        return (
          <div style={{ padding: '16px 24px 24px' }}>
            <QuestionMedia />
            {label && (
              <div className="phone-slider-label">
                <RenderTOM v={label} imgStyle={{ maxHeight: 60, borderRadius: 8 }} />
              </div>
            )}
            <div className="phone-slider-wrap">
              <input
                type="range" min={min} max={max} step={step} defaultValue={Math.round((min + max) / 2)}
                className="phone-slider-input"
              />
              <div className="phone-slider-ticks">
                {[0, 25, 50, 75, 100].map(pct => {
                  const val = Math.round(min + (pct / 100) * (max - min));
                  return <span key={pct} className="phone-slider-tick">{val}</span>;
                })}
              </div>
            </div>
            <div className="phone-slider-meta">
              <span style={{ color: '#64748b', fontSize: 12 }}>Range: {min}{unit} – {max}{unit}</span>
              {tol > 0 && <span className="phone-slider-tol">±{tol}{unit} tolerance</span>}
            </div>
            <div className="phone-slider-answer-hint">
              Correct: <strong>{corr}{unit}</strong>
            </div>
          </div>
        );
      }

      // ── Logic Puzzle ───────────────────────────────────────────────────────────
      case 'logic_puzzle': {
        const puzzle:  TextOrMedia        = (dsl.puzzle as TextOrMedia) ?? '';
        const hints:   TextOrMedia[]      = (dsl.hints  as TextOrMedia[]) ?? [];
        const explain: TextOrMedia | undefined = dsl.explanation as TextOrMedia | undefined;
        return (
          <div style={{ padding: '12px 20px 20px' }}>
            <QuestionMedia />
            <div className="phone-puzzle-card">
              <div className="phone-puzzle-icon">🧩</div>
              <div className="phone-puzzle-text">
                <RenderTOM v={puzzle} imgStyle={{ maxWidth: '100%', borderRadius: 10 }} />
              </div>
            </div>
            {hints.length > 0 && (
              <div className="phone-hints-section">
                <div className="phone-hints-header">💡 Hints</div>
                {hints.slice(0, 3).map((h, i) => (
                  <div key={i} className="phone-hint-chip">
                    <span className="phone-hint-num">{i + 1}</span>
                    <RenderTOM v={h} />
                  </div>
                ))}
              </div>
            )}
            <div className="phone-short-area" style={{ marginTop: 12 }}>
              <div className="phone-short-placeholder">Your answer…</div>
              {[1, 2].map(n => <div key={n} className="phone-answer-line" style={{ marginTop: n === 1 ? 28 : 0 }}><span>{n}.</span></div>)}
            </div>
            {explain && previewSelected !== null && (
              <div className="phone-explanation">💡 <RenderTOM v={explain} /></div>
            )}
          </div>
        );
      }

      // ── Default ────────────────────────────────────────────────────────────────
      default:
        return (
          <div style={{ padding: '12px 20px', color: '#94a3b8', fontSize: 14 }}>
            {item.content.body ? <RenderTOM v={item.content.body} /> : `Preview for "${item.type}" coming soon.`}
          </div>
        );
    }
  };

  // ── CRUD helpers ──────────────────────────────────────────────────────────────

  const addItem = () => {
    const item = blankItem(activeLevel);
    setItems(prev => ({ ...prev, [activeLevel]: [...prev[activeLevel], item] }));
    setActiveId(item.localId);
  };

  const removeItem = (localId: string) =>
    setItems(prev => ({ ...prev, [activeLevel]: prev[activeLevel].filter(i => i.localId !== localId) }));

  const copyToLevel = (item: LocalContent, level: ContentLevel) => {
    const copy = { ...JSON.parse(JSON.stringify(item)), localId: `local_${Date.now()}`, firestoreId: undefined, meta: { ...item.meta, level }, state: 'draft' as ContentStatus, saved: false };
    setItems(prev => ({ ...prev, [level]: [...prev[level], copy] }));
  };

  const saveItem = async (item: LocalContent, nextState: ContentStatus = item.state) => {
    if (!user || !curriculum || !chapterId || !topicId) {
      return alert('Select curriculum, chapter, and topic before saving.');
    }
    updateItem(item.localId, { saving: true });

    let parsedDsl: Record<string, unknown> = {};
    try {
      parsedDsl = JSON.parse(item.dsl_params || '{}');
    } catch {
      alert('Error: Invalid JSON in DSL Params.');
      updateItem(item.localId, { saving: false });
      return;
    }

    const validation = validateDsl(item.type, parsedDsl);
    if (!validation.success) {
      alert(`Validation Error:\n${validation.error}`);
      updateItem(item.localId, { saving: false });
      return;
    }

    const payload: Omit<ContentItem, 'id'> = {
      version: 2, type: item.type, state: nextState,
      taxonomy: { curriculum_id: curriculum.id!, chapter_id: chapterId, topic_id: topicId, board: curriculum.board, medium: curriculum.medium, subject: curriculum.subject, class: curriculum.class },
      meta: { ...item.meta }, media: { ...item.media },
      scoring: { ...item.scoring }, behavior: { ...item.behavior },
      content: { ...item.content },
      dsl_params: parsedDsl, tracking: { ...item.tracking },
      created_by: user.uid,
    };

    try {
      if (item.firestoreId) {
        await updateContentItem(item.firestoreId, payload);
      } else {
        const id = await addContentItem(payload);
        updateItem(item.localId, { firestoreId: id });
      }
      updateItem(item.localId, { saving: false, saved: true, state: nextState });
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
      updateItem(item.localId, { saving: false });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="builder-screen">
      {/* ── Phone preview modal ─────────────────────────── */}
      {previewItem && (
        <div className="modal-backdrop" onClick={() => { setPreviewItem(null); setPreviewSelected(null); }}>
          <div className="phone-preview-shell" onClick={e => e.stopPropagation()}>
            <button className="preview-close" onClick={() => { setPreviewItem(null); setPreviewSelected(null); }}>✕</button>
            <div className="phone-frame">
              <div className="phone-statusbar"><span>9:41</span><span>📶 🛜 🔋</span></div>
              <div className="phone-progress-track"><div className="phone-progress-fill" /></div>
              <div className="phone-topbar">
                <div className="phone-close-icon">✕</div>
                <div className="phone-topic-chip"><span>⁛</span>{curriculum?.subject ?? previewItem.type}</div>
                <div className="phone-topbar-actions">
                  <div className="phone-icon-pill filled">🔊</div>
                  <div className="phone-icon-pill">Aあ</div>
                </div>
              </div>
              <div className="phone-question">
                {previewItem.meta.title || (typeof previewItem.content.body === 'string' ? previewItem.content.body : 'Add a title to preview')}
              </div>
              {renderPhoneContent(previewItem)}
              <div style={{ flex: 1, minHeight: 16 }} />
              <button className="phone-cta">→</button>
              <div className="phone-home-bar" />
            </div>
          </div>
        </div>
      )}

      {/* ── Page heading ─────────────────────────────────── */}
      <div className="page-heading">
        <div>
          <h1>{embedded ? 'Topic Content' : 'Content Builder'}</h1>
          <p>{embedded && initialSelection?.label ? initialSelection.label : 'Create reusable learning content.'}</p>
        </div>
        <button className="btn btn-outline" onClick={() => activeItem && setPreviewItem(activeItem)}><Eye size={16} /> Preview in App</button>
      </div>

      {/* ── Location wizard ──────────────────────────────── */}
      {!embedded && (
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: 'none', border: 'none', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', borderBottom: locationOpen ? '1px solid var(--border-color)' : 'none' }}
            onClick={() => setLocationOpen(o => !o)}>
            <span style={{ fontSize: 18 }}>📍</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
              {topicId
                ? <>{curriculum?.title ?? curriculumId} <span style={{ color: 'var(--text-secondary)' }}>›</span> {chapters.find(c => c.id === chapterId)?.name ?? 'Chapter'} <span style={{ color: 'var(--text-secondary)' }}>›</span> {topics.find(t => t.id === topicId)?.name ?? 'Topic'}</>
                : <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>Choose Curriculum › Chapter › Topic</span>}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{locationOpen ? '▲' : '▼'}</span>
          </button>
          {locationOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '16px 20px' }}>
              {([
                { label: '1 · Curriculum', value: curriculumId, opts: curricula.map(c => ({ v: c.id!, l: c.title })), onChange: (v: string) => { setCurriculumId(v); setChapterId(''); setTopicId(''); } },
                { label: '2 · Chapter',    value: chapterId,    opts: chapters.map(c  => ({ v: c.id!, l: c.name })),   onChange: (v: string) => { setChapterId(v); setTopicId(''); }, disabled: !curriculumId },
                { label: '3 · Topic',      value: topicId,      opts: topics.map(t    => ({ v: t.id!, l: t.name })),   onChange: (v: string) => { setTopicId(v); if (v) setLocationOpen(false); },                  disabled: !chapterId },
              ] as const).map(({ label, value, opts, onChange, ...rest }) => (
                <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {label}
                  <select className="field" value={value} disabled={'disabled' in rest ? rest.disabled : false} onChange={e => onChange(e.target.value)}>
                    <option value="">Select…</option>
                    {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Level tabs ───────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginRight: 4 }}>Level:</span>
        {LEVELS.map(level => (
          <button key={level.id}
            onClick={() => { setActiveLevel(level.id); setActiveId(items[level.id]?.[0]?.localId ?? null); }}
            style={{ padding: '6px 14px', borderRadius: 999, border: `1.5px solid ${activeLevel === level.id ? level.color : 'var(--border-color)'}`, background: activeLevel === level.id ? level.color + '22' : 'transparent', color: activeLevel === level.id ? level.color : 'var(--text-secondary)', fontWeight: activeLevel === level.id ? 700 : 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
            {level.label}
            <span style={{ background: activeLevel === level.id ? level.color : 'var(--border-color)', color: activeLevel === level.id ? '#fff' : 'var(--text-secondary)', borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
              {items[level.id]?.length ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Builder layout ───────────────────────────────── */}
      <section className="builder-layout">
        <aside className="content-rail">
          <div className="flex-between">
            <h2>Content</h2>
            <button className="icon-btn" onClick={addItem}><Plus size={17} /></button>
          </div>
          {levelItems.map((item, index) => {
            const ct = CONTENT_TYPES.find(t => t.id === item.type);
            const Icon = ct?.icon ?? FileText;
            return (
              <button key={item.localId} className={`content-row ${activeItem?.localId === item.localId ? 'active' : ''}`} onClick={() => setActiveId(item.localId)}>
                <Icon size={16} />
                <span>{item.meta.title || `Untitled ${index + 1}`}</span>
                {item.saved && <Check size={14} />}
              </button>
            );
          })}
        </aside>

        {activeItem ? (
          <article className="card editor-panel">
            <div className="editor-header">
              <div>
                <h2>{activeItem.meta.title || 'New Content Item'}</h2>
                <p>{activeItem.firestoreId ? `ID: ${activeItem.firestoreId}` : 'Saved on first publish.'}</p>
              </div>
              <span className={`badge ${activeItem.state === 'published' ? 'badge-success' : activeItem.state === 'review' ? 'badge-info' : 'badge-warning'}`}>
                {activeItem.state === 'review' ? 'In Review' : activeItem.state}
              </span>
            </div>

            <div className="editor-grid two">
              <label>Title<input className="field" value={activeItem.meta.title} disabled={isLocked} onChange={e => updateMeta(activeItem.localId, { title: e.target.value })} placeholder="Admin title" /></label>
              <label>Content Type
                <select className="field" value={activeItem.type} disabled={isLocked}
                  onChange={e => updateItem(activeItem.localId, { type: e.target.value as ContentType, dsl_params: DEFAULT_DSL[e.target.value] ?? '{}' })}>
                  {CONTENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
            </div>

            <div className="editor-grid two" style={{ marginTop: 12 }}>
              <label>⭐ XP Points<input type="number" className="field" value={activeItem.scoring.marks} disabled={isLocked} onChange={e => updateItem(activeItem.localId, { scoring: { ...activeItem.scoring, marks: Number(e.target.value) } })} /></label>
              <label>Time Limit (sec)<input type="number" className="field" value={activeItem.meta.time_estimate_sec} disabled={isLocked} onChange={e => updateMeta(activeItem.localId, { time_estimate_sec: Number(e.target.value) })} /></label>
            </div>

            <div className="dynamic-editor-fields">
              {renderDynamicEditorFields(activeItem)}
            </div>

            <div className="editor-actions">
              <div>
                <button className="btn btn-outline" onClick={() => setPreviewItem(activeItem)}><Eye size={16} /> Preview</button>
                {LEVELS.filter(l => l.id !== activeLevel).map(l => (
                  <button key={l.id} className="btn btn-outline" onClick={() => copyToLevel(activeItem, l.id)}><Copy size={15} /> {l.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline danger" onClick={() => removeItem(activeItem.localId)}><Trash2 size={16} /> Delete</button>
                <button className="btn btn-primary" onClick={() => saveItem(activeItem, 'draft')} disabled={activeItem.saving}>
                  <Save size={16} /> {activeItem.saving ? 'Saving…' : 'Save Draft'}
                </button>
                <button className="btn btn-primary" style={{ background: '#7c3aed', border: 'none' }} onClick={() => saveItem(activeItem, 'review')} disabled={activeItem.saving}>
                  <Send size={16} /> Submit for Review
                </button>
              </div>
            </div>
          </article>
        ) : (
          <div className="empty-state">Add a content item to begin.</div>
        )}
      </section>
    </div>
  );
}
