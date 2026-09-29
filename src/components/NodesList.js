import React, { useEffect, useState } from 'react';

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

function formatUptime(seconds) {
  if (!seconds) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function barClass(pct) {
  if (pct >= 90) return 'danger';
  if (pct >= 70) return 'warn';
  return '';
}

function MetricBar({ label, pct, detail }) {
  const clamped = Math.min(100, Math.max(0, pct || 0));
  return (
    <div className="metric-row">
      <div className="metric-label-row">
        <span>{label}</span>
        <span>{detail}</span>
      </div>
      <div className="metric-bar-track">
        <div
          className={`metric-bar-fill ${barClass(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function NodesList() {
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
    const interval = setInterval(fetchNodes, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="state-message">
        <div className="spinner" />
        Loading nodes...
      </div>
    );
  }

  if (error) {
    return <div className="state-message error">Failed to load nodes: {error}</div>;
  }

  return (
    <div className="fade-in">
      <h2 className="panel-title">Nodes</h2>
      <p className="panel-subtitle">Updates every 5 seconds</p>

      <div className="card-list">
        {nodes
          .slice()
          .sort((a, b) => a.node.localeCompare(b.node))
          .map((node) => {
            const cpuPct = (node.cpu || 0) * 100;
            const memPct = node.maxmem ? (node.mem / node.maxmem) * 100 : 0;
            const diskPct = node.maxdisk ? (node.disk / node.maxdisk) * 100 : 0;
            const isOnline = node.status === 'online';

            return (
              <div className="card" key={node.node}>
                <div className="card-header">
                  <span className="card-title">{node.node}</span>
                  <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
                    {node.status}
                  </span>
                </div>
                <div className="card-subtitle" style={{ marginBottom: 12 }}>
                  Uptime: {formatUptime(node.uptime)}
                </div>

                <MetricBar
                  label="CPU"
                  pct={cpuPct}
                  detail={`${cpuPct.toFixed(0)}% of ${node.maxcpu || '?'} cores`}
                />
                <MetricBar
                  label="Memory"
                  pct={memPct}
                  detail={`${formatBytes(node.mem)} / ${formatBytes(node.maxmem)}`}
                />
                <MetricBar
                  label="Disk"
                  pct={diskPct}
                  detail={`${formatBytes(node.disk)} / ${formatBytes(node.maxdisk)}`}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default NodesList;
