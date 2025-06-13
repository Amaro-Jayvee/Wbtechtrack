from django.contrib import admin
from app.models import Employees, Products, Requests, DailyQuota

# Register your models here.

admin.site.register(Employees)
admin.site.register(Products)
admin.site.register(Requests)
admin.site.register(DailyQuota)