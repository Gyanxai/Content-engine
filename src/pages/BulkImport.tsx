import { useState, useRef } from 'react';
import Papa from 'papaparse';
import type { Question } from '../services/contentService';
import { bulkWriteQuestions } from '../services/contentService';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Download, CheckCircle, AlertTriangle } from 'lucide-react';

type CsvRow = Record<string, string>;

const REQUIRED_COLS = ['subject', 'class', 'chapter_id', 'topic_id', 'subtopic_id', 'type', 'level', 'text_en'];

const TEMPLATE_CSV = [
  'subject,class,chapter_id,topic_id,subtopic_id,type,level,difficulty,text_en,option1_en,option2_en,option3_en,option4_en,answer_en,explanation_en,text_hi,answer_hi,lottie_url',
  'Mathematics,9,coord_geo,distance_formula,intro,mcq,lv1,0.5,"What is the distance formula?","√((x2-x1)²+(y2-y1)²)","x2-x1","y2+y1","x1*x2","√((x2-x1)²+(y2-y1)²)","Using Pythagoras theorem","दूरी सूत्र क्या है?","√((x2-x1)²+(y2-y1)²)",""',
].join('\n');

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gyanx_questions_template.csv';
  a.click();
}

function rowToQuestion(row: CsvRow, uid: string): Omit<Question, 'id'> | null {
  for (const col of REQUIRED_COLS) if (!row[col]) return null;
  return {
    subject: row.subject,
    class: row.class,
    chapter_id: row.chapter_id,
    topic_id: row.topic_id,
    subtopic_id: row.subtopic_id,
    type: row.type as Question['type'],
    level: row.level as Question['level'],
    difficulty: parseFloat(row.difficulty || '0.5'),
    order: 0,
    status: 'draft',
    lottie_url: row.lottie_url || '',
    media_url: '',
    dsl_params: {},
    content_en: {
      text: row.text_en,
      options: [row.option1_en, row.option2_en, row.option3_en, row.option4_en].filter(Boolean),
      answer: row.answer_en || '',
      explanation: row.explanation_en || '',
    },
    content_hi: row.text_hi ? { text: row.text_hi, answer: row.answer_hi || '' } : undefined,
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
      header: true, skipEmptyLines: true,
      complete: ({ data }) => {
        setRows(data);
        const bad = data.map((r, i) => REQUIRED_COLS.some(c => !r[c]) ? i : -1).filter(i => i >= 0);
        setErrors(bad);
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

  const reset = () => { setRows([]); setErrors([]); setStatus('idle'); setUploaded(0); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="flex-between">
        <div><h1>Bulk Import</h1><p style={{ color: 'var(--text-secondary)' }}>Upload CSV to batch-create questions in Firestore.</p></div>
        <button onClick={downloadTemplate} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={16} /> Download Template
        </button>
      </div>

      {status === 'idle' && (
        <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{ border: '2px dashed var(--border-color)', borderRadius: 16, padding: '64px 32px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--primary-purple)')}
          onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}>
          <Upload size={36} color="var(--primary-purple)" style={{ marginBottom: 12 }} />
          <h3>Drop your CSV file here</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>or click to browse. Supported: .csv</p>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        </div>
      )}

      {status === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 700 }}>{rows.length}</div><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Rows</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success-green)' }}>{rows.length - errors.length}</div><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Valid</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{errors.length}</div><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Errors</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={reset} className="btn btn-outline">Cancel</button>
              <button onClick={handleImport} className="btn btn-primary" disabled={rows.length === errors.length}>
                Import {rows.length - errors.length} Questions
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-main)', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>#</th>
                  {REQUIRED_COLS.map(c => <th key={c} style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{c}</th>)}
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const hasError = errors.includes(i);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: hasError ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{i + 1}</td>
                      {REQUIRED_COLS.map(c => (
                        <td key={c} style={{ padding: '8px 12px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: !row[c] ? '#ef4444' : 'var(--text-primary)' }}>
                          {row[c] || <span style={{ color: '#ef4444' }}>MISSING</span>}
                        </td>
                      ))}
                      <td style={{ padding: '8px 12px' }}>
                        {hasError
                          ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', fontSize: 12 }}><AlertTriangle size={12} /> Error</span>
                          : <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success-green)', fontSize: 12 }}><CheckCircle size={12} /> OK</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {status === 'uploading' && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
          <h3>Uploading to Firestore…</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Writing in batches of 499. Please wait.</p>
        </div>
      )}

      {status === 'done' && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <CheckCircle size={48} color="var(--success-green)" style={{ marginBottom: 16 }} />
          <h3>{uploaded} questions imported successfully!</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>All saved as <strong>Draft</strong> in Firestore. Go to Content Library to review and publish.</p>
          <button onClick={reset} className="btn btn-primary">Import More</button>
        </div>
      )}
    </div>
  );
}

