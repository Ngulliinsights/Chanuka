# Backup & Recovery Guide

## Overview

This guide covers database backup and recovery procedures for the Chanuka Platform.

---

## Backup Strategy

### Backup Schedule

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| **Full Backup** | Daily at 2 AM | 30 days | Local + S3 |
| **Incremental** | Every 6 hours | 7 days | Local |
| **Transaction Logs** | Continuous | 7 days | Local + S3 |

### Backup Locations

1. **Primary**: Local disk (`/backups/`)
2. **Secondary**: AWS S3 (`s3://chanuka-backups/`)
3. **Tertiary**: Off-site cold storage (monthly)

---

## Performing Backups

### Manual Backup

```bash
# Run backup script
./scripts/backup/database-backup.sh

# With custom backup directory
BACKUP_DIR=/custom/path ./scripts/backup/database-backup.sh

# With encryption
BACKUP_ENCRYPTION_KEY="your-secret-key" ./scripts/backup/database-backup.sh
```

### Automated Backup (Cron)

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/project/scripts/backup/database-backup.sh >> /var/log/chanuka-backup.log 2>&1

# Every 6 hours
0 */6 * * * /path/to/project/scripts/backup/database-backup.sh >> /var/log/chanuka-backup.log 2>&1
```

### Backup Configuration

Environment variables in `.env`:

```bash
# Backup settings
BACKUP_DIR=/var/backups/chanuka
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_KEY=your-secret-encryption-key

# S3 upload (optional)
BACKUP_S3_BUCKET=chanuka-backups
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=us-east-1

# Notifications (optional)
BACKUP_NOTIFICATION_EMAIL=admin@chanuka.go.ke
```

---

## Restoring from Backup

### Interactive Restore

```bash
# Run restore script (interactive)
./scripts/backup/restore-database.sh
```

The script will:
1. List available backups
2. Let you select which backup to restore
3. Verify the backup
4. Ask for confirmation
5. Create a pre-restore backup
6. Perform the restore
7. Verify the restore

### Non-Interactive Restore

```bash
# Restore specific backup
SELECTED_BACKUP=/path/to/backup.sql.gz ./scripts/backup/restore-database.sh

# With decryption
BACKUP_ENCRYPTION_KEY="your-secret-key" ./scripts/backup/restore-database.sh
```

---

## Recovery Scenarios

### Scenario 1: Accidental Data Deletion

**Symptoms**: User reports missing data

**Recovery Steps**:
1. Identify when data was deleted
2. Find backup from before deletion
3. Restore to staging environment
4. Extract missing data
5. Import to production

**Time to Recovery**: 15-30 minutes

### Scenario 2: Database Corruption

**Symptoms**: Database errors, connection failures

**Recovery Steps**:
1. Stop application
2. Verify database corruption
3. Restore from latest backup
4. Verify restore
5. Restart application

**Time to Recovery**: 30-60 minutes

### Scenario 3: Complete Data Loss

**Symptoms**: Database server failure, disk failure

**Recovery Steps**:
1. Provision new database server
2. Restore from S3 backup
3. Apply transaction logs
4. Verify data integrity
5. Update connection strings
6. Restart application

**Time to Recovery**: 1-2 hours

### Scenario 4: Point-in-Time Recovery

**Symptoms**: Need to restore to specific time

**Recovery Steps**:
1. Find backup before target time
2. Restore backup
3. Apply transaction logs up to target time
4. Verify data state
5. Test application

**Time to Recovery**: 1-3 hours

---

## Backup Verification

### Automated Verification

Backups are automatically verified:
- ✅ Checksum validation
- ✅ File size check
- ✅ Compression integrity
- ✅ Encryption verification

### Manual Verification

```bash
# Verify checksum
sha256sum -c backup_file.sql.gz.sha256

# Test restore to staging
DATABASE_URL="postgresql://staging..." ./scripts/backup/restore-database.sh

