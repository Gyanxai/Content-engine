# GyanX Content Engine — Complete Low-Level Design (LLD)

## Architecture Overview

A React 19 + Firebase SPA admin panel for curriculum management, content creation, adaptive learning analytics, and RBAC. Three-tier structure:

| Tier | Stack |
|---|---|
| **Frontend** | React 19 + TypeScript + React Router 7 + Vite |
| **Backend** | Firebase Auth + Firestore + Storage + Functions |
| **API** | Node.js middleware (dev) / Cloud Functions (prod) |

---

## 1. Auth & Authorization (`src/contexts/AuthContext.tsx`)

**Role Hierarchy:** `super_admin > admin > creator / reviewer`

**8 Permissions:**
- `dashboard`, `curriculum_builder`, `existing_curriculum`, `analytics`, `bulk_import`, `review_publish`, `manage_admins`, `manage_super_admins`

**Key Logic:**
- `onAuthStateChanged` → reads custom claims from ID token
- Cross-checks `/admins/{uid}.disabled` in Firestore — auto-signs out if disabled
- Super admin gets all 8 permissions by default; others get only claimed permissions

**Context Shape:**
```typescript
{ user, role, permissions, idToken, loading, signIn(), signOut() }
```

---

## 2. Firestore Data Models

### Curriculum Hierarchy (4 Levels)
```
curricula/{id}
  └─ chapters/{id}              (order: number)
       └─ topics/{id}           (order: number)
            └─ subtopics/{id}   (type: lesson | quiz | practice)
                 └─ content_items/{id}
```

### `content_items` Schema (core document)
```typescript
{
  version: 2,
  type: ContentType,          // 14 types: mcq_single, mcq_multi, fill_blank, video,
                               //           match_following, drag_drop, hotspot, voice_answer,
                               //           case_study, categorization, logic_puzzle...
  state: 'draft' | 'review' | 'published',
  taxonomy: { curriculum_id, chapter_id, topic_id, subtopic_id },
  meta: {
    title, instruction,
    difficulty: 'easy' | 'medium' | 'hard',
    level: 'lv0' | 'lv1' | 'lv2' | 'lv3',
    tags[], skills[], time_estimate_sec
  },
  media: { type: 'image' | 'video' | 'audio' | 'pdf' | null, url?, thumbnail_url? },
  scoring: { marks, negative_marks?, partial_scoring? },
  behavior: { shuffle_options?, max_attempts?, show_explanation_after_attempt?, time_limit_sec? },
  dsl_params: any,            // type-specific validated structure (Zod)
  tracking: { concept_id?, skill? },
  created_by: uid,
  reviewed_by?: uid,          // set only when published
  created_at, updated_at: Timestamp
}
```

### Adaptive Learning Collections

| Collection | Purpose |
|---|---|
| `/user_progress/{userId_conceptId}` | Mastery score (0–1), attempt counts |
| `/user_attempts/{id}` | Every question attempt log |
| `/user_reviews/{userId_conceptId}` | SM2 spaced repetition schedule |
| `/analytics_events/{id}` | Raw event stream |

### Admin & Audit Collections

| Collection | Purpose |
|---|---|
| `/admins/{uid}` | Admin user mirror (role, permissions, disabled) |
| `/content_versions/{id}` | **Immutable** snapshots on every content change |
| `/content_issues/{id}` | User-reported content bugs |
| `/leaderboard/{id}` | Public read, super_admin write only |

---

## 3. Service Layer

### `contentService.ts` — CRUD + Bulk Operations

- Full CRUD for all 4 taxonomy levels
- `duplicateChapterTree()` — recursive deep copy of chapter → topics → subtopics → content
- `importBulkJsonContent()` — auto-creates missing hierarchy nodes, batches in 499-doc Firestore writes
- `addContentItem()` / `updateContentItem()` — validates DSL first, then saves + creates version snapshot
- `updateContentStatus()` — transitions draft → review → published, sets `reviewed_by` when publishing
- `getDashboardStats()` — aggregates 12+ metrics from multiple collections

### `dslValidator.ts` — Zod Schema Validation

Validates `dsl_params` before any Firestore write. Schemas for:

| Type | Schema Shape |
|---|---|
| `mcq_single` | `{ options[], correct_index, explanation? }` |
| `mcq_multi` | `{ options[], correct_indices[] }` |
| `match_following` | `{ pairs: [{ left, right }] }` |
| `fill_blank` | `{ text_with_blanks, answers[] }` |
| `video` | `{ video_url?, start_time_sec?, end_time_sec? }` |
| `case_study` | `{ passage, child_items[] }` |
| All other types | Pass-through (no validation yet) |

### `adaptiveService.ts` — SM2 Spaced Repetition

```
processUserAttempt(userId, contentId, conceptId, correct, timeTaken, quality)
  ├─ saveAttempt()             → /user_attempts + /analytics_events
  ├─ updateProgress()          → mastery = correct / total (capped 0–1)
  ├─ updateSpacedRepetition()  → SM2 algorithm updates /user_reviews
  └─ selectNextContent()       → picks item at recommended difficulty
```

