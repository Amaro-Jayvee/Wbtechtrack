/**
 * CSRF Token Utils
 * Helper functions to manage CSRF tokens for API requests
 * Replace fetch() calls with fetchWithCSRF() to automatically include CSRF tokens
 */

// Get CSRF token from cookies
export function getCsrfToken() {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, 10) === 'csrftoken=') {
        cookieValue = decodeURIComponent(cookie.substring(10));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * Universal API fetch function for all API calls
 * Automatically includes:
 * - Credentials (session cookies)
 * - Backend URL resolution
 * - CSRF token for state-changing requests
 * 
 * Usage: Use this for ALL API calls instead of fetch()
 * const response = await apiCall('/app/whoami/');
 * const response = await apiCall('/app/login/', { method: 'POST', body: {...} });
 */
export async function apiCall(url, options = {}) {
  const csrfToken = getCsrfToken();
  
  // Ensure URL is absolute (convert relative URLs to backend URLs)
  let absoluteUrl = url;
  if (url.startsWith('/')) {
    absoluteUrl = `${getBackendUrl()}${url}`;
  }
  
  // Initialize headers
  options.headers = options.headers || {};
  
  // Always include credentials for session cookies
  options.credentials = options.credentials || 'include';
  
  // Add CSRF token for state-changing requests
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (csrfToken) {
      options.headers['X-CSRFToken'] = csrfToken;
    }
  }
  
  // Add default content type for JSON requests
  if (options.body && typeof options.body === 'object') {
    options.body = JSON.stringify(options.body);
    if (!options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json';
    }
  }
  
  // Add default Accept header
  if (!options.headers['Accept']) {
    options.headers['Accept'] = 'application/json';
  }
  
  return fetch(absoluteUrl, options);
}

/**
 * Get the backend API URL
 * Hardcoded for production, localhost for development
 */
function getRuntimeBackendUrl() {
  return window.__FRONTEND_RUNTIME_CONFIG__?.BACKEND_URL || window.__BACKEND_BASE_URL__ || window.__BACKEND_URL__ || window.__API_URL__ || '';
}

function normalizeBackendUrl(url) {
  if (!url) {
    return '';
  }
  let normalized = url.trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

export function getBackendUrl() {
  // Development: use localhost
  if (!import.meta.env.PROD) {
    return 'http://localhost:8000';
  }

  const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || getRuntimeBackendUrl();
  if (configuredBackendUrl) {
    return normalizeBackendUrl(configuredBackendUrl);
  }

  // In production, use same-origin proxy paths when backend URL is not built in.
  // This supports Docker/nginx deployments where /app/ is proxied to the backend.
  console.warn('[CSRF Utils] No VITE_BACKEND_URL configured. Using same-origin proxy for /app/ requests.');
  return window.location.origin;
}

/**
 * Ensure CSRF token is initialized
 * Call this once when the app loads to request the CSRF token from Django
 * This will set the csrftoken cookie if not already present
 */
export async function initializeCsrfToken() {
  try {
    const backendUrl = getBackendUrl();
    const csrfUrl = `${backendUrl}/app/csrf-token/`;
    const response = await fetch(csrfUrl, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
    if (!response.ok) {
      console.warn('[CSRF Utils] Could not initialize CSRF token');
    }
  } catch (error) {
    console.warn('[CSRF Utils] Error initializing CSRF token:', error);
  }
}
