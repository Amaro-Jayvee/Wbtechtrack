# This code will be added to models.py - PasswordResetToken model

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import secrets
import string

class PasswordResetToken(models.Model):
    """
    Store password reset tokens with expiration.
    One active token per user at a time.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=255, unique=True, db_index=True)
    email = models.EmailField()  # Store email used for reset
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # Token expiration time
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Reset token for {self.user.username}"
    
    @staticmethod
    def generate_token(length=32):
        """Generate a secure random token"""
        characters = string.ascii_letters + string.digits
        return ''.join(secrets.choice(characters) for i in range(length))
    
    def is_valid(self):
        """Check if token is still valid (not expired and not used)"""
        return not self.is_used and timezone.now() < self.expires_at
    
    def mark_used(self):
        """Mark token as used"""
        self.is_used = True
        self.save()
