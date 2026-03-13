import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import HomePage from './HomePage.jsx'
import DemoPage from './DemoPage.jsx'

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function Router() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onNav = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []);

  if (path === '/coordinator') return <App initialRole="coordinator" navigate={navigate} />;
  if (path === '/patient') return <App initialRole="patient" navigate={navigate} />;
  if (path === '/demo') return <DemoPage navigate={navigate} />;
  return <HomePage navigate={navigate} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
)
