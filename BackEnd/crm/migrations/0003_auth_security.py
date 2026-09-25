from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('crm', '0002_task')]
    operations = [
        migrations.AddField(model_name='user', name='failed_login_attempts', field=models.PositiveSmallIntegerField(default=0)),
        migrations.AddField(model_name='user', name='locked_until', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='user', name='must_change_password', field=models.BooleanField(default=False)),
        migrations.CreateModel(name='CrmSession', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('session_key', models.CharField(max_length=40, unique=True)),
            ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
            ('browser', models.CharField(blank=True, max_length=500)),
            ('created_at', models.DateTimeField(auto_now_add=True)),
            ('last_seen_at', models.DateTimeField(auto_now=True)),
            ('revoked_at', models.DateTimeField(blank=True, null=True)),
            ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='crm_sessions', to='crm.user')),
        ]),
        migrations.CreateModel(name='PasswordResetToken', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('code_hash', models.CharField(max_length=128)),
            ('expires_at', models.DateTimeField()),
            ('used_at', models.DateTimeField(blank=True, null=True)),
            ('created_at', models.DateTimeField(auto_now_add=True)),
            ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='password_reset_tokens', to='crm.user')),
        ]),
        migrations.CreateModel(name='Notification', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('event_type', models.CharField(max_length=100)),
            ('message', models.CharField(max_length=500)),
            ('read_at', models.DateTimeField(blank=True, null=True)),
            ('created_at', models.DateTimeField(auto_now_add=True)),
            ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='crm.user')),
        ]),
    ]
