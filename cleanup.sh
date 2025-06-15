#!/bin/bash

# Paltalk Server Cleanup Script
# Removes obsolete test files, debug files, and temporary files

echo "🧹 Starting Paltalk Server cleanup..."

# Create cleanup directory for backup
mkdir -p cleanup_backup_$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="cleanup_backup_$(date +%Y%m%d_%H%M%S)"

echo "📦 Backup directory created: $BACKUP_DIR"

# Function to safely remove file with backup
safe_remove() {
    local file="$1"
    if [ -f "$file" ]; then
        echo "🗑️  Removing: $file"
        mv "$file" "$BACKUP_DIR/"
    fi
}

# Remove obsolete test files (keeping only essential ones)
echo "🔍 Removing obsolete test files..."
safe_remove "test_fixed_parsing.js"
safe_remove "test_simple_broadcasting.js"
safe_remove "test_message_format_fix.js"
safe_remove "test_unrequest_simple.js"
safe_remove "test_unreq_focused.js"
safe_remove "test_mic_request_unrequest.js"
safe_remove "test_offline_scenario.js"
safe_remove "test_simple_connection.js"
safe_remove "test_user_list_on_join.js"
safe_remove "test_real_time_broadcasting.js"
safe_remove "test-voice.js"
safe_remove "test-voice-real.js"

# Remove debug files (development only)
echo "🐛 Removing debug files..."
safe_remove "debug_simple_parsing.js"
safe_remove "debug_user_list_parsing.js"
safe_remove "debug_login.js"
safe_remove "debug_admin.js"

# Remove old migration scripts (keep only comprehensive)
echo "📦 Removing old migration scripts..."
safe_remove "migrate.js"
safe_remove "migrate_balanced.js"
safe_remove "migrate_comprehensive.js.backup"

# Remove temporary sync scripts
echo "🔄 Removing temporary sync scripts..."
safe_remove "sync_migration_script.js"
safe_remove "sync_migration.py"
safe_remove "unlock_rooms.js"
safe_remove "unlock_rooms.py"

# Remove old database backups (keep the most recent one)
echo "💾 Cleaning up old database backups..."
safe_remove "database_backup_comprehensive_1750002810934.db"
# Keep: database_backup_comprehensive_1750004252856.db (most recent)
# Keep: database_backup_before_expansion.db (baseline)

# Remove other temporary files
echo "🧼 Removing other temporary files..."
safe_remove "output.js"
safe_remove "compare_user_list_formats.js"
safe_remove "add_new_rooms.js"
safe_remove "final_verification_test.js"
safe_remove "voice-test-report.js"

# Remove old log files
echo "📋 Cleaning up logs..."
if [ -f "error.log" ]; then
    # Keep recent logs, remove if larger than 10MB
    if [ $(stat -f%z "error.log" 2>/dev/null || stat -c%s "error.log" 2>/dev/null || echo 0) -gt 10485760 ]; then
        safe_remove "error.log"
        echo "ℹ️  Large error.log file removed"
    fi
fi

# Keep these essential files:
echo "✅ Keeping essential files:"
echo "   • server.js (main server)"
echo "   • migrate_comprehensive.js (latest migration)"
echo "   • test.js (main test file)"
echo "   • test_final_verification.js (verification tests)"
echo "   • test_paltalk_online.js (online tests)"
echo "   • test_mic_*.js (microphone tests)"
echo "   • test_room_*.js (room functionality tests)"
echo "   • test_offline_messages.js (messaging tests)"
echo "   • test_multi_user_messaging.js (multi-user tests)"
echo "   • database.db (production database)"
echo "   • All documentation (.md files)"
echo "   • All source code (src/ directory)"

# Summary
REMOVED_COUNT=$(ls -1 "$BACKUP_DIR" 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "🎉 Cleanup completed!"
echo "📊 Summary:"
echo "   • Files moved to backup: $REMOVED_COUNT"
echo "   • Backup location: $BACKUP_DIR"
echo "   • Production files preserved"
echo ""
echo "💡 Tip: You can safely delete the backup directory after confirming everything works"
echo "      rm -rf $BACKUP_DIR"