# Check backup metadata
cat backup_file.meta
```

### Monthly Verification

Perform full restore test monthly:
1. Restore to staging environment
2. Run application tests
3. Verify data integrity
4. Document results

---

## Monitoring & Alerts

### Backup Monitoring

Monitor these metrics:
- Backup success/failure rate
- Backup duration
- Backup size
- Storage usage
- Last successful backup time

### Alerts

Set up alerts for:
- ❌ Backup failure
- ⚠️ Backup duration > 1 hour
- ⚠️ Storage usage > 80%
- ❌ No backup in 24 hours
- ⚠️ Backup size anomaly (>50% change)

---

## Disaster Recovery Plan

### RTO & RPO

- **RTO** (Recovery Time Objective): 2 hours
- **RPO** (Recovery Point Objective): 6 hours

### DR Procedures

#### Phase 1: Assessment (15 minutes)
1. Identify scope of disaster
2. Determine recovery strategy
3. Notify stakeholders
4. Activate DR team

#### Phase 2: Recovery (1-2 hours)
1. Provision infrastructure
2. Restore from backup
3. Apply transaction logs
4. Verify data integrity
5. Update DNS/connections

#### Phase 3: Validation (30 minutes)
1. Run health checks
2. Test critical functions
3. Verify data accuracy
4. Monitor performance

#### Phase 4: Cutover (15 minutes)
1. Update production DNS
2. Redirect traffic
3. Monitor closely
4. Document incident

---

## Best Practices

### Do's ✅
- ✅ Test restores regularly
- ✅ Encrypt backups
- ✅ Store backups off-site
- ✅ Monitor backup success
- ✅ Document procedures
- ✅ Automate backups
- ✅ Verify checksums

### Don'ts ❌
- ❌ Store backups only locally
- ❌ Skip backup verification
- ❌ Use weak encryption
- ❌ Ignore backup failures
- ❌ Delete old backups manually
- ❌ Restore to production without testing

---

## Troubleshooting

### Backup Fails

**Problem**: Backup script fails

**Solutions**:
1. Check disk space: `df -h`
2. Check database connectivity: `psql $DATABASE_URL -c "SELECT 1;"`
3. Check permissions: `ls -la /backups/`
4. Check logs: `tail -f /var/log/chanuka-backup.log`

### Restore Fails

**Problem**: Restore script fails

**Solutions**:
1. Verify backup integrity: `sha256sum -c backup.sha256`
2. Check database is empty: `psql $DATABASE_URL -c "\dt"`
3. Check disk space: `df -h`
4. Try manual restore: `gunzip -c backup.sql.gz | psql $DATABASE_URL`

### Slow Backup

**Problem**: Backup takes too long

**Solutions**:
1. Use parallel dump: `pg_dump -j 4`
2. Exclude large tables: `pg_dump --exclude-table=logs`
3. Increase compression level: `gzip -1` (faster, larger)
4. Use incremental backups

### Large Backup Size

**Problem**: Backups are too large

**Solutions**:
1. Archive old data
2. Compress more aggressively: `gzip -9`
3. Exclude unnecessary tables
4. Use incremental backups

---

## Compliance

### Data Protection

- Backups encrypted at rest
- Access logs maintained
- Retention policy enforced
- Off-site storage secured

### Audit Trail

All backup/restore operations logged:
- Timestamp
- User
- Operation
- Result
- Duration

---

## Contacts

### Backup Issues
- **Primary**: DevOps Team (devops@chanuka.go.ke)
- **Secondary**: Database Admin (dba@chanuka.go.ke)
- **Emergency**: On-call Engineer (oncall@chanuka.go.ke)

### Escalation
1. DevOps Team (0-30 min)
2. Database Admin (30-60 min)
3. CTO (60+ min)

---

## Appendix

### Backup File Structure

```
backups/
├── chanuka_backup_20260306_020000.sql.gz.enc
├── chanuka_backup_20260306_020000.sql.gz.enc.sha256
├── chanuka_backup_20260306_020000.meta
├── chanuka_backup_20260306_020000.log
└── ...
```

### Metadata File Format

```json
{
  "timestamp": "20260306_020000",
  "database_url": "postgresql://user@***",
  "backup_file": "chanuka_backup_20260306_020000.sql.gz.enc",
  "backup_size": "1.2G",
  "compressed": true,
  "encrypted": true,
  "checksum_file": "chanuka_backup_20260306_020000.sql.gz.enc.sha256"
}
```

---

**Last Updated**: March 6, 2026  
**Next Review**: June 6, 2026  
**Owner**: DevOps Team
