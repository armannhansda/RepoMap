# 🗺️ RepoMap — Google Maps for Source Code

<p align="center">
  <img src="./client/public/icon.svg" alt="RepoMap Logo" width="80" height="80" />
</p>

<h3 align="center">
  AST-Driven Interactive Spatial Knowledge Graph & Multi-Agent Architecture Explorer
</h3>

<p align="center">
  Turn dense, complex GitHub repositories into explorable 2D spatial maps. Zoom effortlessly from macro system architecture down to inline AST function calls with zero configuration.
</p>

---

## ✨ The Problem vs. The RepoMap Solution

### 🧠 The Pain: Miller's Law & Tab Fatigue
Human working memory holds only ~7 items at a time. Tracing code logic across dozens of disconnected IDE tabs forces continuous cognitive re-indexing, spatial disorientation, and mental fatigue.

### 🗺️ The Solution: Deterministic 2D Cartography
Human spatial memory recalls physical coordinates and visual structures instinctively. **RepoMap** parses your repository's Abstract Syntax Tree (AST), extracts exact module dependencies and function definitions, and pins them onto a persistent, deterministic 2D grid.

### ⚡ The Payoff: Flow State & AI Mastery
Onboard in hours instead of weeks. Inspect live function call chains, trace execution pipelines, query multi-agent AI assistants, and export presentation-ready diagrams side-by-side without ever leaving your visual context.

---

## 🌟 Key Features

- **🎯 AST-Verified Spatial Knowledge Graph**: Automatically parses AST imports, exports, and call hierarchies to generate an interactive, drag-and-zoom 2D node map.
- **🖼️ High-Density Cardless Editorial UI**: Designed with modern monochrome typography, sleek glassmorphic aesthetics, and dynamic scroll animations (`ScrollReveal`) for maximum spatial clarity and visual density.
- **🤖 Multi-Agent AI Architectural Assistant**: Deeply integrated with **Google Gemini 2.5 Flash** (and fallback **Llama 3 via Groq**) to generate instant high-level summaries, explain complex functions, and answer architectural questions on-demand.
- **🔍 Split-Screen Code & Call Tracing**: Click any node or function to inspect source code, verify call callers/callees (`[Entry] ──► [Auth] ──► [DB]`), and trace execution paths directly beside the spatial graph.
- **⚡ Instant 0-Second Setup & Quick Try**: Simply paste any public GitHub repository link (`owner/repository` or full URL) with zero backend indexing or manifest files required. Explore instant presets like `expressjs/express`, `developit/mitt`, and `sindresorhus/ky`.
- **📊 Draw.io XML Export**: Export clean, presentation-ready architectural blueprints directly from your browser to Draw.io (`.drawio` / XML).
- **💾 Offline Smart Caching**: Repository topologies, parsed AST graphs, and opened files are cached locally inside `IndexedDB` (`idb`) for lightning-fast re-navigation.

---

## 👥 Tailored Superpowers for Every Role

| Persona | Primary Goal | How RepoMap Supercharges Workflow |
| :--- | :--- | :--- |
| **Onboarding Engineers & New Hires** | Fast-Track Mastery | Understand system architecture and module relationships in hours instead of spending weeks lost in directory trees. |
| **Staff Architects & Tech Leads** | System Audit & Blueprints | Map dependency layers, identify circular references (`! Circular import`), and export Draw.io presentation diagrams. |
| **Full-Stack & Systems Developers** | Live Call Chain Tracing | Trace request pipelines right from API endpoints down to database models across split-screen code views. |
| **Security Analysts & Code Reviewers** | Data Flow Inspection | Rapidly follow user input sources and sensitive data flows across disconnected modules with zero context switching. |

---

## 🛠️ Technology Stack

### Frontend (`client/`)
- **Core Framework**: Next.js 15 / React 19 (`App Router`)
- **Graph Visualization**: React Flow (with custom AST node types & layout algorithms)
- **Styling & Animation**: Tailwind CSS v4, Lucide Icons, and custom Intersection Observer (`ScrollReveal`)
- **Client Caching**: IndexedDB (via `idb`) for persistence
- **Syntax & Markdown**: `react-syntax-highlighter`, `react-markdown`, and `@tailwindcss/typography`

### Backend (`server/` & `parser/`)
- **Core Server**: Node.js & Express (TypeScript)
- **Git Engine**: `simple-git` for real-time repository cloning and checkout
- **AST Parsing Engine**: Custom multi-language AST and regex-based dependency mapping engine (`parser/` directory)
- **AI Orchestration**: `@google/genai` (Gemini 2.5 Flash) with fallback to `groq-sdk` (Llama 3)

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js** (v18 or higher)
- **npm**, **yarn**, or **pnpm**
- An optional [Google Gemini API Key](https://aistudio.google.com/) or [Groq API Key](https://console.groq.com/keys) for AI Q&A explanations.

---

### 1. Backend & Parser Setup

Open a terminal and navigate to the `server` directory:

```bash
cd server
npm install
```
*(Note: Installing the server dependencies will automatically trigger the `parser/` setup scripts).*

**Configure Environment Variables:**
Create a `.env` file inside the `server/` directory:
```bash
cp .env.example .env
```
Add your API keys and port settings inside `server/.env`:
```env
PORT=5001
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here_as_fallback
```

**Start the Backend Server:**
```bash
npm run dev
```
The backend API server will start on `http://localhost:5001`.

---

### 2. Frontend Client Setup

Open a new terminal window and navigate to the `client` directory:

```bash
cd client
npm install
```

**Configure Environment Variables:**
Create a `.env` file inside the `client/` directory:
```bash
cp .env-example .env
```
Ensure `NEXT_PUBLIC_API_URL` points to your running backend server:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

**Start the Frontend Client:**
```bash
npm run dev
```

The application will be live at **[http://localhost:3000](http://localhost:3000)**!

---

## 📖 Core Workflow Guide

1. **Connect & Analyze**: Open `http://localhost:3000` and paste any public GitHub repository URL into the top search bar (`e.g., https://github.com/expressjs/express`).
2. **AST Mapping**: Click **Analyze** (`or press Enter`). The engine clones the repo, parses AST trees, maps file dependencies, and builds the spatial grid.
3. **Explore Spatially**: Click and drag to pan across the 2D architectural map. Use scroll wheel to zoom from macro directory groups down to individual file nodes.
4. **Inspect Source & Trace Calls**: Click any node in the graph to slide open the side inspection panel. View syntax-highlighted source code, check caller/callee dependencies, or click **Explain** for instant AI architectural analysis.
5. **Export Diagrams**: Click the export option in the graph controls to download `.drawio` XML files for your team documentation.

---

## 📄 Contribute

Feel free to fork, customize, and contribute!
