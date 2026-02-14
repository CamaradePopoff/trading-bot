# Database Migrations

This project uses [migrate-mongo](https://github.com/seppevs/migrate-mongo) for database migrations.

## Setup

Install dependencies:
```bash
npm install
```

## Available Commands

### Check migration status
```bash
npm run migrate:status
```

### Create a new migration
```bash
npm run migrate:create <migration-name>
```
Example: `npm run migrate:create add-new-field`

This creates a new migration file in `migrations/` with timestamp prefix.

### Run pending migrations
```bash
npm run migrate:up
```

Applies all pending migrations in order.

### Rollback last migration
```bash
npm run migrate:down
```

Reverts the last applied migration.

## Migration File Structure

Each migration file exports two functions:

```javascript
module.exports = {
  async up(db, client) {
    // Migration logic (forward)
    await db.collection('myCollection').updateMany(
      { oldField: { $exists: true } },
      { $rename: { oldField: 'newField' } }
    )
  },

  async down(db, client) {
    // Rollback logic (reverse)
    await db.collection('myCollection').updateMany(
      { newField: { $exists: true } },
      { $rename: { newField: 'oldField' } }
    )
  }
}
```

## Configuration

Migration settings are in `migrate-mongo-config.js`:
- **MongoDB URL**: Reads from `MONGODB_URI` environment variable
- **Migrations Directory**: `migrations/`
- **Changelog Collection**: `changelog` (tracks applied migrations)

## Example Migrations

### Adding a field
```javascript
async up(db, client) {
  await db.collection('users').updateMany(
    { newField: { $exists: false } },
    { $set: { newField: 'defaultValue' } }
  )
}
```

### Removing a field
```javascript
async up(db, client) {
  await db.collection('users').updateMany(
    {},
    { $unset: { oldField: '' } }
  )
}
```

### Creating an index
```javascript
async up(db, client) {
  await db.collection('users').createIndex({ email: 1 }, { unique: true })
}
```

### Data transformation
```javascript
async up(db, client) {
  const users = await db.collection('users').find({}).toArray()
  for (const user of users) {
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { fullName: `${user.firstName} ${user.lastName}` } }
    )
  }
}
```

## Best Practices

1. **Always test migrations** on a development database first
2. **Keep migrations small** - one logical change per migration
3. **Write reversible migrations** - always implement `down()` function
4. **Use transactions** for complex operations (requires MongoDB replica set)
5. **Backup before migrating** - use `node scripts/backup-database.js backup`
6. **Version control** - commit migration files to git
7. **Run in order** - migrations are applied based on timestamp in filename

## Migration History

All applied migrations are tracked in the `changelog` collection. Do not modify this collection manually.

## Troubleshooting

### Migration fails
- Check MongoDB connection
- Review migration logs for errors
- Use `npm run migrate:down` to rollback
- Restore from backup if needed

### Out of sync
Check status with `npm run migrate:status` to see which migrations are pending or applied.
