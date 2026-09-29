import React, { useEffect, useState, useCallback } from 'react';

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

function VMManager() {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    async function fetchNodes() {
      try {
        const res = await fetch('/api/nodes');
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        setNodes(data);
        if (data.length > 0) setSelectedNode(data[0].node);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
    fetchNodes();
  }, []);

  const fetchVms = useCallback(async () => {
    if (!selectedNode) return;
    try {
      const res = await fetch(`/api/nodes/${selectedNode}/vms`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setVms(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedNode]);

  useEffect(() => {
    setLoading(true);
    fetchVms();
    const interval = setInterval(fetchVms, 5000);
    return () => clearInterval(interval);
  }, [fetchVms]);

  async function handleAction(vmid, action) {
    setPendingAction(`${vmid}-${action}`);
    try {
      const res = await fetch(`/api/nodes/${selectedNode}/qemu/${vmid}/${action}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      await fetchVms();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="fade-in">
      <h2 className="panel-title">VM Manager</h2>

      <div className="node-selector">
        {nodes.map((node) => (
          <button
            key={node.node}
            className={`node-chip ${selectedNode === node.node ? 'active' : ''}`}
            onClick={() => setSelectedNode(node.node)}
          >
            {node.node}
          </button>
        ))}
      </div>

      {loading && (
        <div className="state-message">
          <div className="spinner" />
          Loading VMs...
        </div>
      )}

      {!loading && error && (
        <div className="state-message error">Failed to load VMs: {error}</div>
      )}

      {!loading && !error && (
        <div className="card-list">
          {vms.length === 0 && (
            <div className="state-message">No VMs found on this node.</div>
          )}
          {vms
            .slice()
            .sort((a, b) => a.vmid - b.vmid)
            .map((vm) => {
              const isRunning = vm.status === 'running';
              const startBusy = pendingAction === `${vm.vmid}-start`;
              const stopBusy = pendingAction === `${vm.vmid}-stop`;

              return (
                <div className="card" key={vm.vmid}>
                  <div className="card-header">
                    <span className="card-title">
                      {vm.name || `VM ${vm.vmid}`}
                      <span className="card-subtitle">#{vm.vmid}</span>
                    </span>
                    <span className={`badge ${isRunning ? 'badge-running' : 'badge-stopped'}`}>
                      {vm.status}
                    </span>
                  </div>

                  {isRunning && (
                    <div className="card-subtitle" style={{ marginBottom: 6 }}>
                      CPU {((vm.cpu || 0) * 100).toFixed(0)}% · Mem{' '}
                      {formatBytes(vm.mem)} / {formatBytes(vm.maxmem)}
                    </div>
                  )}

                  <div className="btn-row">
                    <button
                      className="btn btn-start"
                      disabled={isRunning || startBusy}
                      onClick={() => handleAction(vm.vmid, 'start')}
                    >
                      {startBusy ? 'Starting…' : 'Start'}
                    </button>
                    <button
                      className="btn btn-stop"
                      disabled={!isRunning || stopBusy}
                      onClick={() => handleAction(vm.vmid, 'stop')}
                    >
                      {stopBusy ? 'Stopping…' : 'Stop'}
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

export default VMManager;
