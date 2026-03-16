import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import HomePage from './HomePage.jsx'
import DemoPage from './DemoPage.jsx'
import ScriptedDemoPage from './demo/ScriptedDemoPage.jsx'
import LiveDemoPage from './demo/LiveDemoPage.jsx'
import ROICalculator from './ROICalculator.jsx'

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function Router() {
  const [path, setPath] = useState(window.location.pathname + window.location.search);

  useEffect(() => {
    const onNav = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []);

  const pathname = path.split('?')[0];

  if (pathname === '/coordinator') return <App initialRole="coordinator" navigate={navigate} />;
  if (pathname === '/patient') return <App initialRole="patient" navigate={navigate} />;
  if (pathname === '/demo/scripted') return <ScriptedDemoPage navigate={navigate} />;
  if (pathname === '/demo/live') return <LiveDemoPage navigate={navigate} />;
  if (pathname === '/demo') return <DemoPage navigate={navigate} />;
  if (pathname === '/roi') return <ROICalculator />;
  return <HomePage navigate={navigate} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
)
