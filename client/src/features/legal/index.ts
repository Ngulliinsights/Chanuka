/**
 * Legal Feature Index
 * 
 * Exports all legal analysis components and hooks
 * Used by other features to access constitutional analysis functionality
 */

// Components
export { LegalAnalysisTab } from './ui/LegalAnalysisTab';
export { ConflictAlertCard, ConflictAlertGrid, ConflictSummary } from './ui/ConflictAlertCard';

// Hooks
export { useConstitutionalAnalysis } from './hooks/useConstitutionalAnalysis';
export { useConflicts } from './hooks/useConflicts';
export { useLegalRisks } from './hooks/useLegalRisks';
export { usePrecedents } from './hooks/usePrecedents';

// Types
export type { ConstitutionalConflict } from './hooks/useConflicts';
export type { LegalRisk } from './hooks/useLegalRisks';
export type { LegalPrecedent } from './hooks/usePrecedents';
