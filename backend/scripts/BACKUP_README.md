# Database Backup Utility

## Automatic Backups

The database is automatically backed up every night at midnight UTC. Backups are stored in the `backups/` directory and rotated with a 7-day retention policy (older backups are automatically deleted).

## Manual Backup

To create a manual backup:

```bash
cd backend
node scripts/backup-database.js backup
```

This will create a JSON file in the `backups/` directory with a timestamp in the filename.

## Restore Database

To restore from a backup:

```bash
cd backend
node scripts/backup-database.js restore backups/backup-2026-01-10T00-00-00-000Z.json
```

**Warning**: The restore command will insert all documents from the backup. Make sure to review the backup file before restoring.

## Backup File Format

Backups are stored as JSON files with the following structure:

```json
{
  "collection1": [
    { "document1": "data" },
    { "document2": "data" }
  ],
  "collection2": [
    { "document1": "data" }
  ]
}
```

## Configuration

- **Backup Directory**: `backend/backups/`
- **Retention Period**: 7 days
- **Schedule**: Daily at 00:00 UTC
- **File Format**: JSON

## Notes

- Backups include all collections in the database
- Each backup is timestamped for easy identification
- Old backups are automatically cleaned up to save disk space
- Backups are excluded from git via `.gitignore`
