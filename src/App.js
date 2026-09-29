import React, { useState } from 'react';
import './App.css';
import ClusterStatus from './components/ClusterStatus';
import NodesList from './components/NodesList';
import VMManager from './components/VMManager';

const TABS = [
  { id: 'cluster', label: 'Cluster', icon: '◉' },
  { id: 'nodes', label: 'Nodes', icon: '▦' },
  { id: 'vms', label: 'VMs', icon: '▣' },
];

function App() {
  const [activeTab, setActiveTab] = useState('cluster');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Proxmox Cluster Dashboard</h1>
        <div className="app-header-glow" />
      </header>

      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="app-content">
        {activeTab === 'cluster' && <ClusterStatus />}
        {activeTab === 'nodes' && <NodesList />}
        {activeTab === 'vms' && <VMManager />}
      </main>
    </div>
  );
}

export default App;
