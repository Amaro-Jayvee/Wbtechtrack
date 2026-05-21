import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { getBackendUrl } from './shared/utils/csrfUtils.js'

/**
 * Global fetch interceptor
 * Automatically converts relative API URLs to absolute backend URLs
 * Only intercepts /app/* paths (API endpoints), not other relative paths
 */
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  // Only intercept string URLs (not Request objects)
  if (typeof url === 'string') {
    // Only convert /app/* API URLs to backend domain
    // Don't convert other paths like /login, /assets, etc.
    if (url.startsWith('/app/')) {
      url = `${getBackendUrl()}${url}`;
    }
  }
  // Call the original fetch with the resolved URL
  return originalFetch.call(this, url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
