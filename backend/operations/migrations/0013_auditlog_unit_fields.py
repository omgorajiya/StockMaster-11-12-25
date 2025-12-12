from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('operations', '0012_auto_20251126_1610'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='deliveryitem',
            name='unit_of_measure',
            field=models.CharField(choices=[('stock', 'Stock Unit'), ('purchase', 'Purchase Unit')], default='stock', help_text='Indicates whether the shipped quantity is expressed in stock or purchase units.', max_length=20),
        ),
        migrations.AddField(
            model_name='receiptitem',
            name='unit_of_measure',
            field=models.CharField(choices=[('stock', 'Stock Unit'), ('purchase', 'Purchase Unit')], default='stock', help_text='Indicates whether the received quantity is expressed in stock or purchase units.', max_length=20),
        ),
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_type', models.CharField(max_length=50)),
                ('document_id', models.PositiveIntegerField()),
                ('action', models.CharField(choices=[('validation', 'Validation'), ('status_change', 'Status Change'), ('approval', 'Approval'), ('update', 'Update'), ('comment', 'Comment')], max_length=30)),
                ('message', models.CharField(blank=True, max_length=255)),
                ('before_data', models.JSONField(blank=True, null=True)),
                ('after_data', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['document_type', 'document_id'], name='operations__document_f27f45_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['action'], name='operations__action_1b6548_idx'),
        ),
    ]

