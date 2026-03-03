# Generated migration for adding completed_at field to RequestProduct

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0028_notification'),
    ]

    operations = [
        migrations.AddField(
            model_name='requestproduct',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Completed At'),
        ),
    ]
