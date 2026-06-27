# Frontend Design Document

## Architecture Overview
- **Framework:** Next.js 16 utilizing the App Router (`app/` directory).
- **Client-Side Rendering:** The main application heavily relies on client-side React features (e.g., `'use client'`) for interactive visualizations and dynamic layout adjustments.
- **Data Persistence:** IndexedDB is used (via the `idb` package) for local caching of repository analysis data and graphs to improve performance and reduce redundant API calls.

## Component Hierarchy
- **`Home` (`app/page.tsx`)**: The root client component that manages global state (repository URL, loaded graph, selected nodes, loading states).
  - **`Header`**: Top navigation and input for analyzing repositories.
  - **`LeftSidebar`**: A resizable left pane displaying the project structure/explorer and list of nodes.
  - **`Main Content`**:
    - **`LandingPage`**: Displayed when no repository is currently analyzed.
    - **`RepoGraph`**: The core visualization component using `reactflow` and `dagre` to render the architecture diagram.
  - **`FileSidebar`**: A resizable right pane showing details/code for a selected file/node.
  - **`RepoExplanationModal`**: A modal component displaying AI-generated explanations of the repository.

## State Management
- **React Local State**: State is managed locally using React's `useState` hook at the top level (`app/page.tsx`) and passed down to child components via props.
- No external state management libraries (like Redux or Zustand) are used, keeping the architecture simple.

## Routing
- **Next.js App Router**: Single-page application approach mounted on the root route (`/`). The entire experience (landing page, visualization, sidebars) is handled within `app/page.tsx` without full page reloads.

## Styling & UI Design
- **Tailwind CSS**: Utility-first CSS framework for layout, spacing, colors, and typography. (Tailwind v4 is used with CSS `@theme` variables).
- **Icons**: `lucide-react` is used for consistent, modern iconography across the UI.

### Color Palette (Theme)
- **Base**: Deep Dark Mode (`#000000` pure black background).
- **Text**: Primary text is pure white (`#ffffff`), secondary/muted text is gray (`#a1a1aa` or Zinc 400).
- **Surfaces**: Extensive use of semi-transparent white for glassmorphism effects (`rgba(255, 255, 255, 0.03)` for resting, up to `0.12` for active states).
- **Borders**: Subtle translucent borders (`rgba(255, 255, 255, 0.1)`) to separate sections without harsh lines.
- **Graph Nodes**: Semantic colors are applied to graph nodes based on type:
  - File: Blue (`#3b82f6`)
  - Component: Purple (`#a855f7`)
  - Function: Emerald (`#10b981`)

### Layout & Composition
- **Full-Screen App Layout**: The application utilizes a 100vh flexbox layout with no window scrolling (`overflow: hidden`). Scrollable areas are handled within individual panes.
- **Resizable Panes**: Three-column layout on the main view (Left Sidebar, Main Canvas, Right Sidebar). Widths are dynamically controlled via React state and inline styles (`leftWidth`, `rightWidth`), offering a customizable IDE-like experience.
- **Z-Index Strategy**: Clear stacking order. The graph canvas sits at the bottom, UI elements (buttons, sidebars) sit above, and modals cover the entire screen with a blurred backdrop.

### Visual Patterns & Micro-Interactions
- **Glassmorphism**: Achieved using `backdrop-blur-xl`, semi-transparent backgrounds (`bg-black/60`, `bg-white/[0.02]`), and subtle borders. 
- **Gradients & Lighting**: Radial gradients are heavily used to create depth and focus. For instance, the Landing Page features a dot grid background with a dynamic radial gradient that tracks the user's mouse position to create a "flashlight" reveal effect.
- **Typography**: Clean Sans-Serif font with deliberate tracking (tighter for large headers, standard for body text). Drop shadows (`drop-shadow-2xl`) are applied to critical hero text to make it pop against complex backgrounds.
- **Custom Scrollbars**: Sleek, minimal webkit scrollbars (6px width, rounded semi-transparent white thumbs) blend seamlessly into the dark theme.
- **Animations**: Smooth transitions on hover states (`transition-all`, `duration-300`), interactive hover scaling on cards, and animated edges in the React Flow graph.

## Data Fetching & Caching
- **API Services**: Dedicated service functions (in `services/api.ts`) handle asynchronous requests to the backend (e.g., `analyzeRepo`, `explainRepo`, `generateArchitectureDiagram`).
- **Caching Strategy**: Before making backend calls, the application checks IndexedDB (`lib/db/repositories.ts`, `lib/db/graph.ts`) for cached data. If found, it renders instantly; otherwise, it fetches from the API and saves the result to the cache.

## API Integration
- **`analyzeRepo`**: Fetches the initial repository structure and graph data.
- **`explainRepo`**: Communicates with the AI service to generate a text explanation of the repository.
- **`generateArchitectureDiagram`**: Requests AI-generated nodes, edges, and grouping logic to build structural diagrams, exporting to Draw.io XML formats.

## Future Considerations
- **State Management Scalability**: As the application grows, moving to a context-based or external store (like Zustand) might be necessary to avoid prop drilling from `page.tsx`.
- **Error Handling**: Consolidate error boundaries and toast notifications for a smoother UX during API failures.
- **Accessibility**: Enhance contrast ratios and screen-reader support, especially around custom interactive elements like resizable pane handlers and graph nodes.
