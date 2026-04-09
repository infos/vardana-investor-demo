import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import HomePage from './HomePage.jsx'
import DemoPage from './DemoPage.jsx'
import ScriptedDemoPage from './demo/ScriptedDemoPage.jsx'
import RecordedDemoPage from './demo/RecordedDemoPage.jsx'
import LiveDemoPage from './demo/LiveDemoPage.jsx'
import ROICalculator from './ROICalculator.jsx'
import AdminAnalytics from './AdminAnalytics.jsx'
import CheckinPage from './CheckinPage.jsx'
import ClinicalDemoPage from './demo/ClinicalDemoPage.jsx'
import ClinicalDemoEntry from './demo/ClinicalDemoEntry.jsx'
import { useAnalytics } from './useAnalytics'
import { DEMO_BASE, CLINICAL_BASE } from './demoPath'

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function Router() {
  const [path, setPath] = useState(window.location.pathname + window.location.search);
  useAnalytics();

  useEffect(() => {
    const onNav = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []);

  const pathname = path.split('?')[0];

  // Add noindex meta for demo/coordinator/checkin routes
  useEffect(() => {
    const noindexPaths = ['/demo', '/coordinator', '/patient', '/checkin'];
    const shouldNoindex = noindexPaths.some(p => pathname.startsWith(p));
    let meta = document.querySelector('meta[name="robots"]');
    if (shouldNoindex) {
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'robots';
        document.head.appendChild(meta);
      }
      meta.content = 'noindex, nofollow';
    } else if (meta) {
      meta.remove();
    }
  }, [pathname]);

  if (pathname === '/coordinator') return <App initialRole="coordinator" navigate={navigate} />;
  if (pathname === '/patient') return <App initialRole="patient" navigate={navigate} />;
  if (pathname === `${DEMO_BASE}/scripted`) return <ScriptedDemoPage navigate={navigate} />;
  if (pathname === `${DEMO_BASE}/recorded`) return <RecordedDemoPage navigate={navigate} />;
  if (pathname === `${DEMO_BASE}/live`) return <LiveDemoPage navigate={navigate} />;
  if (pathname === `${DEMO_BASE}/clinical`) return <ClinicalDemoPage navigate={navigate} />;
  if (pathname === CLINICAL_BASE) return <ClinicalDemoEntry navigate={navigate} />;
  if (pathname === DEMO_BASE) return <DemoPage navigate={navigate} />;
  if (pathname === '/checkin') return <CheckinPage navigate={navigate} />;
  if (pathname === '/roi') return <ROICalculator />;
  if (pathname === '/admin') return <AdminAnalytics />;
  return <HomePage navigate={navigate} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
)
