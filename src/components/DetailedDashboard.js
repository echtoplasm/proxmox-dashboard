import React from 'react';
import NodesList from './NodesList';
import VMManager from './VMManager';

function DetailedDashboard({ nodeName }) {
  return (
    <div className="detailed-dashboard">
      <header className="app-header dashboard-header">
        <div className="dashboard-header-label">Proxmox Node</div>
        <h1>{nodeName || 'No node selected'}</h1>
      </header>

      {nodeName ? (
        <main className="dashboard-grid">
          <section className="dashboard-panel">
            <NodesList nodeName={nodeName} />
          </section>
          <section className="dashboard-panel">
            <VMManager nodeName={nodeName} />
          </section>
        </main>
      ) : (
        <div className="state-message">Select a node on the touch control panel.</div>
      )}
    </div>
  );
}

export default DetailedDashboard;
