# 🗺️ RepoMap

**RepoMap** is a powerful, interactive codebase visualization tool. It dynamically generates architectural graphs of GitHub repositories, allowing developers to visually explore execution flows, structure, and dependencies.

With its sleek glassmorphic monochrome UI and deeply integrated AI, understanding complex codebases has never been easier or more beautiful.

![RepoMap Preview](./client/public/icon.svg)

## ✨ Features

- **Interactive Visual Graphs**: Explore code bases natively with nodes grouped by files, components, and functions.
- **Dependency & Execution Tracing**: Easily follow application flow via color-coded, animated edges (Imports, Calls, and Contains relationships).
- **Glassmorphic UI**: A stunning, performance-optimized, dark-mode glassmorphic design that puts your code center-stage.
- **Code Previews**: Hover over any node in the graph to instantly view the implementation code.
- **✨ AI Explanations**: Click "Explain" on any component, file, or function to get a high-level architectural summary generated on-demand by Google Gemini.
- **Smart Caching**: Files and graph topologies are stored in `IndexedDB` to ensure lightning-fast navigation after the initial load.

## 🛠️ Tech Stack

### Frontend (`client/`)
- **Framework**: Next.js 14 / React 19
- **Visualization**: React Flow
- **Styling**: Tailwind CSS v4
- **State/Cache**: IndexedDB (via `idb`)
- **Markdown**: `react-markdown` & `@tailwindcss/typography`

### Backend (`server/`)
- **Server**: Node.js & Express (TypeScript)
- **Git Operations**: `simple-git`
- **AI Integration**: `@google/genai` (Gemini 2.5 Flash)
- **Parser**: Custom AST/Regex-based parsing engine (`parser/` directory)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- NPM or Yarn
- A [Google Gemini API Key](https://aistudio.google.com/) for AI explanations.

### 1. Backend Setup

Open a terminal and navigate to the `server` directory:

```bash
cd server
npm install
```
*(Note: Installing the server will automatically install the `parser` dependencies via a post-install script).*

**Configure Environment Variables:**
Create a `.env` file inside the `server/` directory:
```bash
cp .env.example .env
```
Inside `.env`, configure the following:
```env
PORT=5001
GEMINI_API_KEY=your_gemini_api_key_here
```

**Start the Server:**
```bash
npm run dev
```

### 2. Frontend Setup

Open a new terminal and navigate to the `client` directory:

```bash
cd client
npm install
```

**Configure Environment Variables:**
Create a `.env` file inside the `client/` directory:
```bash
cp .env-example .env
```
Inside `.env`, configure your API URL to point to the backend:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

**Start the Client:**
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 📖 Usage

1. Open the application in your browser.
2. In the top Navigation bar, paste any public GitHub repository URL (e.g., `https://github.com/facebook/react`).
3. Press **Enter** or click the return arrow.
4. RepoMap will clone and parse the repository in the background. Once completed, a fully interactive graph will appear.
5. **Hover** over nodes for a quick preview, or **Click** on them to open the sidebar for deep-dives, references, and AI explanations!

## 📄 License

MIT License. Feel free to fork and customize!
