#!/bin/bash

###############################################################################
# Database Restore Script
# 
# Restores PostgreSQL database from backup with:
# - Backup verification
# - Decryption
# - Decompression
# - Pre-restore validation
# - Post-restore verification
###############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_prompt() {
    echo -e "${BLUE}[PROMPT]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        log_error "psql not found. Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Check if gunzip is available
    if ! command -v gunzip &> /dev/null; then
        log_error "gunzip not found. Please install gzip."
        exit 1
    fi
    
    # Check if DATABASE_URL is set
    if [ -z "${DATABASE_URL:-}" ]; then
        log_error "DATABASE_URL not set. Please set it in .env file."
        exit 1
    fi
    
    log_info "Prerequisites check passed."
}

# List available backups
list_backups() {
    log_info "Available backups:"
    echo ""
    
    local backups=($(ls -t "$BACKUP_DIR"/chanuka_backup_*.sql.gz* 2>/dev/null || true))
    
    if [ ${#backups[@]} -eq 0 ]; then
        log_error "No backups found in $BACKUP_DIR"
        exit 1
    fi
    
    local index=1
    for backup in "${backups[@]}"; do
        local backup_name=$(basename "$backup")
        local backup_date=$(echo "$backup_name" | grep -oP '\d{8}_\d{6}')
        local backup_size=$(du -h "$backup" | cut -f1)
        local formatted_date=$(date -d "${backup_date:0:8} ${backup_date:9:2}:${backup_date:11:2}:${backup_date:13:2}" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$backup_date")
        
        echo "  [$index] $formatted_date - $backup_size - $backup_name"
        ((index++))
    done
    
    echo ""
}

# Select backup
select_backup() {
    list_backups
    
    local backups=($(ls -t "$BACKUP_DIR"/chanuka_backup_*.sql.gz* 2>/dev/null))
    
    log_prompt "Select backup number to restore (or 'q' to quit): "
    read -r selection
    
    if [ "$selection" = "q" ]; then
        log_info "Restore cancelled."
        exit 0
    fi
    
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backups[@]} ]; then
        log_error "Invalid selection."
        exit 1
    fi
    
    SELECTED_BACKUP="${backups[$((selection-1))]}"
    log_info "Selected backup: $(basename "$SELECTED_BACKUP")"
}

# Verify backup
verify_backup() {
    log_info "Verifying backup..."
    
    # Check if file exists
    if [ ! -f "$SELECTED_BACKUP" ]; then
        log_error "Backup file not found: $SELECTED_BACKUP"
        exit 1
    fi
    
    # Verify checksum if available
    if [ -f "${SELECTED_BACKUP}.sha256" ]; then
        log_info "Verifying checksum..."
        if sha256sum -c "${SELECTED_BACKUP}.sha256" &> /dev/null; then
            log_info "Checksum verification passed."
        else
            log_error "Checksum verification failed!"
            log_prompt "Continue anyway? (yes/no): "
            read -r continue_restore
            if [ "$continue_restore" != "yes" ]; then
                log_info "Restore cancelled."
                exit 1
            fi
        fi
    else
        log_warn "No checksum file found. Skipping verification."
    fi
    
    # Verify file is not empty
    if [ ! -s "$SELECTED_BACKUP" ]; then
        log_error "Backup file is empty!"
        exit 1
    fi
    
    log_info "Backup verification passed."
}

# Confirm restore
confirm_restore() {
    log_warn "=== WARNING ==="
    log_warn "This will REPLACE the current database with the backup."
    log_warn "All current data will be LOST."
    log_warn "Database: ${DATABASE_URL%%@*}@***"
    log_warn "Backup: $(basename "$SELECTED_BACKUP")"
    echo ""
    log_prompt "Are you sure you want to continue? Type 'yes' to proceed: "
    read -r confirmation
    
    if [ "$confirmation" != "yes" ]; then
        log_info "Restore cancelled."
        exit 0
    fi
}

# Create pre-restore backup
create_pre_restore_backup() {
    log_info "Creating pre-restore backup of current database..."
    
    local pre_restore_backup="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    if pg_dump "$DATABASE_URL" | gzip > "$pre_restore_backup"; then
        log_info "Pre-restore backup created: $pre_restore_backup"
    else
        log_warn "Failed to create pre-restore backup."
        log_prompt "Continue without pre-restore backup? (yes/no): "
        read -r continue_restore
        if [ "$continue_restore" != "yes" ]; then
            log_info "Restore cancelled."
            exit 1
        fi
    fi
}

# Prepare backup file
prepare_backup_file() {
    log_info "Preparing backup file..."
    
    local temp_file="$BACKUP_DIR/temp_restore_$(date +%Y%m%d_%H%M%S).sql"
    
    # Check if encrypted
    if [[ "$SELECTED_BACKUP" == *.enc ]]; then
        log_info "Decrypting backup..."
        
        if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
            log_error "BACKUP_ENCRYPTION_KEY not set. Cannot decrypt backup."
            exit 1
        fi
        
        if ! openssl enc -aes-256-cbc -d \
            -in "$SELECTED_BACKUP" \
            -out "${SELECTED_BACKUP%.enc}" \
            -pass "pass:$BACKUP_ENCRYPTION_KEY"; then
            log_error "Decryption failed."
            exit 1
        fi
        
        SELECTED_BACKUP="${SELECTED_BACKUP%.enc}"
        log_info "Backup decrypted."
    fi
    
    # Decompress
    log_info "Decompressing backup..."
    if gunzip -c "$SELECTED_BACKUP" > "$temp_file"; then
        log_info "Backup decompressed."
        RESTORE_FILE="$temp_file"
    else
        log_error "Decompression failed."
        exit 1
    fi
}

# Perform restore
perform_restore() {
    log_info "Starting database restore..."
    
    # Drop existing connections
    log_info "Dropping existing connections..."
    psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();" 2>/dev/null || true
    
    # Restore database
    log_info "Restoring database..."
    if psql "$DATABASE_URL" < "$RESTORE_FILE" 2>&1 | tee "$BACKUP_DIR/restore_$(date +%Y%m%d_%H%M%S).log"; then
        log_info "Database restore completed."
    else
        log_error "Database restore failed. Check log file."
        exit 1
    fi
    
    # Clean up temp file
    rm -f "$RESTORE_FILE"
}

# Verify restore
verify_restore() {
    log_info "Verifying restore..."
    
    # Check if database is accessible
    if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        log_info "Database is accessible."
    else
        log_error "Database is not accessible after restore!"
        exit 1
    fi
    
    # Count tables
    local table_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    log_info "Tables in database: $table_count"
    
    if [ "$table_count" -eq 0 ]; then
        log_warn "No tables found in database. Restore may have failed."
    fi
    
    log_info "Restore verification completed."
}

# Main execution
main() {
    log_info "=== Chanuka Database Restore ==="
    log_info "Started at: $(date)"
    
    check_prerequisites
    select_backup
    verify_backup
    confirm_restore
    create_pre_restore_backup
    prepare_backup_file
    perform_restore
    verify_restore
    
    log_info "=== Restore Completed Successfully ==="
    log_info "Finished at: $(date)"
    log_info "Please verify your application is working correctly."
}

# Run main function
main "$@"
