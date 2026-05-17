# GyanX Flutter DSL Integration Guide

This document is the **single source of truth** for the Flutter Mobile Team and future AI agents. It defines exactly how the backend stores interactive content and what JSON payloads the mobile app must parse to render the "Brilliant-style" UI.

## 1. The Core Payload Structure

When the Flutter app requests content for a specific path, the backend returns an array of `ContentItem` objects. Every item follows this core schema regardless of its specific type:

```json
{
  "id": "content_item_123",
  "type": "slider_simulation",  // Defines how Flutter should render this block
  "level": "lv1",               // lv0 (Foundation), lv1 (Core), lv2 (Practice), lv3 (Challenge)
  "difficulty": 0.4,            // 0.0 to 1.0 (Used for the Mastery Loop algorithm)
  "title": "Angle of Incidence",
  "icon": "BookOpen",           // Lucide icon name mapping
  "media_url": "https://...",   // Optional: Main image or video URL
  "lottie_url": "https://...",  // Optional: Animation URL
  "file_url": "",               // Optional: PDF or external file link
  "content_en": {               // Localized text content
    "text": "Adjust the angle to see how the light refracts.",
    "options": ["A", "B"],      // Array of strings (used primarily for quizzes)
    "answer": "B",              // The correct answer string
    "explanation": "Because physics!"
  },
  "dsl_params": { ... }         // **CRITICAL**: The dynamic properties for the specific `type`
}
```

> [!IMPORTANT]
> The Flutter team must write a factory parser that reads `type` and delegates the rendering to the appropriate native UI widget, passing the `dsl_params` map to configure the interaction.

---

## 2. DSL Schemas by Content Type

Below are the expected JSON structures inside the `dsl_params` object for every content type the Admin panel generates.

### Standard Question Types

#### `quiz` / `mcq` / `trueFalse`
Classic multiple choice or boolean questions.
```json
{
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_index": 0
}
```
*Note: The frontend can also pull options directly from `content_en.options` and the correct answer string from `content_en.answer` depending on the curriculum designer's preference.*

#### `flashcard`
Flippable cards for memorization.
```json
{
  "front": "What is the powerhouse of the cell?",
  "back": "Mitochondria"
}
```
*Note: If these are empty, fallback to `title` for the front and `content_en.text` for the back.*

#### `note` (Concept Note)
Rich text blocks.
```json
{
  "blocks": [
    { "type": "paragraph", "text": "Newton's first law states..." },
    { "type": "highlight", "text": "Inertia" }
  ]
}
```

---

## 3. Interactive Question Types (Brilliant-Style)

These are the complex widgets the Flutter team must build custom renderers for.

#### `interactive_graph`
Displays a Cartesian plane where the user manipulates a line, curve, or point.
```json
{
  "equation": "y=x^2",
  "target": { "x": 3, "y": 9 },
  "tolerance": 0.1
}
```
* **Flutter Action:** Render a graph representing `equation`. Provide a draggable UI element. Check if the user's final state matches `target` within the `tolerance` threshold.

#### `slider_simulation`
Displays a dynamic SVG or animation whose state is bound to a numerical slider.
```json
{
  "variable": "angle",
  "min": 0,
  "max": 90,
  "unit": "degrees"
}
```
* **Flutter Action:** Render a slider bound between `min` and `max`. As the slider moves, update the native canvas or Lottie animation based on the `variable` (e.g., rotating a mirror).

#### `logic_puzzle`
Drag-and-drop sequencing or matching.
```json
{
  "elements": ["Solid", "Liquid", "Gas"],
  "answer_order": [0, 1, 2]
}
```
* **Flutter Action:** Render draggable tiles for each string in `elements`. Upon submission, verify if the user's layout index matches `answer_order`.

#### `step_by_step`
Progressive revelation content. The user must complete step 1 before step 2 appears.
```json
{
  "steps": [
    { "instruction": "Calculate the area of the base", "input_type": "number", "expected": 25 },
    { "instruction": "Multiply by height", "input_type": "number", "expected": 250 }
  ]
}
```
* **Flutter Action:** Render `steps[0]`. Provide a text field (`input_type`). Only reveal `steps[1]` once the user successfully inputs the `expected` value.

---

## 4. Media & External Types

#### `video`
```json
{
  "duration_seconds": 120,
  "chapters": [
    { "timestamp": 0, "title": "Intro" },
    { "timestamp": 60, "title": "Main Concept" }
  ]
}
```
* **Flutter Action:** Render a video player using `media_url`. Use `chapters` to render timeline markers.

#### `pdf` / `test`
Used for full-length examination packets or static reading materials.
```json
// PDF
{ "pages": 5 } 

// Test
{ "question_count": 10, "time_limit_seconds": 600 }
```

---

## 5. Next Steps for Mobile Implementation
1. **Model Classes:** Create a Dart class `ContentItem` that maps directly to the structure in Section 1.
2. **Widget Factory:** Build a `ContentRenderer(ContentItem item)` widget that uses a `switch(item.type)` statement to return the corresponding native Flutter widget (e.g., `return InteractiveGraphWidget(dsl: item.dslParams);`).
3. **Telemetry Sync:** When a user interacts with these widgets, the Flutter app must measure the time taken and attempts made, and send that telemetry back to the backend (`/tracking/sync` equivalent) to power the Analytics Dashboard and Mastery Loop.
