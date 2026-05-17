import { z } from 'zod';
import type { ContentType } from '../types/content';

// ── Shared: text or any media block ──────────────────────────────────────────
// Every option, answer, label, prompt, or body can be:
//   • a plain string               → "Paris"
//   • { kind:'image', url:'...' }  → an image option
//   • { kind:'audio', url:'...' }  → an audio clip
//   • { kind:'gif',   url:'...' }  → an animated GIF
//   • { kind:'text',  value:'...' } → explicit text object (equivalent to string)

const RichContentSchema = z.object({
  kind:    z.enum(['text', 'image', 'audio', 'gif']),
  value:   z.string().optional(),  // text content
  url:     z.string().url().optional(),  // media URL
  caption: z.string().optional(),
  alt:     z.string().optional(),
}).refine(
  d => d.kind === 'text' ? !!d.value : !!d.url,
  { message: 'text kind requires value; image/audio/gif require url' },
);

const TextOrMediaSchema = z.union([z.string().min(1), RichContentSchema]);

// Convenience: array of text-or-media items
const TextOrMediaArray = (min = 1) => z.array(TextOrMediaSchema).min(min);

// ── MCQ ───────────────────────────────────────────────────────────────────────

const McqSingleSchema = z.object({
  options:       TextOrMediaArray(2),
  correct_index: z.number().int().min(0),
  explanation:   TextOrMediaSchema.optional(),
});

const McqMultiSchema = z.object({
  options:         TextOrMediaArray(2),
  correct_indices: z.array(z.number().int().min(0)).min(1),
  explanation:     TextOrMediaSchema.optional(),
});

// ── True / False ──────────────────────────────────────────────────────────────

const TrueFalseSchema = z.object({
  // The statement being judged can itself be media (e.g. an image to assess)
  statement:   TextOrMediaSchema.optional(),
  correct:     z.boolean(),
  explanation: TextOrMediaSchema.optional(),
});

// ── Fill in the blank ─────────────────────────────────────────────────────────

const FillBlankSchema = z.object({
  // The prompt text with [blank] placeholders; can be an image with blanks overlay
  text_with_blanks: TextOrMediaSchema,
  answers:          TextOrMediaArray(1),
});

// ── Match the following ───────────────────────────────────────────────────────

const MatchFollowingSchema = z.object({
  pairs: z.array(z.object({
    left:  TextOrMediaSchema,
    right: TextOrMediaSchema,
  })).min(1),
});

// ── Short answer ──────────────────────────────────────────────────────────────

const ShortAnswerSchema = z.object({
  expected_answer: TextOrMediaSchema,
  keywords:        z.array(z.string()).optional(),
  explanation:     TextOrMediaSchema.optional(),
});

// ── Article ───────────────────────────────────────────────────────────────────

const ArticleSchema = z.object({
  body:          TextOrMediaSchema,
  read_time_sec: z.number().int().positive().optional(),
});

// ── Video ─────────────────────────────────────────────────────────────────────

const VideoSchema = z.object({
  video_url:      z.string().url().optional(),
  start_time_sec: z.number().optional(),
  end_time_sec:   z.number().optional(),
});

// ── Drag & Drop ───────────────────────────────────────────────────────────────

const DragDropSchema = z.object({
  items: z.array(z.object({
    id:    z.string(),
    label: TextOrMediaSchema,  // draggable item — can be image/audio/gif
  })).min(2),
  drop_zones: z.array(z.object({
    id:    z.string(),
    label: TextOrMediaSchema,  // drop target label
  })).min(1),
  correct: z.record(z.string(), z.string()), // item_id → drop_zone_id
});

// ── Categorization ────────────────────────────────────────────────────────────

const CategorizationSchema = z.object({
  categories: TextOrMediaArray(2),
  items: z.array(z.object({
    label:            TextOrMediaSchema,
    correct_category: z.string(),
  })).min(2),
});

// ── Hotspot ───────────────────────────────────────────────────────────────────

const HotspotSchema = z.object({
  image_url: z.string().url(),
  hotspots: z.array(z.object({
    x:          z.number().min(0).max(100),
    y:          z.number().min(0).max(100),
    radius:     z.number().positive(),
    label:      TextOrMediaSchema,  // tooltip/label — can be audio explanation
    is_correct: z.boolean().optional(),
  })).min(1),
});

// ── Voice answer ──────────────────────────────────────────────────────────────

const VoiceAnswerSchema = z.object({
  prompt:            TextOrMediaSchema,  // what the student responds to
  expected_keywords: z.array(z.string()).optional(),
  max_duration_sec:  z.number().int().positive().optional(),
});

// ── Case study ────────────────────────────────────────────────────────────────

const CaseStudySchema = z.object({
  // The passage/stimulus can be an image, audio narration, or text
  passage:    TextOrMediaSchema,
  child_items: z.array(z.string()).min(1),
});

// ── PDF ───────────────────────────────────────────────────────────────────────

const PdfSchema = z.object({
  pdf_url:    z.string().url(),
  page_count: z.number().int().positive().optional(),
  start_page: z.number().int().min(1).optional(),
});

// ── Interactive graph ─────────────────────────────────────────────────────────

const InteractiveGraphSchema = z.object({
  chart_type:     z.enum(['bar', 'line', 'pie', 'scatter', 'histogram']),
  data:           z.array(z.record(z.string(), z.unknown())).min(1),
  x_label:        z.string().optional(),
  y_label:        z.string().optional(),
  question:       TextOrMediaSchema.optional(),
  correct_answer: z.unknown().optional(),
});

// ── Slider simulation ─────────────────────────────────────────────────────────

const SliderSimulationSchema = z.object({
  min:           z.number(),
  max:           z.number(),
  step:          z.number().positive().optional(),
  correct_value: z.number(),
  label:         TextOrMediaSchema.optional(),
  unit:          z.string().optional(),
  tolerance:     z.number().min(0).optional(),
});

// ── Logic puzzle ──────────────────────────────────────────────────────────────

const LogicPuzzleSchema = z.object({
  puzzle:      TextOrMediaSchema,
  answer:      TextOrMediaSchema,
  hints:       z.array(TextOrMediaSchema).optional(),
  explanation: TextOrMediaSchema.optional(),
});

// ── Validator map ─────────────────────────────────────────────────────────────

const VALIDATORS: Partial<Record<ContentType, z.ZodType<any>>> = {
  mcq_single:        McqSingleSchema,
  mcq_multi:         McqMultiSchema,
  true_false:        TrueFalseSchema,
  fill_blank:        FillBlankSchema,
  match_following:   MatchFollowingSchema,
  short_answer:      ShortAnswerSchema,
  article:           ArticleSchema,
  video:             VideoSchema,
  drag_drop:         DragDropSchema,
  categorization:    CategorizationSchema,
  hotspot:           HotspotSchema,
  voice_answer:      VoiceAnswerSchema,
  case_study:        CaseStudySchema,
  pdf:               PdfSchema,
  interactive_graph: InteractiveGraphSchema,
  slider_simulation: SliderSimulationSchema,
  logic_puzzle:      LogicPuzzleSchema,
};

export function validateDsl(
  type: ContentType,
  params: any,
): { success: true; data: any } | { success: false; error: string } {
  const schema = VALIDATORS[type];
  if (!schema) return { success: true, data: params };

  const result = schema.safeParse(params);
  if (result.success) return { success: true, data: result.data };

  return {
    success: false,
    error: result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
  };
}

// Exported for use in form builders / UI helpers
export { RichContentSchema as RichContentZod, TextOrMediaSchema as TextOrMediaZod };