**Mastery → Difficulty mapping:**

| Mastery | Recommended Difficulty |
|---|---|
| `>= 0.8` | hard |
| `<= 0.4` | easy |
| in between | medium |

### `adminService.ts` — Admin Lifecycle

- `createAdminUser()` → POST `/api/create-admin` (creates Firebase Auth user + custom claims + Firestore doc)
- `updateAdminAccess()` → PATCH `/api/create-admin` (re-sets claims)
- All mutations tracked with `requesterUid` for audit trail

### `analyticsService.ts` — 18 Metric Aggregations

Queries across: `users`, `quiz_attempts`, `learning_sessions`, `content_issues`, `ai_tutor_events`, `notes`, `gp_transactions`

Returns: `totalContentCreated`, `completionRate`, `totalUsers`, `activeUsers`, `newUsersThisMonth`, `testGiven`, `studentLevel (lv0–lv3)`, `dailyActiveUsers`, `monthlyActiveUsers`, `timeSpendSeconds`, `contentIssues`, `flaggedContent`, `gpEarned`, `notesEarned`, `aiTutorInteractiveRate`, `contentType`, `dropOffPoints`, `weakTopicsStandardWise`

### `aiService.ts` — Client-Side AI

- Lazy-loads `@xenova/tiny-random-gpt2` model
- `suggestTopics(chapterName)` → returns 3 topic name suggestions
- Falls back to hardcoded defaults if model fails to load

### `translationService.ts` — Multi-Language Support

- `translateAll(text, onProgress?)` → `Record<langCode, translatedText>`
- 10 Indian languages: Hindi, Bengali, Telugu, Tamil, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Urdu
- Calls mymemory.translated.net API (no caching)

---

## 4. API Layer (`/api/create-admin.js` + `/functions/index.js`)

### Authorization Logic — `canGrant(requester, targetRole, targetPermissions)`

```
super_admin  →  can grant anything
admin        →  cannot grant super_admin, limited to ADMIN_GRANTABLE permissions
others       →  403 Forbidden
```

### Endpoints

| Method | Action |
|---|---|
| `POST` | Create Firebase Auth user + set custom claims + Firestore `/admins` doc |
| `PATCH` | Update claims + Firestore doc for existing admin |

Prevents privilege escalation — an admin cannot create a super_admin.

---

## 5. Component Hierarchy

```
App.tsx (Router)
├── /login  →  Login.tsx
└── /*      →  AdminLayout
     ├── Sidebar.tsx           (260px, filters nav items by permission)
     ├── Topbar.tsx            (72px, theme toggle, user pill, signout)
     └── Pages:
          ├── Dashboard.tsx        (8 metric cards, getDashboardStats())
          ├── TaxonomyManager.tsx  (4-level tree + DnD reorder + inline ContentBuilder)
          ├── ContentLibrary.tsx   (table + filters + version history modal)
          ├── Analytics.tsx        (18 metric cards + weak topics expandable)
          ├── AdminUsers.tsx       (admin table + create/update/disable)
          └── BulkImport.tsx       (CSV drag-drop + preview + batch upload)
```

### Supporting Components

| Component | Responsibility |
|---|---|
| `PrivateRoute.tsx` | Auth guard + role check → shows "Access Restricted" |
| `StatusWorkflow.tsx` | Inline draft → review → published UI; enforces role-based transitions |

---

## 6. Content State Machine

```
draft ──────────→ review ──────────→ published
  ↑                                       │
  └───────────────────────────────────────┘
                 (can revert)
```

**Allowed transitions by role:**

| Role | Allowed Transitions |
|---|---|
| `creator` | draft → review only |
| `reviewer` | any direction |
| `admin` / `super_admin` | any direction |

Every transition creates an immutable `/content_versions` snapshot with `changed_by` + `change_type`.

---

## 7. Critical Flows

### Admin Creation Flow
```
AdminUsers.tsx submit
  → createAdminUser() [adminService.ts]
  → POST /api/create-admin
  → Verify requester permissions
  → Firebase Auth.createUser()
  → setCustomUserClaims(role, permissions)
  → Firestore /admins/{uid} doc
  ← return { success, uid }
  → update local table state
```

### Content Creation → Publish Flow
```
ContentBuilder.tsx [state='draft']
  → validateDsl(type, params)         [dslValidator.ts]
  → addContentItem()                  [contentService.ts]
  → Firestore /content_items/{id}
  → Firestore /content_versions/{id}  (change_type='created')

StatusWorkflow: review → published
  → updateContentStatus(id, 'published', uid)
  → sets reviewed_by = uid
  → Firestore /content_versions/{id}  (change_type='status')
  → Rule enforces: only reviewer/admin can reach 'published'
```

### Student Attempt → Adaptive Recommendation
```
Student answers question
  → processUserAttempt()
       ├─ saveAttempt()              → /user_attempts + /analytics_events
       ├─ updateProgress()           → /user_progress (mastery score)
       ├─ updateSpacedRepetition()   → /user_reviews (SM2 next_review date)
       └─ selectNextContent()        → next item at recommended difficulty
```

