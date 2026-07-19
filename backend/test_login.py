import http.cookiejar, urllib.request, urllib.parse

BASE = 'http://localhost:8000'
csrf_url = BASE + '/app/csrf-token/'
login_url = BASE + '/app/login/'

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def get_csrf():
    print('GET', csrf_url)
    r = opener.open(csrf_url)
    print('status', r.status)
    print('cookies', [(c.name, c.value) for c in cj])
    return

def post_login(username, password):
    import json
    payload = {'username': username, 'password': password}
    data = json.dumps(payload).encode()
    req = urllib.request.Request(login_url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    # include Referer header for CSRF
    req.add_header('Referer', BASE + '/')
    # include X-CSRFToken header from cookie if present
    csrf = None
    for c in cj:
        if c.name == 'csrftoken':
            csrf = c.value
            break
    if csrf:
        req.add_header('X-CSRFToken', csrf)
    print('POST', login_url)
    r = opener.open(req)
    body = r.read().decode(errors='replace')
    print('status', r.status)
    print('headers:', r.getheaders())
    print('cookies after:', [(c.name, c.value, c.domain, c.path) for c in cj])
    print('body:', body[:1000])

if __name__ == '__main__':
    get_csrf()
    post_login('admin', 'TechTrack123!')
