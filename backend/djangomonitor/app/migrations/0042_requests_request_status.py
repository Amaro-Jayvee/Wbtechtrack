# Generated migration for adding request_status field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0041_requestproduct_restored_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='requests',
            name='request_status',
            field=models.CharField(
                choices=[
                    ('new_request', 'New Request'),
                    ('active', 'Active'),
                    ('completed', 'Completed'),
                ],
                default='new_request',
                max_length=20,
                verbose_name='Request Status'
            ),
        ),
    ]
