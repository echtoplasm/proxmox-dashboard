import React, { useEffect, useState } from 'react';

function ClusterStatus() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const res = await fetch('/api/cluster/status');
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setItems(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="state-message">
        <div className="spinner" />
        Connecting to cluster...
      </div>
    );
  }

  if (error) {
    return <div className="state-message error">Failed to load cluster status: {error}</div>;
  }

  const cluster = items.find((item) => item.type === 'cluster');
  const nodes = items.filter((item) => item.type === 'node');
  const onlineCount = nodes.filter((n) => n.online).length;

  return (
    <div className="fade-in">
      <h2 className="panel-title">Cluster Overview</h2>
      <p className="panel-subtitle">{cluster ? cluster.name : 'Standalone node'}</p>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-value">{nodes.length}</div>
          <div className="stat-label">Nodes</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{onlineCount}</div>
          <div className="stat-label">Online</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{cluster && cluster.quorate ? 'Yes' : 'No'}</div>
          <div className="stat-label">Quorate</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Quorum Status</span>
          <span className={`badge ${cluster && cluster.quorate ? 'badge-online' : 'badge-offline'}`}>
            {cluster && cluster.quorate ? 'Quorum OK' : 'No Quorum'}
          </span>
        </div>
        <p className="card-subtitle">
          {cluster
            ? `${cluster.nodes} node(s) configured, version ${cluster.version}`
            : 'This host is not part of a cluster.'}
        </p>
      </div>

      <h2 className="panel-title" style={{ marginTop: 22 }}>
        Members
      </h2>
      <div className="member-list">
        {nodes.map((node) => (
          <div className="member-row" key={node.id || node.name}>
            <div>
              <div className="member-name">{node.name}</div>
              <div className="member-ip">{node.ip}</div>
            </div>
            <span className={`badge ${node.online ? 'badge-online' : 'badge-offline'}`}>
              {node.online ? 'Online' : 'Offline'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ClusterStatus;
