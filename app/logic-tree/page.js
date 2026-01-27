'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const SLP_DOMAIN = '@slpalaska.com';

// Node types with colors
const NODE_TYPES = {
  event: { label: 'Event', color: '#1e3a8a', bg: '#dbeafe', description: 'What happened' },
  condition: { label: 'Condition', color: '#7c3aed', bg: '#ede9fe', description: 'State that existed' },
  action: { label: 'Action', color: '#059669', bg: '#d1fae5', description: 'What someone did/didn\'t do' },
  root_cause: { label: 'Root Cause', color: '#dc2626', bg: '#fee2e2', description: 'Fundamental cause' },
  contributing: { label: 'Contributing Factor', color: '#f59e0b', bg: '#fef3c7', description: 'Factor that contributed' }
};

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px' },
  wrapper: { maxWidth: '1400px', margin: '0 auto' },
  header: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', borderRadius: '16px 16px 0 0', padding: '20px 25px', color: 'white' },
  headerTitle: { fontSize: '28px', fontWeight: '700' },
  headerSubtitle: { fontSize: '14px', opacity: 0.9, marginTop: '5px' },
  card: { background: '#fff', borderRadius: '0 0 16px 16px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  loginCard: { background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '450px', margin: '50px auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' },
  toolbar: { background: '#f8fafc', padding: '15px 20px', borderBottom: '2px solid #e2e8f0', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' },
  canvas: { minHeight: '600px', background: '#fafafa', position: 'relative', overflow: 'auto' },
  sidebar: { width: '300px', background: '#fff', borderLeft: '2px solid #e2e8f0', padding: '20px' },
  input: { width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
  select: { padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', minWidth: '180px' },
  textarea: { width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' },
  actionBtn: { padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' },
  primaryBtn: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white' },
  secondaryBtn: { background: '#1e3a8a', color: 'white' },
  outlineBtn: { background: 'white', color: '#1e3a8a', border: '2px solid #1e3a8a' },
  dangerBtn: { background: '#dc2626', color: 'white' },
  node: { position: 'absolute', minWidth: '180px', maxWidth: '250px', borderRadius: '12px', padding: '15px', cursor: 'move', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '3px solid', userSelect: 'none' },
  nodeHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  nodeType: { fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', color: 'white' },
  nodeText: { fontSize: '13px', lineHeight: '1.4' },
  nodeConnector: { position: 'absolute', width: '12px', height: '12px', borderRadius: '50%', background: '#64748b', cursor: 'crosshair' },
  formGroup: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '6px', fontWeight: '600', color: '#1e293b', fontSize: '13px' },
  footer: { textAlign: 'center', padding: '20px', color: 'white', fontSize: '13px' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  legend: { display: 'flex', gap: '15px', flexWrap: 'wrap', padding: '10px 20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' },
  legendColor: { width: '16px', height: '16px', borderRadius: '4px' }
};

function isSLPTeam(email) { return email && email.toLowerCase().endsWith(SLP_DOMAIN); }

export default function LogicTreeBuilder() {
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);

  // Incident selection
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Tree state
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState(null);

  // New node form
  const [newNodeType, setNewNodeType] = useState('event');
  const [newNodeText, setNewNodeText] = useState('');

  const canvasRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('slp_user_email');
    if (saved && isSLPTeam(saved)) { setUserEmail(saved); setIsAuthenticated(true); }
    setLoading(false);
  }, []);

  useEffect(() => { if (isAuthenticated) fetchIncidents(); }, [isAuthenticated]);

  async function fetchIncidents() {
    const { data } = await supabase
      .from('incidents')
      .select('id, incident_id, brief_description, company_name, incident_date')
      .order('incident_date', { ascending: false });
    setIncidents(data || []);
  }

  async function loadIncident(incidentId) {
    const { data: incident } = await supabase.from('incidents').select('*').eq('id', incidentId).single();
    setSelectedIncident(incident);

    // Load existing tree if any
    const { data: treeData } = await supabase
      .from('incident_logic_trees')
      .select('*')
      .eq('incident_id', incidentId)
      .single();

    if (treeData && treeData.tree_data) {
      const parsed = typeof treeData.tree_data === 'string' ? JSON.parse(treeData.tree_data) : treeData.tree_data;
      setNodes(parsed.nodes || []);
      setConnections(parsed.connections || []);
    } else {
      // Initialize with incident as root event
      setNodes([{
        id: 'root',
        type: 'event',
        text: incident.brief_description || 'Incident Event',
        x: 400,
        y: 50,
        isRoot: true
      }]);
      setConnections([]);
    }
  }

  function addNode() {
    if (!newNodeText.trim()) return;

    const newNode = {
      id: `node_${Date.now()}`,
      type: newNodeType,
      text: newNodeText.trim(),
      x: 100 + Math.random() * 200,
      y: 150 + nodes.length * 80,
      isRoot: false
    };

    setNodes([...nodes, newNode]);
    setNewNodeText('');
  }

  function deleteNode(nodeId) {
    if (nodeId === 'root') return; // Can't delete root
    setNodes(nodes.filter(n => n.id !== nodeId));
    setConnections(connections.filter(c => c.from !== nodeId && c.to !== nodeId));
    setSelectedNode(null);
  }

  function updateNodeText(nodeId, newText) {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, text: newText } : n));
  }

  function updateNodeType(nodeId, newType) {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, type: newType } : n));
  }

  function handleMouseDown(e, node) {
    if (e.button !== 0) return; // Left click only
    const rect = canvasRef.current.getBoundingClientRect();
    setDraggedNode(node.id);
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y
    });
    setSelectedNode(node);
  }

  function handleMouseMove(e) {
    if (!draggedNode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0, e.clientX - rect.left - dragOffset.x);
    const newY = Math.max(0, e.clientY - rect.top - dragOffset.y);
    setNodes(nodes.map(n => n.id === draggedNode ? { ...n, x: newX, y: newY } : n));
  }

  function handleMouseUp() {
    setDraggedNode(null);
  }

  function startConnection(nodeId) {
    setConnecting(nodeId);
  }

  function completeConnection(toNodeId) {
    if (connecting && connecting !== toNodeId) {
      // Check if connection already exists
      const exists = connections.some(c => c.from === connecting && c.to === toNodeId);
      if (!exists) {
        setConnections([...connections, { from: connecting, to: toNodeId, id: `conn_${Date.now()}` }]);
      }
    }
    setConnecting(null);
  }

  function deleteConnection(connId) {
    setConnections(connections.filter(c => c.id !== connId));
  }

  async function saveTree() {
    if (!selectedIncidentId) return;

    const treeData = { nodes, connections };

    // Check if exists
    const { data: existing } = await supabase
      .from('incident_logic_trees')
      .select('id')
      .eq('incident_id', selectedIncidentId)
      .single();

    if (existing) {
      await supabase.from('incident_logic_trees').update({
        tree_data: treeData,
        updated_by_email: userEmail,
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);
    } else {
      await supabase.from('incident_logic_trees').insert({
        incident_id: selectedIncidentId,
        tree_data: treeData,
        created_by_email: userEmail
      });
    }

    alert('Logic Tree saved!');
  }

  function exportAsImage() {
    // Create SVG representation
    const svgContent = generateSVG();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logic-tree-${selectedIncident?.incident_id || 'diagram'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function generateSVG() {
    const width = 1200;
    const height = 800;
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background: #fafafa; font-family: Arial, sans-serif;">`;
    
    // Draw connections
    connections.forEach(conn => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      if (fromNode && toNode) {
        const x1 = fromNode.x + 90;
        const y1 = fromNode.y + 60;
        const x2 = toNode.x + 90;
        const y2 = toNode.y;
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748b" stroke-width="2" marker-end="url(#arrowhead)"/>`;
      }
    });

    // Arrow marker
    svg += `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/></marker></defs>`;

    // Draw nodes
    nodes.forEach(node => {
      const nodeType = NODE_TYPES[node.type];
      svg += `<rect x="${node.x}" y="${node.y}" width="180" height="60" rx="8" fill="${nodeType.bg}" stroke="${nodeType.color}" stroke-width="2"/>`;
      svg += `<rect x="${node.x}" y="${node.y}" width="180" height="18" rx="8" fill="${nodeType.color}"/>`;
      svg += `<text x="${node.x + 8}" y="${node.y + 13}" fill="white" font-size="10" font-weight="bold">${nodeType.label.toUpperCase()}</text>`;
      
      // Wrap text
      const words = node.text.split(' ');
      let line = '';
      let lineNum = 0;
      words.forEach(word => {
        if ((line + word).length > 25) {
          svg += `<text x="${node.x + 10}" y="${node.y + 35 + lineNum * 14}" fill="#1e293b" font-size="11">${line}</text>`;
          line = word + ' ';
          lineNum++;
        } else {
          line += word + ' ';
        }
      });
      svg += `<text x="${node.x + 10}" y="${node.y + 35 + lineNum * 14}" fill="#1e293b" font-size="11">${line}</text>`;
    });

    svg += '</svg>';
    return svg;
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail) { setLoginError('Enter email'); return; }
    if (!isSLPTeam(loginEmail)) { setLoginError('Access restricted to @slpalaska.com'); return; }
    localStorage.setItem('slp_user_email', loginEmail.toLowerCase());
    setUserEmail(loginEmail.toLowerCase());
    setIsAuthenticated(true);
  }

  // Login
  if (!isAuthenticated) {
    return (
      <div style={styles.container}><div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>← Back to Portal</a>
        <div style={styles.loginCard}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', margin: '0 auto 25px', display: 'block' }} />
          <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>Logic Tree Builder</h1>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>Build visual cause-effect diagrams</p>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="your.name@slpalaska.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} style={styles.input} />
            {loginError && <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '15px' }}>{loginError}</p>}
            <button type="submit" style={styles.submitBtn}>Sign In</button>
          </form>
        </div>
      </div></div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>← Back to Portal</a>

        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '150px', marginBottom: '10px' }} />
              <div style={styles.headerTitle}>🌳 Logic Tree Builder</div>
              <div style={styles.headerSubtitle}>Build visual cause-effect diagrams for root cause analysis</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Toolbar */}
          <div style={styles.toolbar}>
            <select
              value={selectedIncidentId}
              onChange={(e) => { setSelectedIncidentId(e.target.value); if (e.target.value) loadIncident(e.target.value); }}
              style={styles.select}
            >
              <option value="">-- Select Incident --</option>
              {incidents.map(inc => (
                <option key={inc.id} value={inc.id}>{inc.incident_id} - {inc.company_name}</option>
              ))}
            </select>

            {selectedIncident && (
              <>
                <div style={{ flex: 1 }} />
                <button onClick={saveTree} style={{ ...styles.actionBtn, ...styles.primaryBtn }}>💾 Save Tree</button>
                <button onClick={exportAsImage} style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>📷 Export SVG</button>
              </>
            )}
          </div>

          {/* Legend */}
          <div style={styles.legend}>
            {Object.entries(NODE_TYPES).map(([key, type]) => (
              <div key={key} style={styles.legendItem}>
                <div style={{ ...styles.legendColor, background: type.color }} />
                <span>{type.label}</span>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b' }}>
              Click node to select • Drag to move • Click connector to link
            </div>
          </div>

          <div style={{ display: 'flex' }}>
            {/* Canvas */}
            <div
              ref={canvasRef}
              style={styles.canvas}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={() => { if (!draggedNode) setSelectedNode(null); setConnecting(null); }}
            >
              {!selectedIncident ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>🌳</div>
                    <p>Select an incident to start building a Logic Tree</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Draw connections */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                      </marker>
                    </defs>
                    {connections.map(conn => {
                      const fromNode = nodes.find(n => n.id === conn.from);
                      const toNode = nodes.find(n => n.id === conn.to);
                      if (!fromNode || !toNode) return null;
                      return (
                        <g key={conn.id}>
                          <line
                            x1={fromNode.x + 90}
                            y1={fromNode.y + 70}
                            x2={toNode.x + 90}
                            y2={toNode.y}
                            stroke="#64748b"
                            strokeWidth="2"
                            markerEnd="url(#arrowhead)"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Draw nodes */}
                  {nodes.map(node => {
                    const nodeType = NODE_TYPES[node.type];
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <div
                        key={node.id}
                        style={{
                          ...styles.node,
                          left: node.x,
                          top: node.y,
                          background: nodeType.bg,
                          borderColor: isSelected ? '#000' : nodeType.color,
                          boxShadow: isSelected ? '0 0 0 3px rgba(0,0,0,0.2)' : styles.node.boxShadow,
                          zIndex: isSelected ? 100 : 1
                        }}
                        onMouseDown={(e) => handleMouseDown(e, node)}
                        onClick={(e) => { e.stopPropagation(); setSelectedNode(node); if (connecting) completeConnection(node.id); }}
                      >
                        <div style={styles.nodeHeader}>
                          <span style={{ ...styles.nodeType, background: nodeType.color }}>{nodeType.label}</span>
                          {node.isRoot && <span style={{ fontSize: '10px', color: '#64748b' }}>ROOT</span>}
                        </div>
                        <div style={styles.nodeText}>{node.text}</div>
                        
                        {/* Connection points */}
                        <div
                          style={{ ...styles.nodeConnector, bottom: '-6px', left: '50%', transform: 'translateX(-50%)', background: connecting === node.id ? '#dc2626' : '#64748b' }}
                          onClick={(e) => { e.stopPropagation(); startConnection(node.id); }}
                          title="Click to connect to another node"
                        />
                      </div>
                    );
                  })}

                  {connecting && (
                    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#1e3a8a', color: 'white', padding: '10px 20px', borderRadius: '8px', zIndex: 1000 }}>
                      Click another node to connect, or click canvas to cancel
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar */}
            {selectedIncident && (
              <div style={styles.sidebar}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1e293b' }}>Add Node</h3>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Node Type</label>
                  <select value={newNodeType} onChange={(e) => setNewNodeType(e.target.value)} style={{ ...styles.select, width: '100%' }}>
                    {Object.entries(NODE_TYPES).map(([key, type]) => (
                      <option key={key} value={key}>{type.label} - {type.description}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    value={newNodeText}
                    onChange={(e) => setNewNodeText(e.target.value)}
                    placeholder="Describe the event, condition, or cause..."
                    style={styles.textarea}
                  />
                </div>

                <button onClick={addNode} disabled={!newNodeText.trim()} style={{ ...styles.actionBtn, ...styles.primaryBtn, width: '100%', justifyContent: 'center', opacity: newNodeText.trim() ? 1 : 0.5 }}>
                  ➕ Add Node
                </button>

                {/* Selected Node Properties */}
                {selectedNode && (
                  <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e2e8f0' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#1e293b' }}>Selected Node</h3>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Type</label>
                      <select
                        value={selectedNode.type}
                        onChange={(e) => updateNodeType(selectedNode.id, e.target.value)}
                        style={{ ...styles.select, width: '100%' }}
                        disabled={selectedNode.isRoot}
                      >
                        {Object.entries(NODE_TYPES).map(([key, type]) => (
                          <option key={key} value={key}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Text</label>
                      <textarea
                        value={selectedNode.text}
                        onChange={(e) => updateNodeText(selectedNode.id, e.target.value)}
                        style={styles.textarea}
                      />
                    </div>

                    {!selectedNode.isRoot && (
                      <button onClick={() => deleteNode(selectedNode.id)} style={{ ...styles.actionBtn, ...styles.dangerBtn, width: '100%', justifyContent: 'center' }}>
                        🗑️ Delete Node
                      </button>
                    )}
                  </div>
                )}

                {/* Connections List */}
                {connections.length > 0 && (
                  <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e2e8f0' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#1e293b' }}>Connections ({connections.length})</h3>
                    {connections.map(conn => {
                      const fromNode = nodes.find(n => n.id === conn.from);
                      const toNode = nodes.find(n => n.id === conn.to);
                      return (
                        <div key={conn.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#f8fafc', borderRadius: '6px', marginBottom: '8px', fontSize: '12px' }}>
                          <span>{fromNode?.text?.substring(0, 15)}... → {toNode?.text?.substring(0, 15)}...</span>
                          <button onClick={() => deleteConnection(conn.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <div style={{ marginBottom: '5px' }}><strong>Powered by Predictive Safety Analytics™</strong></div>
          <div>© 2026 SLP Alaska, LLC. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
