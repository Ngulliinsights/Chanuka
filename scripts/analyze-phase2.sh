#!/usr/bin/env bash
# Phase 2 Test Migration - Simple Analysis Script
# Finds all test files and provides a migration report

echo "=========================================="
echo "Phase 2: Test Location Analysis"
echo "=========================================="
echo ""

WORKSPACE_ROOT="/c/Users/Access Granted/Downloads/projects/SimpleTool"

# Count test files by type
echo "📊 TEST FILE STATISTICS"
echo "=========================================="

# Find all test files
echo "Total test files:"
find "$WORKSPACE_ROOT" \
  -path "*/node_modules" -prune -o \
  -path "*/.nx" -prune -o \
  -path "*/dist" -prune -o \
  -type f \( -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" \) \
  -print | wc -l

echo ""
echo "Unit tests (*.test.ts/tsx in src/components, src/features, etc):"
find "$WORKSPACE_ROOT/client/src" \
  -path "*/__tests__" -prune -o \
  -type f -name "*.test.tsx" -print | wc -l

echo ""
echo "Integration tests (in __tests__ directories):"
find "$WORKSPACE_ROOT" -path "*/node_modules" -prune -o \
  -path "*/.nx" -prune -o \
  -path "*/dist" -prune -o \
  -type d -name "__tests__" -print | wc -l

echo ""
echo "A11y tests (*.a11y.test.tsx):"
find "$WORKSPACE_ROOT" \
  -path "*/node_modules" -prune -o \
  -path "*/.nx" -prune -o \
  -path "*/dist" -prune -o \
  -type f -name "*.a11y.test.tsx" | wc -l

echo ""
echo "=========================================="
echo "📁 SAMPLE TEST STRUCTURE"
echo "=========================================="

echo ""
echo "Client tests (first 20 files):"
find "$WORKSPACE_ROOT/client/src" \
  -type f \( -name "*.test.tsx" -o -name "*.test.ts" \) \
  -not -path "*/__tests__/*" | head -20 | sed 's|.*SimpleTool/||'

echo ""
echo "Integration tests (first 20 directories):"
find "$WORKSPACE_ROOT" -path "*/node_modules" -prune -o \
  -path "*/.nx" -prune -o \
  -path "*/dist" -prune -o \
  -type d -name "__tests__" -print | head -20 | sed 's|.*SimpleTool/||'

echo ""
echo "=========================================="
echo "Migration Plan Created!"
echo "=========================================="
