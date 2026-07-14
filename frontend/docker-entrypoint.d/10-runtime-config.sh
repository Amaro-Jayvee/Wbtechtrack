#!/bin/sh

# Runtime config for Vite bundle to use backend URL when build-time env is not available.
# This is useful for deployed Docker images where the frontend is served separately.

BACKEND_URL=${BACKEND_BASE_URL:-$BACKEND_URL}
BACKEND_URL=${BACKEND_URL:-$VITE_BACKEND_URL}
BACKEND_URL=${BACKEND_URL:-$VITE_API_URL}

if [ -n "$BACKEND_URL" ] && ! echo "$BACKEND_URL" | grep -Eqi '^https?://'; then
  BACKEND_URL="https://$BACKEND_URL"
fi

export BACKEND_URL

# Expose runtime config so frontend can resolve backend URL at runtime.
if [ ! -z "$BACKEND_URL" ]; then
  cat > /usr/share/nginx/html/runtime-config.js <<'EOF'
window.__FRONTEND_RUNTIME_CONFIG__ = {
  BACKEND_URL: '$BACKEND_URL'
};
window.__BACKEND_URL__ = '$BACKEND_URL';
window.__API_URL__ = '$BACKEND_URL';
EOF
else
  cat > /usr/share/nginx/html/runtime-config.js <<'EOF'
window.__FRONTEND_RUNTIME_CONFIG__ = {
  BACKEND_URL: ''
};
window.__BACKEND_URL__ = '';
window.__API_URL__ = '';
EOF
fi
