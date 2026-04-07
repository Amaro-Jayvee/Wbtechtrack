# Generated migration for OT daily reset feature

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0058_add_productprocess_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='productprocess',
            name='ot_enabled_date',
            field=models.DateField(
                blank=True,
                null=True,
                verbose_name='OT Enabled Date',
                help_text='Date when OT was last enabled for this task - used to track daily reset'
            ),
        ),
    ]
