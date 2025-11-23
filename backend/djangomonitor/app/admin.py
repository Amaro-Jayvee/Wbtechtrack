from django.contrib import admin
from app.models import *

# Register your models here.

# admin.site.register(Employees)
# admin.site.register(Products)
admin.site.register(Requests)
admin.site.register(RequestProduct)
admin.site.register(ProductName)
admin.site.register(ProductProcess)
admin.site.register(ProcessName)
admin.site.register(Worker)
admin.site.register(ProcessTemplate)
admin.site.register(UserProfile)

