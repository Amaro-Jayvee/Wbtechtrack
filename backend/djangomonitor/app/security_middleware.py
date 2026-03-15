"""
Security Headers Middleware
Adds important security headers to all HTTP responses
"""

class SecurityHeadersMiddleware:
    """
    Middleware to add security headers to responses.
    Protects against:
    - Clickjacking (X-Frame-Options)
    - MIME type sniffing (X-Content-Type-Options)
    - XSS attacks (X-XSS-Protection)
    - Referrer leakage (Referrer-Policy)
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Prevent clickjacking - don't allow embedding in iframes
        response['X-Frame-Options'] = 'DENY'
        
        # Prevent MIME type sniffing - browsers must respect Content-Type
        response['X-Content-Type-Options'] = 'nosniff'
        
        # Enable XSS protection in older browsers
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Control referrer information
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Prevent caching of sensitive content
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        
        return response
