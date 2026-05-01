import { useState, useEffect } from 'react';
import { 
  getChapters, getTopics, getSubtopics, 
  addChapter, deleteChapter,
  addTopic, deleteTopic,
  addSubtopic, deleteSubtopic
} from '../services/contentService';
import type { Chapter, Topic, Subtopic } from '../services/contentService';
import { Plus, Trash2, ChevronRight, ChevronDown, BookOpen, Layers, Target } from 'lucide-react';

const SUBJECTS = ['Mathematics', 'Science'];
const CLASSES = ['5','6','7','8','9','10','11','12'];

export default function TaxonomyManager() {
  const [subject, setSubject] = useState('Mathematics');
  const [cls, setCls] = useState('9');
  
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [topics, setTopics] = useState<Record<string, Topic[]>>({});
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [subtopics, setSubtopics] = useState<Record<string, Subtopic[]>>({});
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChapters();
  }, [subject, cls]);

  const loadChapters = async () => {
    setLoading(true);
    const results = await getChapters(subject, cls);
    setChapters(results);
    setLoading(false);
  };

  const toggleChapter = async (id: string) => {
    if (expandedChapter === id) {
      setExpandedChapter(null);
    } else {
      setExpandedChapter(id);
      if (!topics[id]) {
        const results = await getTopics(id);
        setTopics(prev => ({ ...prev, [id]: results }));
      }
    }
  };

  const toggleTopic = async (id: string) => {
    if (expandedTopic === id) {
      setExpandedTopic(null);
    } else {
      setExpandedTopic(id);
      if (!subtopics[id]) {
        const results = await getSubtopics(id);
        setSubtopics(prev => ({ ...prev, [id]: results }));
      }
    }
  };

  const handleAddChapter = async () => {
    const name = prompt('Enter Chapter Name:');
    if (!name) return;
    const id = await addChapter({ 
      subject, class: cls, name, order: chapters.length, status: 'draft' 
    });
    setChapters(prev => [...prev, { id, subject, class: cls, name, order: prev.length, status: 'draft' }]);
  };

  const handleAddTopic = async (chapterId: string) => {
    const name = prompt('Enter Topic Name:');
    if (!name) return;
    const id = await addTopic({ chapter_id: chapterId, name, order: (topics[chapterId]?.length || 0) });
    setTopics(prev => ({
      ...prev,
      [chapterId]: [...(prev[chapterId] || []), { id, chapter_id: chapterId, name, order: (prev[chapterId]?.length || 0) }]
    }));
  };

  const handleAddSubtopic = async (topicId: string) => {
    const name = prompt('Enter Subtopic Name:');
    if (!name) return;
    const id = await addSubtopic({ topic_id: topicId, name, order: (subtopics[topicId]?.length || 0), type: 'lesson', status: 'draft' });
    setSubtopics(prev => ({
      ...prev,
      [topicId]: [...(prev[topicId] || []), { id, topic_id: topicId, name, order: (prev[topicId]?.length || 0), type: 'lesson', status: 'draft' }]
    }));
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm('Delete this chapter and all nested topics/subtopics?')) return;
    await deleteChapter(id);
    setChapters(prev => prev.filter(c => c.id !== id));
  };

  const selectStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontFamily: 'inherit', fontSize: 14, outline: 'none', backgroundColor: '#0a0a0a', color: 'inherit' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="flex-between">
        <div>
          <h1>Learning Path Manager</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manually structure chapters, topics, and subtopics.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select style={selectStyle} value={subject} onChange={e => setSubject(e.target.value)}>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select style={selectStyle} value={cls} onChange={e => setCls(e.target.value)}>
            {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}><BookOpen size={20} /> Chapters</h2>
          <button className="btn btn-primary" onClick={handleAddChapter} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Add Chapter
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>⏳ Loading hierarchy…</div>
        ) : chapters.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 12 }}>
            No chapters found for this subject/class.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chapters.map(chapter => (
              <div key={chapter.id} style={{ border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', 
                  backgroundColor: expandedChapter === chapter.id ? 'rgba(138,92,255,0.05)' : 'transparent',
                  cursor: 'pointer' 
                }} onClick={() => toggleChapter(chapter.id!)}>
                  {expandedChapter === chapter.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <div style={{ flex: 1, fontWeight: 600 }}>{chapter.name}</div>
                  <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => handleDeleteChapter(chapter.id!)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {expandedChapter === chapter.id && (
                  <div style={{ padding: '0 18px 18px 48px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Layers size={14} /> Topics
                      </span>
                      <button onClick={() => handleAddTopic(chapter.id!)} style={{ background: 'none', border: 'none', color: 'var(--primary-purple)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Plus size={14} /> Add Topic
                      </button>
                    </div>

                    {(topics[chapter.id!] || []).map(topic => (
                      <div key={topic.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ 
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', 
                          borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'pointer' 
                        }} onClick={() => toggleTopic(topic.id!)}>
                          {expandedTopic === topic.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <span style={{ flex: 1, fontSize: 14 }}>{topic.name}</span>
                          <Trash2 size={14} color="var(--text-secondary)" onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id!); setTopics(p => ({ ...p, [chapter.id!]: p[chapter.id!].filter(t => t.id !== topic.id) })); }} />
                        </div>

                        {expandedTopic === topic.id && (
                          <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(subtopics[topic.id!] || []).map(sub => (
                              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 13 }}>
                                <Target size={14} color="var(--primary-purple)" />
                                <span style={{ flex: 1 }}>{sub.name}</span>
                                <Trash2 size={13} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => { deleteSubtopic(sub.id!); setSubtopics(p => ({ ...p, [topic.id!]: p[topic.id!].filter(s => s.id !== sub.id) })); }} />
                              </div>
                            ))}
                            <button onClick={() => handleAddSubtopic(topic.id!)} style={{ padding: '6px', border: '1px dashed var(--border-color)', borderRadius: 6, background: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
                              + Add Subtopic / Learning Step
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
