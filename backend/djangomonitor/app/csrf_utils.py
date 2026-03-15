"""
CSRF Token Helper Utilities for Frontend
Manages CSRF token retrieval and injection into API requests
"""

def get_csrf_token():
    """
    Retrieve CSRF token from cookie
    Django stores it in csrftoken cookie by default
    """
    const = '''
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    const csrftoken = getCookie('csrftoken');
    '''
    return const


def fetch_with_csrf(url, options=None):
    """
    Wrapper for fetch API that automatically includes CSRF token
    Usage:
        fetchWithCsrf('http://localhost:8000/app/endpoint/', {
            method: 'POST',
            body: JSON.stringify({data: 'value'})
        })
    """
    js_code = '''
    function fetchWithCsrf(url, options = {}) {
        const csrftoken = getCookie('csrftoken');
        
        // Set default headers
        options.headers = options.headers || {};
        options.credentials = options.credentials || 'include';
        
        // Add CSRF token for state-changing requests
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
            options.headers['X-CSRFToken'] = csrftoken;
        }
        
        // Add content type if not already set
        if (options.body && !options.headers['Content-Type']) {
            options.headers['Content-Type'] = 'application/json';
        }
        
        return fetch(url, options);
    }
    '''
    return js_code
