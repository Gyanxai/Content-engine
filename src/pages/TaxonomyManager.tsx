import { useState, useEffect } from 'react';
import {
  getChapters, getTopics, getSubtopics,
  addChapter, updateChapter, deleteChapter,
  addTopic, updateTopic, deleteTopic,
  addSubtopic, updateSubtopic, deleteSubtopic
} from '../services/contentService';
import type { Chapter, Topic, Subtopic } from '../services/contentService';
import { aiService } from '../services/aiService';
import { 
  Plus, Trash2, Edit2, ChevronRight, ChevronDown, BookOpen, Layers, Target, X, 
  GripVertical, Sparkles 
} from 'lucide-react';

// DND Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SUBJECTS = ['Mathematics', 'Science'];
const CLASSES = ['5', '6', '7', '8', '9', '10', '11', '12'];

// --- Components ---

function SortableItem({ id, children, active }: { id: string, children: React.ReactNode, active?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={active ? 'sortable-active' : ''}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--text-secondary)', display: 'flex' }}>
          <GripVertical size={16} />
        </div>
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

interface TaxonomyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  title: string;
  initialValue?: string;
}

function TaxonomyModal({ isOpen, onClose, onSave, title, initialValue = '' }: TaxonomyModalProps) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => { setValue(initialValue); }, [initialValue, isOpen]);
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div className="card" style={{ width: '400px', padding: '24px', border: '1px solid var(--border-color)', animation: 'modalSlide 0.3s ease-out' }}>
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 18 }}>{title}</h3>
          <X size={20} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={onClose} />
        </div>
        <input 
          autoFocus
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', backgroundColor: '#0a0a0a', color: 'inherit', fontFamily: 'inherit', outline: 'none' }}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSave(value)}
          placeholder="Enter name..."
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button className="btn" style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(value)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function TaxonomyManager() {
  const [subject, setSubject] = useState('Mathematics');
  const [cls, setCls] = useState('9');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  const [topics, setTopics] = useState<Record<string, Topic[]>>({});
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [subtopics, setSubtopics] = useState<Record<string, Subtopic[]>>({});
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [modal, setModal] = useState<{isOpen: boolean; title: string; initialValue: string; onSave: (val: string) => void;}>({ isOpen: false, title: '', initialValue: '', onSave: () => {} });

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => { loadChapters(); }, [subject, cls]);

  const loadChapters = async () => {
    setLoading(true);
    const results = await getChapters(subject, cls);
    setChapters(results.sort((a, b) => (a.order || 0) - (b.order || 0)));
    setLoading(false);
  };

  const handleDragEndChapters = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = chapters.findIndex(i => i.id === active.id);
      const newIndex = chapters.findIndex(i => i.id === over.id);
      const newItems = arrayMove(chapters, oldIndex, newIndex);
      
      setChapters(newItems);
      
      // Sync to DB outside of state setter
      newItems.forEach((item, index) => {
        updateChapter(item.id!, { order: index });
      });
    }
  };

  const handleDragEndTopics = async (chapterId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const items = topics[chapterId] || [];
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      
      setTopics(prev => ({ ...prev, [chapterId]: newItems }));
      
      // Sync to DB
      newItems.forEach((item, index) => {
        updateTopic(item.id!, { order: index });
      });
    }
  };

  const toggleChapter = async (id: string) => {
    if (expandedChapter === id) {
      setExpandedChapter(null);
    } else {
      setExpandedChapter(id);
      if (!topics[id]) {
        const results = await getTopics(id);
        setTopics(prev => ({ ...prev, [id]: results.sort((a,b) => (a.order||0) - (b.order||0)) }));
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
        setSubtopics(prev => ({ ...prev, [id]: results.sort((a,b) => (a.order||0) - (b.order||0)) }));
      }
    }
  };

  const openModal = (title: string, initial: string, onSave: (val: string) => void) => {
    setModal({ isOpen: true, title, initialValue: initial, onSave: (val) => { onSave(val); setModal(m => ({ ...m, isOpen: false })); } });
  };

  const handleAISuggest = async (chapter: Chapter) => {
    setAiLoading(true);
    const suggestions = await aiService.suggestTopics(chapter.name);
    for (const name of suggestions) {
      const id = await addTopic({ chapter_id: chapter.id!, name, order: (topics[chapter.id!]?.length || 0) });
      setTopics(prev => ({
        ...prev,
        [chapter.id!]: [...(prev[chapter.id!] || []), { id, chapter_id: chapter.id!, name, order: (prev[chapter.id!]?.length || 0) }]
      }));
    }
    setAiLoading(false);
  };

  const handleAddChapter = () => openModal('New Chapter', '', async (name) => {
    if (!name) return;
    const id = await addChapter({ subject, class: cls, name, order: chapters.length, status: 'draft' });
    setChapters(prev => [...prev, { id, subject, class: cls, name, order: prev.length, status: 'draft' }]);
  });

  const handleEditChapter = (chapter: Chapter) => openModal('Edit Chapter', chapter.name, async (name) => {
    if (!name || name === chapter.name) return;
    await updateChapter(chapter.id!, { name });
    setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, name } : c));
  });

  const handleAddTopic = (chapterId: string) => openModal('New Topic', '', async (name) => {
    if (!name) return;
    const id = await addTopic({ chapter_id: chapterId, name, order: (topics[chapterId]?.length || 0) });
    setTopics(prev => ({ ...prev, [chapterId]: [...(prev[chapterId] || []), { id, chapter_id: chapterId, name, order: (prev[chapterId]?.length || 0) }] }));
  });

  const handleEditTopic = (chapterId: string, topic: Topic) => openModal('Edit Topic', topic.name, async (name) => {
    if (!name || name === topic.name) return;
    await updateTopic(topic.id!, { name });
    setTopics(prev => ({ ...prev, [chapterId]: prev[chapterId].map(t => t.id === topic.id ? { ...t, name } : t) }));
  });

  const handleAddSubtopic = (topicId: string) => openModal('New Subtopic', '', async (name) => {
    if (!name) return;
    const id = await addSubtopic({ topic_id: topicId, name, order: (subtopics[topicId]?.length || 0), type: 'lesson', status: 'draft' });
    setSubtopics(prev => ({ ...prev, [topicId]: [...(prev[topicId] || []), { id, topic_id: topicId, name, order: (prev[topicId]?.length || 0), type: 'lesson', status: 'draft' }] }));
  });

  const handleEditSubtopic = (topicId: string, sub: Subtopic) => openModal('Edit Subtopic', sub.name, async (name) => {
    if (!name || name === sub.name) return;
    await updateSubtopic(sub.id!, { name });
    setSubtopics(prev => ({ ...prev, [topicId]: prev[topicId].map(s => s.id === sub.id ? { ...s, name } : s) }));
  });

  const handleDeleteChapter = async (id: string) => {
    if (!confirm('Delete chapter?')) return;
    await deleteChapter(id);
    setChapters(prev => prev.filter(c => c.id !== id));
  };

  const selectStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', backgroundColor: '#0a0a0a', color: 'inherit', fontSize: 14, outline: 'none' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TaxonomyModal {...modal} onClose={() => setModal(m => ({ ...m, isOpen: false }))} />
      <div className="flex-between">
        <div><h1>Learning Path Manager</h1><p style={{ color: 'var(--text-secondary)' }}>Structure curriculum with AI assistance and Drag-and-Drop.</p></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select style={selectStyle} value={subject} onChange={e => setSubject(e.target.value)}>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
          <select style={selectStyle} value={cls} onChange={e => setCls(e.target.value)}>{CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}</select>
        </div>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}><BookOpen size={20} /> Chapters</h2>
          <button className="btn btn-primary" onClick={handleAddChapter}><Plus size={16} /> Add Chapter</button>
        </div>

        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Loading hierarchy…</div> : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndChapters}>
            <SortableContext items={chapters.map(c => c.id!).filter(Boolean)} strategy={verticalListSortingStrategy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {chapters.map(chapter => (
                  <SortableItem key={chapter.id} id={chapter.id!}>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', backgroundColor: expandedChapter === chapter.id ? 'rgba(138,92,255,0.05)' : 'transparent', cursor: 'pointer' }} onClick={() => toggleChapter(chapter.id!)}>
                        {expandedChapter === chapter.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        <div style={{ flex: 1, fontWeight: 600 }}>{chapter.name}</div>
                        <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                          <button style={{ background: 'none', border: 'none', color: 'var(--primary-purple)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 4, backgroundColor: 'rgba(138,92,255,0.1)' }} onClick={() => handleAISuggest(chapter)} disabled={aiLoading}>
                            <Sparkles size={14} /> {aiLoading ? 'Thinking...' : 'AI Suggest'}
                          </button>
                          <Edit2 size={16} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => handleEditChapter(chapter)} />
                          <Trash2 size={16} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => handleDeleteChapter(chapter.id!)} />
                        </div>
                      </div>

                      {expandedChapter === chapter.id && (
                        <div style={{ padding: '0 18px 18px 48px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div className="flex-between" style={{ marginTop: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Layers size={14} /> Topics</span>
                            <button onClick={() => handleAddTopic(chapter.id!)} style={{ background: 'none', border: 'none', color: 'var(--primary-purple)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Topic</button>
                          </div>
                          
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEndTopics(chapter.id!, e)}>
                            <SortableContext items={(topics[chapter.id!] || []).map(t => t.id!).filter(Boolean)} strategy={verticalListSortingStrategy}>
                              {(topics[chapter.id!] || []).map(topic => (
                                <SortableItem key={topic.id} id={topic.id!}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'pointer' }} onClick={() => toggleTopic(topic.id!)}>
                                      {expandedTopic === topic.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                      <span style={{ flex: 1, fontSize: 14 }}>{topic.name}</span>
                                      <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                                        <Edit2 size={14} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => handleEditTopic(chapter.id!, topic)} />
                                        <Trash2 size={14} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => { deleteTopic(topic.id!); setTopics(p => ({ ...p, [chapter.id!]: p[chapter.id!].filter(t => t.id !== topic.id) })); }} />
                                      </div>
                                    </div>
                                    {expandedTopic === topic.id && (
                                      <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {(subtopics[topic.id!] || []).map(sub => (
                                          <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 13, backgroundColor: 'rgba(255,255,255,0.01)' }}>
                                            <Target size={14} color="var(--primary-purple)" />
                                            <span style={{ flex: 1 }}>{sub.name}</span>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                              <button 
                                                onClick={() => window.location.href = `/builder?subtopic=${sub.id}`}
                                                style={{ background: 'none', border: '1px solid var(--primary-purple)', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: 'var(--primary-purple)', cursor: 'pointer', fontWeight: 600 }}
                                              >
                                                Questions
                                              </button>
                                              <Edit2 size={13} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => handleEditSubtopic(topic.id!, sub)} />
                                              <Trash2 size={13} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => { if(confirm('Delete subtopic?')) { deleteSubtopic(sub.id!); setSubtopics(p => ({ ...p, [topic.id!]: p[topic.id!].filter(s => s.id !== sub.id) })); } }} />
                                            </div>
                                          </div>
                                        ))}
                                        <button onClick={() => handleAddSubtopic(topic.id!)} style={{ padding: '6px', border: '1px dashed var(--border-color)', borderRadius: 6, background: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>+ Add Subtopic</button>
                                      </div>
                                    )}
                                  </div>
                                </SortableItem>
                              ))}
                            </SortableContext>
                          </DndContext>
                        </div>
                      )}
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
