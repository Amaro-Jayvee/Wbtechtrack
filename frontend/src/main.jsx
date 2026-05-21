import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { getBackendUrl } from './shared/utils/csrfUtils.js'

/**
 * Global fetch interceptor
 * Automatically converts relative API URLs to absolute backend URLs
 */
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  // Only intercept string URLs (not Request objects)
  if (typeof url === 'string') {
    // If it's a relative URL starting with /, prepend backend URL
    if (url.startsWith('/')) {
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
