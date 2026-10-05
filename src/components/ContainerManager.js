import React, { useEffect, useState, useCallback, useRef } from 'react';

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// Containers the dashboard must never stop (stopping CT 120 kills the dashboard itself).
const PROTECTED_CT_IDS = new Set([120]);

// When nodeName is given, the manager is locked to that node and the node picker is hidden.
function ContainerManager({ nodeName }) {
  const [nodes, setNodes] = useState([]);
  const [pickedNode, setPickedNode] = useState(null);
  const selectedNode = nodeName || pickedNode;
  const currentNodeRef = useRef(selectedNode);
  currentNodeRef.current = selectedNode;
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (nodeName) return;
    async function fetchNodes() {
      try {
        const res = await fetch('/api/nodes');
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        setNodes(data);
        if (data.length > 0) setPickedNode(data[0].node);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
    fetchNodes();
  }, [nodeName]);

  const fetchContainers = useCallback(async () => {
    if (!selectedNode) return;
    // Drop responses that arrive after the node has changed, so containers from the
    // previous node are never shown (or acted on) under the new one.
    const isStale = () => currentNodeRef.current !== selectedNode;
    try {
      const res = await fetch(`/api/nodes/${selectedNode}/lxc`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      if (isStale()) return;
      setContainers(data);
      setError(null);
    } catch (err) {
      if (!isStale()) setError(err.message);
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [selectedNode]);

  useEffect(() => {
    setLoading(true);
    fetchContainers();
    const interval = setInterval(fetchContainers, 5000);
    return () => clearInterval(interval);
  }, [fetchContainers]);

  async function handleAction(vmid, action) {
    setPendingAction(`${vmid}-${action}`);
    try {
      const res = await fetch(`/api/nodes/${selectedNode}/lxc/${vmid}/${action}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      await fetchContainers();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="fade-in">
      <h2 className="panel-title">Containers</h2>

      {!nodeName && (
        <div className="node-selector">
          {nodes.map((node) => (
            <button
              key={node.node}
              className={`node-chip ${selectedNode === node.node ? 'active' : ''}`}
              onClick={() => setPickedNode(node.node)}
            >
              {node.node}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="state-message">
          <div className="spinner" />
          Loading containers...
        </div>
      )}

      {!loading && error && (
        <div className="state-message error">Failed to load containers: {error}</div>
      )}

      {!loading && !error && (
        <div className="card-list">
          {containers.length === 0 && (
            <div className="state-message">No containers on this node.</div>
          )}
          {containers
            .slice()
            .sort((a, b) => Number(a.vmid) - Number(b.vmid))
            .map((ct) => {
              const isRunning = ct.status === 'running';
              const isProtected = PROTECTED_CT_IDS.has(Number(ct.vmid));
              const startBusy = pendingAction === `${ct.vmid}-start`;
              const stopBusy = pendingAction === `${ct.vmid}-stop`;

              return (
                <div className="card" key={ct.vmid}>
                  <div className="card-header">
                    <span className="card-title">
                      {ct.name || `CT ${ct.vmid}`}
                      <span className="card-subtitle">#{ct.vmid}</span>
                    </span>
                    <span className={`badge ${isRunning ? 'badge-running' : 'badge-stopped'}`}>
                      {ct.status}
                    </span>
                  </div>

                  {isRunning && (
                    <div className="card-subtitle" style={{ marginBottom: 6 }}>
                      CPU {((ct.cpu || 0) * 100).toFixed(0)}% · Mem{' '}
                      {formatBytes(ct.mem)} / {formatBytes(ct.maxmem)}
                    </div>
                  )}

                  <div className="btn-row">
                    <button
                      className="btn btn-start"
                      disabled={isRunning || startBusy}
                      onClick={() => handleAction(ct.vmid, 'start')}
                    >
                      {startBusy ? 'Starting…' : 'Start'}
                    </button>
                    <button
                      className="btn btn-stop"
                      disabled={!isRunning || stopBusy || isProtected}
                      title={isProtected ? 'This container runs the dashboard' : undefined}
                      onClick={() => handleAction(ct.vmid, 'stop')}
                    >
                      {isProtected ? 'Protected' : stopBusy ? 'Stopping…' : 'Stop'}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default ContainerManager;
