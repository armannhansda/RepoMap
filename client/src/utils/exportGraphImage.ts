import { toPng } from "html-to-image";
import jsPDF from "jspdf";

// Elements belonging to React Flow's own UI chrome that should never
// appear in an exported "clean" graph image — zoom controls and the
// minimap are only meaningful as interactive elements, and the built-in
// attribution badge is redundant in an exported doc.
const EXCLUDED_REACT_FLOW_CLASSES = [
  "react-flow__controls",
  "react-flow__minimap",
  "react-flow__attribution",
];

// Any element we own (the search box overlay, the mask/highlight layer,
// the "Large Repo Mode" banner, etc.) can opt out of the export by
// setting `data-export-exclude="true"` directly in its JSX, rather than
// this file having to know about every UI element in RepoGraph.tsx.
function shouldIncludeNode(domNode: HTMLElement): boolean {
  if (!(domNode instanceof HTMLElement)) return true;
  if (domNode.dataset?.exportExclude === "true") return false;
  if (domNode.classList) {
    for (const cls of EXCLUDED_REACT_FLOW_CLASSES) {
      if (domNode.classList.contains(cls)) return false;
    }
  }
  return true;
}

async function captureGraphPng(container: HTMLElement, pixelRatio: number): Promise<string> {
  return toPng(container, {
    cacheBust: true,
    pixelRatio,
    // Match the app's dark canvas background so any transparent areas
    // in the capture don't turn white when opened elsewhere.
    backgroundColor: "#050505",
    filter: shouldIncludeNode,
  });
}

function ensureExtension(filename: string, ext: string): string {
  return filename.toLowerCase().endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportGraphAsPng(container: HTMLElement, filename: string): Promise<void> {
  // Content is already captured at its correctly-sized, capped
  // resolution (see RepoGraph.tsx's performExport) — no additional
  // pixelRatio multiplier here. Stacking a multiplier on top of an
  // already large capture was what caused browser crashes on large
  // graphs (canvases well over 100M pixels, combined with hundreds of
  // DOM nodes using expensive CSS like backdrop-blur).
  const dataUrl = await captureGraphPng(container, 1);
  downloadDataUrl(dataUrl, ensureExtension(filename, "png"));
}

export async function exportGraphAsPdf(container: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await captureGraphPng(container, 1);

  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Failed to load captured graph image for PDF export."));
    image.src = dataUrl;
  });

  // Size the PDF page to exactly match the captured image, in the
  // matching orientation, so the graph fills the page edge-to-edge
  // rather than being letterboxed on a fixed A4/Letter size.
  const isLandscape = image.width >= image.height;
  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "px",
    format: [image.width, image.height],
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, image.width, image.height);
  pdf.save(ensureExtension(filename, "pdf"));
}