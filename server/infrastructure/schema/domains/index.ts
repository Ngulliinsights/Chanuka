// ============================================================================
// DOMAIN SCHEMA EXPORTS INDEX
// ============================================================================
// Granular/lazy import paths to avoid monolithic compilation
// Reduces build time, memory usage, and decouples domain consumption
//
// USAGE PATTERNS:
// ❌ OLD (Monolithic): import { users, bills, comments } from '@/shared/schema'
// ✅ NEW (Granular): import { users, bills } from '@/shared/schema/domains/foundation'
//                    import { comments } from '@/shared/schema/domains/citizen-participation'
//
// BENEFITS:
// - Faster builds: Only import what you need
// - Reduced memory: No full schema compilation
// - Clearer dependencies: See exactly what a module needs
// - Tree-shaking friendly: Bundlers can optimize better

export * from "./foundation";
export * from "./citizen-participation";
export * from "./parliamentary-process";
export * from "./constitutional-intelligence";
export * from "./integrity-operations";
export * from "./safeguards";
// Add more domain imports as granular files are created

// ============================================================================
// FULL SCHEMA FALLBACK
// ============================================================================
// If you really need everything, import from main index:
// import * as schema from '@/shared/schema'
//
// But prefer granular imports for better performance!
