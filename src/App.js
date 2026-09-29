import React, { useEffect, useState } from 'react';
import './App.css';
import ControlPanel from './components/ControlPanel';
import DetailedDashboard from './components/DetailedDashboard';

// Keep in sync with the breakpoints in App.css.
const MONITOR_QUERY = '(min-width: 768px)';

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
  // Lives here (not in the views) so it survives switching between them on resize.
  const [selectedNode, setSelectedNode] = useState(null);

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
