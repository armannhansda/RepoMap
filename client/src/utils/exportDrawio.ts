import dagre from "dagre";

export function generateDrawioXml(nodes: any[], edges: any[], filename: string = 'architecture.drawio', groups: any[] = []) {
  // Use a specialized dagre layout that supports compound graphs for groups
  const dagreGraph = new dagre.graphlib.Graph({ compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({
    rankdir: "LR",
    align: "UL", // Align upper-left for a structured look
    nodesep: 150, // More vertical space between nodes
    ranksep: 250, // More horizontal space between columns
    edgesep: 80,
    marginx: 80,
    marginy: 120, // Leave room for the main title
  });

  const nodeWidth = 240;
  const nodeHeight = 70;
  const groupPadding = 20;
  const groupTopPadding = 40;

  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];
  const safeGroups = Array.isArray(groups) ? groups : [];

  // Add groups first
  safeGroups.forEach(g => {
    if (g && g.id) {
      dagreGraph.setNode(`group_${g.id}`, { label: g.label || g.id });
    }
  });

  // Filter valid nodes
  const validNodes = safeNodes.filter(n => n && n.id);
  const nodeIds = new Set(validNodes.map(n => n.id));

  // Add nodes
  validNodes.forEach(n => {
    dagreGraph.setNode(n.id, {
      width: nodeWidth,
      height: nodeHeight,
    });
    // Assign to parent group if exists
    if (n.group && safeGroups.find(g => g.id === n.group)) {
      dagreGraph.setParent(n.id, `group_${n.group}`);
    }
  });

  // Add valid edges (source and target must exist)
  const validEdges = safeEdges.filter(e => e && e.source && e.target && nodeIds.has(e.source) && nodeIds.has(e.target));
  validEdges.forEach((e, index) => {
    dagreGraph.setEdge(e.source, e.target, {
      id: `e-${e.source}-${e.target}-${index}`,
      label: e.label || ""
    });
  });

  // Run layout securely
  try {
    dagre.layout(dagreGraph);
  } catch (layoutError) {
    console.error("Dagre layout failed:", layoutError);
    // Continue anyway; nodes will just be at 0,0 instead of crashing the whole UI
  }

  // Generate XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile version="14.6.13">
  <diagram id="ai-architecture-diagram" name="Architecture">
    <mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="main_title" value="Architecture Diagram" style="text;html=1;strokeColor=#444444;fillColor=#1a1a1a;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=24;fontColor=#ffffff;fontStyle=1;shadow=1;" vertex="1" parent="1">
          <mxGeometry x="300" y="20" width="400" height="60" as="geometry" />
        </mxCell>`;

  // Match exact aesthetic from reference image
  const palettes = [
    { border: '#3b82f6', nodeFill: '#000000', text: '#ffffff' }, // Blue (Client)
    { border: '#f97316', nodeFill: '#000000', text: '#ffffff' }, // Orange (Server)
    { border: '#10b981', nodeFill: '#000000', text: '#ffffff' }, // Green (Parser)
    { border: '#8b5cf6', nodeFill: '#000000', text: '#ffffff' }, // Purple
    { border: '#ef4444', nodeFill: '#000000', text: '#ffffff' }, // Red
  ];

  // Draw groups (Transparent body, colored top bar and border)
  safeGroups.forEach((g, index) => {
    const gNode = dagreGraph.node(`group_${g.id}`);
    if (gNode && gNode.width > 0) {
      const gx = gNode.x - gNode.width / 2;
      const gy = gNode.y - gNode.height / 2;
      const gw = gNode.width + groupPadding * 2;
      const gh = gNode.height + groupTopPadding + groupPadding;
      
      const adjustedX = gx - groupPadding;
      const adjustedY = gy - groupTopPadding;

      const label = (g.label || "").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const palette = palettes[index % palettes.length];
      
      // Swimlane with transparent body, colored header
      xml += `
        <mxCell id="group_${g.id}" value="${label}" style="swimlane;whiteSpace=wrap;html=1;fillColor=#1a1a1a;swimlaneFillColor=none;strokeColor=${palette.border};fontColor=${palette.text};startSize=30;rounded=0;fontStyle=1;swimlaneLine=1;shadow=0;strokeWidth=1;" vertex="1" parent="1">
          <mxGeometry x="${adjustedX}" y="${adjustedY}" width="${gw}" height="${gh}" as="geometry" />
        </mxCell>`;
    }
  });

  // Add nodes
  validNodes.forEach((node: any) => {
    const dNode = dagreGraph.node(node.id);
    if (!dNode) return; // Failsafe
    
    const escapeHtml = (str: string) => (str || "").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const mainHtml = `<b>${escapeHtml(node.label)}</b>`;
    const subHtml = node.subLabel ? `<hr style="border-color: #333; margin: 4px 0;"><font style="font-size: 11px; font-weight: normal; opacity: 0.9;">${escapeHtml(node.subLabel).replace(/\n/g, '<br>')}</font>` : "";
    const fullHtml = mainHtml + subHtml;
    const xmlValue = escapeHtml(fullHtml);
    
    let parentId = "1";
    let x = (dNode.x || 0) - (dNode.width || nodeWidth) / 2;
    let y = (dNode.y || 0) - (dNode.height || nodeHeight) / 2;
    let palette = palettes[0]; // Default palette
    
    if (node.group && safeGroups.find(g => g.id === node.group)) {
      const groupIndex = safeGroups.findIndex(g => g.id === node.group);
      palette = palettes[groupIndex % palettes.length];
      const gNode = dagreGraph.node(`group_${node.group}`);
      if (gNode) {
        parentId = `group_${node.group}`;
        const parentTopLeftX = (gNode.x - gNode.width / 2) - groupPadding;
        const parentTopLeftY = (gNode.y - gNode.height / 2) - groupTopPadding;
        x = x - parentTopLeftX;
        y = y - parentTopLeftY;
      }
    }
    
    // Support custom shapes
    let shapeStyle = "rounded=1;"; // default rounded rectangle
    if (node.shape === "cylinder") {
      shapeStyle = "shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=15;";
    } else if (node.shape === "document") {
      shapeStyle = "shape=document;whiteSpace=wrap;html=1;boundedLbl=1;";
    } else if (node.shape === "rhombus") {
      shapeStyle = "rhombus;whiteSpace=wrap;html=1;";
    }
    
    xml += `
        <mxCell id="node_${node.id}" value="${xmlValue}" style="${shapeStyle}whiteSpace=wrap;html=1;fillColor=${palette.nodeFill};strokeColor=${palette.border};fontColor=${palette.text};shadow=0;arcSize=10;strokeWidth=1;" vertex="1" parent="${parentId}">
          <mxGeometry x="${x}" y="${y}" width="${dNode.width || nodeWidth}" height="${dNode.height || nodeHeight}" as="geometry" />
        </mxCell>`;
  });

  // We need to look up edge color based on source node group
  const getNodePalette = (nodeId: string) => {
    const n = safeNodes.find(n => n.id === nodeId);
    if (n && n.group) {
      const idx = safeGroups.findIndex(g => g.id === n.group);
      if (idx !== -1) return palettes[idx % palettes.length];
    }
    return palettes[0];
  };

  // Add edges
  validEdges.forEach((edge: any, index: number) => {
    const label = (edge.label || "").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const sourcePalette = getNodePalette(edge.source);
    
    // Colored edges matching the source group border, with solid background label and jump arcs
    xml += `
        <mxCell id="edge_${index}" value="${label}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;jumpStyle=arc;jumpSize=15;html=1;strokeColor=${sourcePalette.border};fontColor=#ffffff;labelBackgroundColor=#1a1a1a;fontSize=11;strokeWidth=1.5;" edge="1" parent="1" source="node_${edge.source}" target="node_${edge.target}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>`;
  });

  xml += `
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

  // Create a Blob and download it
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
