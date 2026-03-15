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
 * Fetch wrapper that automatically includes CSRF token in headers
 * Usage: Replace fetch() with fetchWithCSRF() for POST/PUT/PATCH/DELETE requests
 * 
 * @param {string} url - The API endpoint URL
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise} - Fetch response promise
 */
export async function fetchWithCSRF(url, options = {}) {
  const csrfToken = getCsrfToken();
  
  // Initialize headers if not provided
  options.headers = options.headers || {};
  
  // Always include credentials (for session cookies)
  options.credentials = options.credentials || 'include';
  
  // Add CSRF token for state-changing requests
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (csrfToken) {
      options.headers['X-CSRFToken'] = csrfToken;
    }
  }
  
  // Add default content type if not set
  if (options.body && !options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
  }
  
  // Add default Accept header
  if (!options.headers['Accept']) {
    options.headers['Accept'] = 'application/json';
  }
  
  return fetch(url, options);
}

/**
 * Ensure CSRF token is initialized
 * Call this once when the app loads to request the CSRF token from Django
 * This will set the csrftoken cookie if not already present
 */
export async function initializeCsrfToken() {
  try {
    const response = await fetch('http://localhost:8000/app/csrf-token/', {
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
