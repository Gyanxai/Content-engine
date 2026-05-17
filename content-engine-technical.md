# Content Engine — Technical.md

## Architecture
Frontend: React 19 + TS  
Backend: Firebase (Auth + Firestore + Storage + Functions)

---

## Data Model

curricula/{id}
 └ chapters/{id}
    └ topics/{id}
       └ subtopics/{id}
          └ content_items/{id}

---

## Content Schema (Core)
- type
- state
- taxonomy
- meta
- media
- scoring
- behavior
- dsl_params

---

## Write Flow
UI → validate DSL → contentService → Firestore write → version snapshot

---

## Read Flow (App)
App → API/backend → Firestore → filter published → normalize → render

---

## Sync Logic
- Content Engine writes structured DSL
- App renderer maps DSL → UI component

Mismatch here = UI break

---

## API Contracts (Required)

GET /content?subtopic_id
→ returns published content only

POST /content
→ validates DSL

PATCH /content/status
→ enforce role-based transitions

---

## Validation Layer
- Zod schemas per content type
- Reject invalid DSL before DB write

---

## Workflow Engine
draft → review → published

---

## Performance
- Batch writes (499 limit)
- Pagination for large content
- Lazy loading in UI

---

## Security
- Firebase rules enforce roles
- Admin creation via secure API
- No client-side privilege escalation

---

## Critical Improvements

1. Add indexing for Firestore queries
2. Remove client-side filtering
3. Add caching layer (Redis or local)
4. Add retry mechanism for bulk import
5. Add audit logs aggregation pipeline
6. Add CI/CD (GitHub Actions)
7. Add monitoring (Sentry + logs)