### Bulk Import Flow
```
BulkImport.tsx
  → parseCSV(file)               [papaparse]
  → preview + highlight errors
  → importBulkJsonContent()      [contentService.ts]
       → auto-create missing chapters / topics / subtopics
       → Firestore batch.set() in chunks of 499
  ← return { imported, chaptersCreated, topicsCreated, subtopicsCreated }
```

---

## 8. Firestore Security Rules Summary

| Collection | Read | Write |
|---|---|---|
| `/users/{uid}` | owner \| admin | owner (no role changes) \| admin |
| `/curricula`, `/chapters`, `/subtopics` | signed-in + published OR contentStaff | `canBuildCurriculum` |
| `/content_items` | signed-in + published OR contentStaff | contentStaff; `published` state requires reviewer |
| `/content_versions` | contentStaff | contentStaff (create only — immutable, no update/delete) |
| `/admins/{uid}` | owner \| `canManageAdmins` | `canManageAdmins` |
| `/leaderboard` | signed-in | super_admin |

### Rule Helper Functions
```javascript
isSignedIn()          → auth != null
isAdmin()             → role in ['super_admin', 'admin']
canBuildCurriculum()  → isAdmin() OR has 'curriculum_builder'
isReviewer()          → isAdmin() OR role == 'reviewer' OR has 'review_publish'
isContentStaff()      → role in ['super_admin','admin','creator','reviewer']
canManageAdmins()     → isSuperAdmin() OR has 'manage_admins'
```

---

## 9. CSS Design System (`src/index.css`)

### Color Tokens

| Token | Value | Usage |
|---|---|---|
| Brand Purple | `#8A5CFF` | Primary actions, active states |
| Brand Green | `#4EB679` | Published status, success |
| Brand Blue | `#1DAAF4` | Review status, info |
| Brand Yellow | `#FEC61F` | Draft status, warnings |
| Dark BG | `#09090b` | App background |
| Dark Panel | `#18181b` | Cards, sidebar |
| Dark Elevated | `#27272a` | Inputs, hover states |

**Font:** Outfit | **Transitions:** 0.15s (fast), 0.3s (normal)

### Key Layout Classes

| Class | Purpose |
|---|---|
| `.app-container` | Root flex layout (sidebar + main) |
| `.sidebar` | 260px navigation rail |
| `.topbar` | 72px header bar |
| `.metric-grid` | Dashboard stats grid |
| `.tree-row`, `.subtopic-row` | DnD-kit compatible taxonomy rows |
| `.phone-preview-shell` | iPhone-style content preview frame |
| `.modal-backdrop` + `.modal-card` | 440px max modal system |

---

## 10. Build & Dev Configuration

### Vite (`vite.config.ts`)
- React plugin enabled
- Server middleware routes `/api/create-admin` → `./api/create-admin.js`
- `@xenova/transformers` excluded from pre-bundling (lazy-loaded)
- Build target: `esnext`

### Package Scripts

| Script | Action |
|---|---|
| `npm run dev` | Vite dev server with API middleware |
| `npm run build` | `tsc` + `vite build` |
| `npm run lint` | ESLint |
| `npm run set-super-admin` | Promote user to super_admin via CLI |

### CLI Scripts (`/scripts/`)

| Script | Usage |
|---|---|
| `set-super-admin.cjs` | `node scripts/set-super-admin.cjs <email>` |
| `setAdminClaims.ts` | `npx ts-node scripts/setAdminClaims.ts --uid <uid> --role <role>` |
| `bulkImport.ts` | Server-side batch CSV import using Admin SDK |

---

## 11. Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` + `react-dom` | 19.2.5 | UI framework |
| `react-router-dom` | 7.14.2 | Client-side routing |
| `firebase` | 12.12.1 | Auth + Firestore + Storage |
| `firebase-admin` | 13.8.0 | Server-side admin SDK |
| `firebase-functions` | 7.2.5 | Cloud Functions |
| `typescript` | ~6.0.2 | Type safety |
| `vite` | 8.0.10 | Build tool |
| `lucide-react` | 1.14.0 | Icon library |
| `@dnd-kit/core` + `@dnd-kit/sortable` | latest | Drag-and-drop reordering |
| `papaparse` | 5.5.3 | CSV parsing |
| `xlsx` | 0.18.5 | Excel export |
| `zod` | latest | DSL schema validation |
| `@xenova/transformers` | 2.17.2 | Client-side NLP (topic suggestions) |

---

## 12. Observable Gaps

| Gap | Impact |
|---|---|
| No React Error Boundaries | Uncaught errors blank the entire app |
| No Firestore `onSnapshot` listeners | All data is fetch-on-load; no real-time updates |
| Client-side `getAllContentItems` filtering | Breaks at scale (~10k+ docs) |
| 8 of 14 DSL types unvalidated | Invalid `dsl_params` can reach Firestore |
| No concurrent editing protection | No document locking; race conditions possible |
| Translation API uncached | Every call hits external API; rate-limited |
| No CI/CD pipeline | No GitHub Actions or deploy automation visible |
| No offline support | No service worker or local cache |
