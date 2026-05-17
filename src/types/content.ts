import { Timestamp } from 'firebase/firestore';

// ── Rich media primitives ─────────────────────────────────────────────────────

type RichMediaKind = 'text' | 'image' | 'audio' | 'gif';

interface RichContent {
  kind: RichMediaKind;
  value?: string;    // plain text when kind = 'text'
  url?: string;      // hosted URL when kind = 'image' | 'audio' | 'gif'
  caption?: string;  // label shown beneath any media block
  alt?: string;      // accessibility text for image / gif
}

// Every option, answer, prompt, or body field accepts plain text OR a media block
type TextOrMedia = string | RichContent;

// ── Taxonomy & status ─────────────────────────────────────────────────────────

type ContentStatus = 'draft' | 'review' | 'published';
type ContentLevel  = 'lv0' | 'lv1' | 'lv2' | 'lv3';
type QuestionLevel = ContentLevel;
type Board         = 'NCERT' | 'ICSE' | 'CBSE';
type Medium        = 'English' | 'Hindi' | 'Kannada';
type Subject       = 'Mathematics' | 'Science';
type ContentType   =
  | 'mcq_single' | 'mcq_multi' | 'true_false' | 'fill_blank'
  | 'match_following' | 'short_answer' | 'article' | 'video'
  | 'drag_drop' | 'categorization' | 'hotspot' | 'voice_answer' | 'case_study'
  | 'pdf' | 'interactive_graph' | 'slider_simulation' | 'logic_puzzle';

export type { ContentType };
export type QuestionType = ContentType;

// ── Translation ───────────────────────────────────────────────────────────────

interface TranslationContent {
  text:         TextOrMedia;
  options?:     TextOrMedia[];
  answer?:      TextOrMedia;
  explanation?: TextOrMedia;
}

// ── Hierarchy ─────────────────────────────────────────────────────────────────

interface Curriculum {
  id?:         string;
  board:       Board;
  medium:      Medium;
  class:       string;
  subject:     Subject;
  title:       string;
  state:       ContentStatus;
  created_by?: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

interface Chapter {
  id?:         string;
  curriculum_id: string;
  name:        string;
  order:       number;
  state:       ContentStatus;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  board?:      Board;
  medium?:     Medium;
  subject?:    Subject;
  class?:      string;
}

interface Topic {
  id?:           string;
  curriculum_id: string;
  chapter_id:    string;
  name:          string;
  order:         number;
  created_at?:   Timestamp;
  updated_at?:   Timestamp;
}

interface Subtopic {
  id?:           string;
  curriculum_id: string;
  chapter_id:    string;
  topic_id:      string;
  name:          string;
  order:         number;
  type:          'lesson' | 'quiz' | 'practice';
  state:         ContentStatus;
  created_at?:   Timestamp;
  updated_at?:   Timestamp;
}

// ── Core content item ─────────────────────────────────────────────────────────

interface ContentItem {
  id?:     string;
  version: number;

  type:  ContentType;
  state: ContentStatus;

  taxonomy: {
    curriculum_id: string;
    chapter_id:    string;
    topic_id:      string;
    subtopic_id?:  string;
    board?:        Board;
    medium?:       Medium;
    subject?:      Subject;
    class?:        string;
  };

  meta: {
    title:            string;
    instruction:      string;
    difficulty:       'easy' | 'medium' | 'hard';
    level:            ContentLevel;
    tags:             string[];
    skills:           string[];
    time_estimate_sec: number;
    icon?:            string;
    lottie_url?:      string;
  };

  // Top-level media attachment for the question itself (image/video/audio/pdf)
  media: {
    type: 'image' | 'video' | 'audio' | 'pdf' | null;
    url?: string;
    thumbnail_url?: string;
  };

  scoring: {
    marks:            number;
    negative_marks?:  number;
    partial_scoring?: boolean;
  };

  behavior: {
    shuffle_options?:              boolean;
    max_attempts?:                 number;
    show_explanation_after_attempt?: boolean;
    retry_enabled?:                boolean;
    time_limit_sec?:               number;
  };

  // The question prompt — can be plain text OR a rich media block
  content: {
    body?: TextOrMedia;
  };

  // Type-specific DSL (options, answers, pairs, etc.) — see dslValidator.ts
  dsl_params: any;

  tracking: {
    concept_id?: string;
    skill?:      string;
  };

  created_by?:  string;
  reviewed_by?: string | null;
  created_at?:  Timestamp;
  updated_at?:  Timestamp;
}

// ── Exports ───────────────────────────────────────────────────────────────────

export type {
  RichMediaKind, RichContent, TextOrMedia,
  ContentStatus, ContentLevel, QuestionLevel,
  Board, Medium, Subject,
  TranslationContent,
  Curriculum, Chapter, Topic, Subtopic, ContentItem,
};
