# Generated by Django 4.2.23 on 2025-07-22 11:47

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('schools', '0001_initial'),
        ('notifications', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='announcement',
            name='school',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='announcements', to='schools.school'),
        ),
    ]
