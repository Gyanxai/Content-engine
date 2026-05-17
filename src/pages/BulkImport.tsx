import { useRef, useState } from 'react';
import Papa from 'papaparse';
import type { Board, ContentItem, ContentLevel, ContentType, Medium, Question, Subject } from '../services/contentService';
import { bulkWriteQuestions } from '../services/contentService';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, CheckCircle, Download, Upload } from 'lucide-react';

type CsvRow = Record<string, string>;

const REQUIRED_COLS = [
  'curriculum_id', 'board', 'medium', 'subject', 'class',
  'chapter_id', 'topic_id', 'subtopic_id', 'type', 'level', 'text_en'
];

const TEMPLATE_CSV = [
  'curriculum_id,board,medium,subject,class,chapter_id,topic_id,subtopic_id,type,level,difficulty,title,text_en,option1_en,option2_en,option3_en,option4_en,answer_en,explanation_en,text_hi,answer_hi,lottie_url',
  'curriculumDocId,NCERT,English,Mathematics,9,chapterDocId,topicDocId,subtopicDocId,quiz,lv1,0.5,"Distance Formula","What is the distance formula?","sqrt((x2-x1)^2+(y2-y1)^2)","x2-x1","y2+y1","x1*x2","sqrt((x2-x1)^2+(y2-y1)^2)","Using Pythagoras theorem","Hindi translation here","sqrt((x2-x1)^2+(y2-y1)^2)",""',
].join('\n');

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gyanx_content_template.csv';
  a.click();
}

function rowToQuestion(row: CsvRow, uid: string): Omit<ContentItem, 'id'> | null {
  for (const col of REQUIRED_COLS) if (!row[col]) return null;
  return {
    version: 2,
    type: row.type as ContentType,
    state: 'draft',
    taxonomy: {
      curriculum_id: row.curriculum_id,
      board: row.board as Board,
      medium: row.medium as Medium,
      subject: row.subject as Subject,
      class: row.class,
      chapter_id: row.chapter_id,
      topic_id: row.topic_id,
      subtopic_id: row.subtopic_id,
    },
    meta: {
      title: row.title || row.text_en.slice(0, 80),
      instruction: '',
      difficulty: 'medium', // Default
      level: row.level as ContentLevel,
      tags: [],
      skills: [],
      time_estimate_sec: 120,
      icon: row.icon || 'BookOpen',
      lottie_url: row.lottie_url || '',
    },
    media: {
      type: row.type === 'video' ? 'video' : null,
      url: row.media_url || '',
    },
    scoring: {
      marks: 1,
    },
    behavior: {},
    content: {
      body: row.text_en,
    },
    dsl_params: {}, // Would need more complex CSV parsing for full DSL
    tracking: {},
    created_by: uid,
  };
}

export default function BulkImport() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [errors, setErrors] = useState<number[]>([]);
  const [status, setStatus] = useState<'idle' | 'preview' | 'uploading' | 'done'>('idle');
  const [uploaded, setUploaded] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        setRows(data);
        setErrors(data.map((r, i) => REQUIRED_COLS.some(c => !r[c]) ? i : -1).filter(i => i >= 0));
        setStatus('preview');
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!user) return;
    setStatus('uploading');
    const valid = rows
      .filter((_, i) => !errors.includes(i))
      .map(r => rowToQuestion(r, user.uid))
      .filter(Boolean) as Omit<Question, 'id'>[];
    await bulkWriteQuestions(valid);
    setUploaded(valid.length);
    setStatus('done');
  };

  const reset = () => {
    setRows([]);
    setErrors([]);
    setStatus('idle');
    setUploaded(0);
  };

  return (
    <div className="library-screen">
      <div className="page-heading">
        <div>
          <h1>Bulk Import</h1>
          <p>Upload CSV to batch-create content items as drafts.</p>
        </div>
        <button onClick={downloadTemplate} className="btn btn-outline"><Download size={16} /> Download Template</button>
      </div>

      {status === 'idle' && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="empty-state"
          style={{ cursor: 'pointer' }}
        >
          <Upload size={36} color="var(--primary-purple)" style={{ marginBottom: 12 }} />
          <h3>Drop your CSV file here</h3>
          <p>or click to browse. Supported: .csv</p>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      )}

      {status === 'preview' && (
        <div className="library-screen">
          <section className="card filter-panel">
            <span>{rows.length} rows</span>
            <span>{rows.length - errors.length} valid</span>
            <span>{errors.length} errors</span>
            <span style={{ flex: 1 }} />
            <button onClick={reset} className="btn btn-outline">Cancel</button>
            <button onClick={handleImport} className="btn btn-primary" disabled={rows.length === errors.length}>
              Import {rows.length - errors.length} Items
            </button>
          </section>

          <section className="card table-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    {REQUIRED_COLS.map(c => <th key={c}>{c}</th>)}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const hasError = errors.includes(i);
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        {REQUIRED_COLS.map(c => <td key={c}>{row[c] || <span style={{ color: '#ef4444' }}>Missing</span>}</td>)}
                        <td>{hasError ? <span style={{ color: '#ef4444' }}><AlertTriangle size={12} /> Error</span> : <span style={{ color: 'var(--success-green)' }}><CheckCircle size={12} /> OK</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {status === 'uploading' && <div className="empty-state">Uploading to Firestore...</div>}

      {status === 'done' && (
        <div className="empty-state">
          <CheckCircle size={48} color="var(--success-green)" style={{ marginBottom: 16 }} />
          <h3>{uploaded} content items imported successfully.</h3>
          <p>All imported items are saved as drafts.</p>
          <button onClick={reset} className="btn btn-primary">Import More</button>
        </div>
      )}
    </div>
  );
}
