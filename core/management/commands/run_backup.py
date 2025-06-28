import os
from django.core.management.base import BaseCommand
from django.conf import settings
from core.models import SystemSettings
from datetime import datetime
from pathlib import Path
import subprocess

class Command(BaseCommand):
    help = 'Performs a database backup if auto_backup is enabled in SystemSettings.'

    def handle(self, *args, **options):
        system_settings = SystemSettings.get_solo()
        if not system_settings.auto_backup:
            self.stdout.write(self.style.WARNING('Automatic backup is disabled in system settings.'))
            return

        backup_dir = Path(settings.BASE_DIR) / 'backups'
        backup_dir.mkdir(exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        db_engine = settings.DATABASES['default']['ENGINE']
        db_name = settings.DATABASES['default']['NAME']

        if 'sqlite3' in db_engine:
            backup_file = backup_dir / f'db_backup_{timestamp}.sqlite3'
            self.stdout.write(f'Backing up SQLite database to {backup_file}')
            try:
                import shutil
                shutil.copy2(db_name, backup_file)
                self.stdout.write(self.style.SUCCESS(f'Successfully backed up to {backup_file}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Backup failed: {e}'))
        elif 'postgresql' in db_engine:
            backup_file = backup_dir / f'db_backup_{timestamp}.sql'
            self.stdout.write(f'Backing up PostgreSQL database to {backup_file}')
            user = settings.DATABASES['default']['USER']
            host = settings.DATABASES['default']['HOST']
            port = settings.DATABASES['default']['PORT']
            env = os.environ.copy()
            env['PGPASSWORD'] = settings.DATABASES['default']['PASSWORD']
            cmd = [
                'pg_dump',
                '-U', user,
                '-h', host,
                '-p', str(port),
                '-F', 'c',
                '-b',
                '-v',
                '-f', str(backup_file),
                db_name
            ]
            try:
                subprocess.run(cmd, check=True, env=env)
                self.stdout.write(self.style.SUCCESS(f'Successfully backed up to {backup_file}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Backup failed: {e}'))
        else:
            self.stdout.write(self.style.ERROR('Unsupported database engine for backup.')) 