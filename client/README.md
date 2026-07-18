# 🗺️ RepoMap Frontend (`client/`)

This directory contains the frontend client application for **RepoMap**, built with [Next.js 15](https://nextjs.org/) (`App Router`), [React Flow](https://reactflow.dev/), and [Tailwind CSS v4](https://tailwindcss.com/).

## ✨ Frontend Highlights

- **🎯 Interactive 2D Spatial Graph (`React Flow`)**: Custom AST node components (`CustomNode.tsx`), smooth-step edges, fit-to-view auto-zoom, and multi-viewport layout engine.
- **🎨 High-Density Cardless Editorial UI**: High-impact monochrome aesthetics, glassmorphic styling (`bg-black/80 backdrop-blur-2xl border-white/15`), and scroll-triggered animations (`ScrollReveal`).
- **🔍 Split-Screen Code Viewer & Call Tracing**: Live syntax highlighting with `react-syntax-highlighter` (`oneDark` theme) right alongside the spatial map.
- **🤖 Built-in AI Q&A & Explanation Panel**: Real-time markdown rendering (`react-markdown`) for architectural explanations powered by Google Gemini and Groq.
- **💾 Local Caching via IndexedDB**: Persistent caching of parsed graphs, file structures, and open tabs using `idb` to guarantee instant page re-loads without re-parsing.

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env-example` to `.env` and set the backend API URL:
```bash
cp .env-example .env
```
Inside `.env`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### 3. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to explore any GitHub repository visually!

---

## 📁 Directory Structure

- **`src/app/`**: Next.js App Router root layout, page components, and global font configurations (`Inter` & `Fira Code`).
- **`src/components/`**:
  - `LandingPage.tsx`: The cardless editorial hero, onboarding stepper, and live simulation console.
  - `RepoGraph.tsx`: The primary interactive React Flow spatial map and multi-tab code viewer workspace.
  - `CustomNode.tsx`: Memoized custom node rendering with function badges and status indicators.
- **`src/services/`**: API client methods communicating with the `server/` backend (`/api/parse`, `/api/file`, `/api/explain`).
- **`src/lib/db/`**: IndexedDB storage adapters (`openedFiles.ts` & `graphCache.ts`) for zero-latency local caching.
- **`src/utils/`**: Graph layout math and AST structural positioning utilities.
