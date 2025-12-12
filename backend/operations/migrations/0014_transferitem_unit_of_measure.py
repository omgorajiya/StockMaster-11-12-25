from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('operations', '0013_auditlog_unit_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='transferitem',
            name='unit_of_measure',
            field=models.CharField(choices=[('stock', 'Stock Unit'), ('purchase', 'Purchase Unit')], default='stock', help_text='Indicates whether the transfer quantity is expressed in stock or purchase units.', max_length=20),
        ),
    ]

