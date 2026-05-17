# Content Engine — Design.md (Production Ready)

## Overview
Content Engine is a React + Firebase based Admin CMS to create, manage, review, and publish curriculum-driven content that is consumed by the Content Delivery App.

## Core Goal
Ensure seamless sync between:
Content Engine (write) → Firestore → App (read + render dynamically)

## Key Principles
- Schema-driven content (DSL)
- Strict workflow (Draft → Review → Publish)
- Version-controlled content
- RBAC enforced UI
- Real-time sync readiness

## UI Architecture (Aligned with Figma Flow)

### 1. Dashboard
- Metrics (content count, pending reviews, published)
- Quick actions

### 2. Curriculum Builder
Flow:
Board → Medium → Class → Subject → Chapter → Topic → Subtopic

Features:
- Drag & Drop ordering
- Duplicate chapter/subtopic
- Inline editing

### 3. Content Builder (Core)
- Template selector (MCQ, slider, video, etc.)
- DSL form renderer
- Media uploader
- Live preview (mobile frame)

### 4. Review & Publish
- Status workflow UI
- Reviewer actions
- Version history panel

### 5. Bulk Import
- CSV upload
- Validation preview
- Batch creation

---

## Content Creation Flow
1. Create taxonomy
2. Create content (draft)
3. Validate DSL
4. Submit for review
5. Reviewer approves → publish
6. App fetches published content

---

## Sync with App (CRITICAL)
- Only `state = published` content is exposed
- Content schema must match app renderer DSL
- IDs must remain consistent across updates

---

## Component System
- TemplateSelector
- DSLFormRenderer
- MediaUploader
- ContentPreview (mobile)
- StatusWorkflow
- VersionHistory

---

## Versioning
Every update creates:
`/content_versions/{id}` snapshot

---

## Security
- RBAC enforced in UI + Firestore rules
- No direct writes without validation
- Reviewer-only publishing

---

## Improvements Required
- Add real-time listeners (onSnapshot)
- Add caching for translation API
- Add optimistic UI updates
- Add collaborative editing lock
- Add error boundaries
- Add environment separation (dev/staging/prod)
