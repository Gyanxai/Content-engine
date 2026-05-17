# GyanX Content Engine & Admin Panel: High-Level Context

This document serves as a persistent reference guide for future AI agents to understand the purpose, architecture, and current state of the GyanX Content Engine and Admin Panel.

## 1. Project Overview

The **GyanX Content & Admin Repo** is the command center for the GyanX platform. It acts as the backbone for creating, managing, and delivering interactive, "Brilliant.org-style" educational content to the main Flutter mobile app.

**Core Objectives:**
1. Provide an administrative interface to build and manage educational taxonomy (Subjects -> Chapters) and rich interactive questions.
2. Serve as the central content repository and logic engine for user evaluation.
3. Track user mastery and dynamically adjust the difficulty of the content presented to the user (The Mastery Loop).

## 2. Tech Stack

### Frontend (Admin Panel)
- **Framework:** React 19 with TypeScript, built using Vite.
- **Routing:** `react-router-dom` for Single Page Application navigation.
- **Styling:** Vanilla CSS (`index.css`), utilizing a clean, modern design system with specific color tokens (Primary Purple `#8A5CFF`, Success Green `#4EB679`, etc.).
- **Drag-and-Drop:** `@dnd-kit/core` and related packages for rearranging taxonomy and content elements.
- **Data Import:** `papaparse` and `xlsx` for bulk importing content.
- **Icons:** `lucide-react`.
- **AI Integration:** `@xenova/transformers` used in `aiService.ts` for local or edge AI capabilities (e.g., automated tagging, content generation, translation).

### Backend / Infrastructure
- **Database:** Firebase Firestore (NoSQL).
- **Authentication:** Firebase Auth with Custom Claims for role-based access control (RBAC).
- **Serverless Compute:** Firebase Cloud Functions (`functions/index.js`).
- **File Storage:** Firebase Storage (configured via `storage.rules`).

## 3. Architecture & Data Flow

### The Mastery Loop
The system is built around a circular learning loop:
1. **Request:** The mobile app requests a "Path Packet" for a specific chapter.
2. **Analysis:** The backend analyzes the user's current mastery level (lv0, lv1, lv2) and historical performance.
3. **Delivery:** The backend fetches a batch of 15-20 appropriate questions and sends them to the app.
4. **Interaction:** The user interacts with the content (locally cached on the device). The app logs time, attempts, and correctness.
5. **Sync:** The app syncs tracking data back to the backend (`/tracking/sync`).
6. **Evaluation:** The backend calculates a new Mastery Score and updates the user's level (Level Up, Stay Level, or Level Down invisibly).

### API Contract (Conceptual)
The backend provides endpoints/services for:
- `GET /path/generate`: Fetching batched questions based on `child_id`, `subject_id`, and `chapter_id`.
- `POST /tracking/sync`: Receiving performance telemetry.
- `GET /parent/dashboard/{child_id}`: Providing aggregated data for parents.

### Domain Specific Language (DSL) for Content
Questions are structured using a DSL that the Flutter app can render natively to achieve interactive experiences without webviews. Supported formats include:
- `interactive_graph`: Dragging points on a graph.
- `step_by_step`: Progressive revelation of tasks.
- `logic_puzzle`: Drag-and-drop sequences.
- `slider_simulation`: Real-time SVG updates via sliders.

## 4. Key Services & Directories

- `src/pages/`:
  - **`AdminUsers.tsx`**: Management of platform administrators.
  - **`TaxonomyManager.tsx`**: Interface for creating the educational hierarchy.
  - **`ContentBuilder.tsx`**: The core UI for building interactive DSL-based questions.
  - **`ContentLibrary.tsx`**: Repository of all created questions/modules.
  - **`BulkImport.tsx`**: Logic to import taxonomy or content via CSV/Excel.
  - **`Analytics.tsx`** & **`Dashboard.tsx`**: High-level system overview and metrics.
- `src/services/`:
  - **`adminService.ts`**: Handles Firebase Auth, custom claims, and Firestore admin records.
  - **`aiService.ts`**: AI processing logic using Transformers.js.
  - **`contentService.ts`**: CRUD operations for the content DSL.
  - **`analyticsService.ts`**: Aggregates tracking data from the mastery loop.
  - **`translationService.ts`**: Manages localization.
- `functions/`:
  - **`index.js`**: Contains the `createAdminUser` Cloud Function, essential for creating new admins securely bypassing client-side Firebase Auth restrictions while another user is logged in.

## 5. Security Context
- **Role-Based Access:** Admins are segregated via Firebase Custom Claims (e.g., `role: 'admin'`).
- **Admin Creation:** Uses a dedicated Firebase Cloud Function (`createAdminUser`) coupled with a service account (`gx-app-backend-firebase-adminsdk-fbsvc-...json`) to securely provision new administrator accounts and their corresponding Firestore `/admins` records.

## Summary for Future Agents
When modifying this codebase:
1. **Respect the DSL:** Any changes to content structure must align with the `knowledge_transfer_architecture.md` expectations of the Flutter client.
2. **Firebase Rules:** All new data models require corresponding `firestore.rules` updates to maintain security.
3. **AI Services:** Be mindful of browser-side vs. server-side AI processing (e.g., `aiService` using `@xenova/transformers` runs locally in the browser).
