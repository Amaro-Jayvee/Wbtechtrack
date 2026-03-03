from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0035_notification_action_data_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='requests',
            name='approval_status',
            field=models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('declined', 'Declined')], default='pending', max_length=20, verbose_name='Approval Status'),
        ),
        migrations.AddField(
            model_name='requests',
            name='approved_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_requests', to='auth.user'),
        ),
        migrations.AddField(
            model_name='requests',
            name='approval_notes',
            field=models.TextField(blank=True, null=True, verbose_name='Approval Notes'),
        ),
    ]
