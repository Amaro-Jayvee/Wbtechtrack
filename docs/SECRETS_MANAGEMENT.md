# Production Secrets Management Guide

> ⚠️ **IMPORTANT**: Never commit `.env`, `.env.production`, or any secrets files to version control!

## 🔐 Security Best Practices

### 1. Environment Files

**DO:**
- ✅ Add `.env*` to `.gitignore`
- ✅ Create `.env.example` with placeholder values
- ✅ Use strong, random passwords (20+ characters)
- ✅ Rotate secrets regularly
- ✅ Use different secrets for each environment

**DON'T:**
- ❌ Commit `.env` or `.env.production` to Git
- ❌ Use simple passwords like "password123"
- ❌ Share `.env` files via email or Slack
- ❌ Reuse production secrets across environments

### 2. Secret Rotation

```bash
# Generate new SECRET_KEY
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Generate random password (Linux/Mac)
openssl rand -base64 32

# Generate random password (Windows PowerShell)
[Convert]::ToBase64String(([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)))
```

### 3. Environment-Specific Configuration

**Development (.env):**
```env
DEBUG=True
SECRET_KEY=dev-key-not-used-in-prod
DB_PASSWORD=dev-password
ALLOWED_HOSTS=localhost,127.0.0.1,backend
```

**Production (.env.production):**
```env
DEBUG=False
SECRET_KEY=<generate-new-random-key>
DB_PASSWORD=<strong-random-password>
DB_ROOT_PASSWORD=<strong-random-password>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

### 4. Deployment with Docker Secrets (for Swarm/K8s)

For Docker Swarm or Kubernetes, use secret management:

```bash
# Create Docker secret
echo "my-secret-value" | docker secret create my_secret -

# Reference in docker-compose-prod.yml
services:
  backend:
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    external: true
```

### 5. CI/CD Integration (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
env:
  REGISTRY: ghcr.io

jobs:
  deploy:
    steps:
      - name: Deploy
        env:
          SECRET_KEY: ${{ secrets.DJANGO_SECRET_KEY }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          EMAIL_PASSWORD: ${{ secrets.EMAIL_PASSWORD }}
        run: |
          docker-compose -f docker-compose.yml build
          docker-compose -f docker-compose.yml push
```

### 6. AWS Secrets Manager Integration

```python
# settings.py
import boto3
import json

def get_secret(secret_name):
    client = boto3.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

secrets = get_secret('techtrack/production')
SECRET_KEY = secrets['django_secret_key']
DB_PASSWORD = secrets['db_password']
```

### 7. Audit & Monitoring

```bash
# Check environment variables aren't exposed
docker-compose exec backend env | grep -i password

# Scan for secrets in code
# Install: pip install detect-secrets
detect-secrets scan

# View Docker logs (be careful - they might contain secrets)
docker-compose logs backend | grep -i secret
```

## 🛡️ Environment File Checklist

- [ ] `.env` and `.env.production` added to `.gitignore`
- [ ] `.env.example` created with placeholder values
- [ ] All passwords are 20+ characters
- [ ] `DEBUG=False` in production
- [ ] Unique `SECRET_KEY` for production
- [ ] Email credentials are correct
- [ ] Database credentials are strong
- [ ] `ALLOWED_HOSTS` includes actual domain
- [ ] `CORS_ALLOWED_ORIGINS` restricted to your domain
- [ ] Files have restricted permissions (not world-readable)

## 📋 Pre-Deployment Checklist

```bash
# Before pushing to production:

# 1. Verify secrets are not in Git history
git log -p | grep -i "password\|secret_key"

# 2. Check .env file permissions
ls -la .env .env.production

# 3. Verify .env files are in .gitignore
cat .gitignore | grep env

# 4. Regenerate all secrets
SECRET_KEY=$(python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")

# 5. Test deployment locally
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d

# 6. Verify no secrets in logs
docker-compose logs | grep SECRET_KEY
```

## 🚨 If Secrets Are Exposed

⚠️ **If you accidentally commit secrets:**

```bash
# 1. Remove from Git history
git filter-branch --tree-filter "rm -f .env .env.production" -- --all

# 2. Force push (after review!)
git push origin --force --all

# 3. Regenerate ALL secrets immediately
# 4. Rotate database passwords
# 5. Review audit logs for any unauthorized access
```

---

**See also:** [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)
