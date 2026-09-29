import React, { useEffect, useState } from 'react';

function ControlPanel({ selectedNode, onSelectNode }) {
  const [nodes, setNodes] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchNodes() {
      try {
        const res = await fetch('/api/nodes');
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setNodes(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNodes();
    // Keep the status dots current.
    const interval = setInterval(fetchNodes, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="control-panel">
      <header className="app-header control-panel-header">
        <h1>Proxmox</h1>
        <div className="control-panel-selected">{selectedNode || 'No node selected'}</div>
        <div className="app-header-glow" />
      </header>

      <main className="control-panel-content">
        {loading && (
          <div className="state-message">
            <div className="spinner" />
            Loading nodes...
          </div>
        )}

        {!loading && error && !nodes && (
          <div className="state-message error">Failed to load nodes: {error}</div>
        )}

        {nodes && (
          <div className="node-grid fade-in">
            {nodes
              .slice()
              .sort((a, b) => a.node.localeCompare(b.node))
              .map((node) => {
                const isOnline = node.status === 'online';
                const isSelected = node.node === selectedNode;

                return (
                  <button
                    key={node.node}
                    className={`node-button ${isSelected ? 'selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => onSelectNode(node.node)}
                  >
                    <span
                      className={`status-dot ${isOnline ? 'online' : 'offline'}`}
                      title={node.status}
                    />
                    <span className="node-button-icon">🖥️</span>
                    <span className="node-button-name">{node.node}</span>
                  </button>
                );
              })}
          </div>
        )}
      </main>
    </div>
  );
}

export default ControlPanel;
