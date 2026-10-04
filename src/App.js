import React, { useEffect, useState } from 'react';
import './App.css';
import ControlPanel from './components/ControlPanel';
import DetailedDashboard from './components/DetailedDashboard';

const MONITOR_QUERY = '(min-width: 1425px)';

function useIsMonitor() {
  const [isMonitor, setIsMonitor] = useState(() => window.matchMedia(MONITOR_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MONITOR_QUERY);
    const onChange = (e) => setIsMonitor(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMonitor;
}

function App() {
  const isMonitor = useIsMonitor();
  const [selectedNode, setSelectedNode] = useState(
    () => localStorage.getItem('selectedNode') || null
  );

  // Persist to localStorage when selectedNode changes
  useEffect(() => {
    if (selectedNode) {
      localStorage.setItem('selectedNode', selectedNode);
    }
  }, [selectedNode]);

  // Listen for changes from other browser windows/tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'selectedNode' && e.newValue) {
        setSelectedNode(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="app">
      {isMonitor ? (
        <DetailedDashboard nodeName={selectedNode} />
      ) : (
        <ControlPanel selectedNode={selectedNode} onSelectNode={setSelectedNode} />
      )}
    </div>
  );
}

export default App;
