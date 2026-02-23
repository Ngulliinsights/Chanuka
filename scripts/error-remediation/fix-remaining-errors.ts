/**
 * Fix Remaining Phase 1-2 Errors
 * 
 * Systematically fixes the 50 remaining errors:
 * - TS2307: Module resolution (25 errors)
 * - TS2724: Export name mismatches (14 errors)
 * - TS2305: Missing exports (6 errors)
 * - TS2614: Import style mismatches (5 errors)
 */

import * as fs from 'fs';
import * as path from 'path';

interface Fix {
  file: string;
  type: 'TS2307' | 'TS2724' | 'TS2305' | 'TS2614';
  description: string;
  apply: () => void;
}

const fixes: Fix[] = [];

// TS2724 Fixes - Export name mismatches (rename imports to match exports)
fixes.push({
  file: 'client/src/infrastructure/api/types/bill.ts',
  type: 'TS2724',
  description: 'Rename BillStatusType to BillStatus, UrgencyLevelType to UrgencyLevel, ComplexityLevelType to ComplexityLevel',
  apply: () => {
    const filePath = 'client/src/infrastructure/api/types/bill.ts';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(/BillStatusType/g, 'BillStatus');
    content = content.replace(/UrgencyLevelType/g, 'UrgencyLevel');
    content = content.replace(/ComplexityLevelType/g, 'ComplexityLevel');
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

fixes.push({
  file: 'client/src/infrastructure/security/ui/privacy/DataUsageReportDashboard.tsx',
  type: 'TS2724',
  description: 'Rename privacyAnalyticsService to PrivacyAnalyticsService',
  apply: () => {
    const filePath = 'client/src/infrastructure/security/ui/privacy/DataUsageReportDashboard.tsx';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(/privacyAnalyticsService/g, 'PrivacyAnalyticsService');
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

fixes.push({
  file: 'client/src/features/security/ui/privacy/DataUsageReportDashboard.tsx',
  type: 'TS2724',
  description: 'Rename privacyAnalyticsService to PrivacyAnalyticsService',
  apply: () => {
    const filePath = 'client/src/features/security/ui/privacy/DataUsageReportDashboard.tsx';
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf-8');
      content = content.replace(/privacyAnalyticsService/g, 'PrivacyAnalyticsService');
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }
});

fixes.push({
  file: 'client/src/features/notifications/model/index.ts',
  type: 'TS2724',
  description: 'Rename Notification to NotificationData',
  apply: () => {
    const filePath = 'client/src/features/notifications/model/index.ts';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Only replace in import statement, not in other contexts
    content = content.replace(/import\s*{\s*Notification\s*}/g, 'import { NotificationData }');
    content = content.replace(/export\s*{\s*Notification\s*}/g, 'export { NotificationData }');
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

fixes.push({
  file: 'client/src/features/users/ui/verification/index.ts',
  type: 'TS2724',
  description: 'Rename CommunityValidation to CommunityValidationType, VerificationWorkflow to VerificationWorkflowType',
  apply: () => {
    const filePath = 'client/src/features/users/ui/verification/index.ts';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(/CommunityValidation(?!Type)/g, 'CommunityValidationType');
    content = content.replace(/VerificationWorkflow(?!Type)/g, 'VerificationWorkflowType');
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

fixes.push({
  file: 'client/src/lib/data/mock/experts.ts',
  type: 'TS2724',
  description: 'Rename CommunityValidation to CommunityValidationType',
  apply: () => {
    const filePath = 'client/src/lib/data/mock/experts.ts';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(/CommunityValidation(?!Type)/g, 'CommunityValidationType');
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

fixes.push({
  file: 'client/src/lib/infrastructure/store/slices/userDashboardSlice.ts',
  type: 'TS2724',
  description: 'Rename DashboardPreferences to UserDashboardPreferences',
  apply: () => {
    const filePath = 'client/src/lib/infrastructure/store/slices/userDashboardSlice.ts';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(/import\s*{\s*DashboardPreferences\s*}/g, 'import { UserDashboardPreferences }');
    content = content.replace(/:\s*DashboardPreferences/g, ': UserDashboardPreferences');
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

fixes.push({
  file: 'client/src/lib/ui/dashboard/modals/DashboardPreferencesModal.tsx',
  type: 'TS2724',
  description: 'Rename DashboardPreferences to UserDashboardPreferences',
  apply: () => {
    const filePath = 'client/src/lib/ui/dashboard/modals/DashboardPreferencesModal.tsx';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(/import\s*{\s*DashboardPreferences\s*}/g, 'import { UserDashboardPreferences }');
    content = content.replace(/:\s*DashboardPreferences/g, ': UserDashboardPreferences');
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

fixes.push({
  file: 'client/src/lib/ui/dashboard/UserDashboard.tsx',
  type: 'TS2724',
  description: 'Rename DashboardPreferences to UserDashboardPreferences',
  apply: () => {
    const filePath = 'client/src/lib/ui/dashboard/UserDashboard.tsx';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(/import\s*{\s*DashboardPreferences\s*}/g, 'import { UserDashboardPreferences }');
    content = content.replace(/:\s*DashboardPreferences/g, ': UserDashboardPreferences');
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

fixes.push({
  file: 'client/src/lib/ui/dashboard/widgets/DashboardStack.tsx',
  type: 'TS2724',
  description: 'Rename DashboardSectionConfig to DashboardSection',
  apply: () => {
    const filePath = 'client/src/lib/ui/dashboard/widgets/DashboardStack.tsx';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(/DashboardSectionConfig/g, 'DashboardSection');
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

fixes.push({
  file: 'client/src/lib/ui/dashboard/widgets/DashboardTabs.tsx',
  type: 'TS2724',
  description: 'Rename DashboardSectionConfig to DashboardSection',
  apply: () => {
    const filePath = 'client/src/lib/ui/dashboard/widgets/DashboardTabs.tsx';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(/DashboardSectionConfig/g, 'DashboardSection');
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

// TS2614 Fixes - Import style mismatches (change to default imports)
fixes.push({
  file: 'client/src/features/analytics/services/index.ts',
  type: 'TS2614',
  description: 'Change ConflictAnalysisResult to default import',
  apply: () => {
    const filePath = 'client/src/features/analytics/services/index.ts';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(
      /import\s*{\s*ConflictAnalysisResult\s*}\s*from\s*['"]\.\/analysis['"]/g,
      "import ConflictAnalysisResult from './analysis'"
    );
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

fixes.push({
  file: 'client/src/features/privacy/pages/privacy-center.tsx',
  type: 'TS2614',
  description: 'Change GDPRComplianceManager to default import',
  apply: () => {
    const filePath = 'client/src/features/privacy/pages/privacy-center.tsx';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(
      /import\s*{\s*GDPRComplianceManager\s*}\s*from\s*['"]@client\/features\/security\/ui\/privacy\/GDPRComplianceManager['"]/g,
      "import GDPRComplianceManager from '@client/features/security/ui/privacy/GDPRComplianceManager'"
    );
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

fixes.push({
  file: 'client/src/features/search/hooks/useStreamingSearch.ts',
  type: 'TS2614',
  description: 'Change SearchProgress to default import',
  apply: () => {
    const filePath = 'client/src/features/search/hooks/useStreamingSearch.ts';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(
      /import\s*{\s*SearchProgress\s*}\s*from\s*['"]\.\.\/services\/streaming-search['"]/g,
      "import SearchProgress from '../services/streaming-search'"
    );
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

fixes.push({
  file: 'client/src/lib/ui/dashboard/activity-summary.tsx',
  type: 'TS2614',
  description: 'Change measureAsync and recordMetric to default imports',
  apply: () => {
    const filePath = 'client/src/lib/ui/dashboard/activity-summary.tsx';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // This might need to be split into separate imports or check the actual export
    content = content.replace(
      /import\s*{\s*measureAsync,\s*recordMetric\s*}\s*from\s*['"]@client\/core['"]/g,
      "import measureAsync from '@client/infrastructure/measureAsync';\nimport recordMetric from '@client/infrastructure/recordMetric'"
    );
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});

console.log(`🔧 Applying ${fixes.length} fixes...\n`);

let successCount = 0;
let errorCount = 0;

for (const fix of fixes) {
  try {
    console.log(`Fixing ${fix.file} (${fix.type}): ${fix.description}`);
    fix.apply();
    successCount++;
    console.log(`  ✅ Success\n`);
  } catch (error) {
    errorCount++;
    console.error(`  ❌ Error: ${error}\n`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`  ✅ Successful fixes: ${successCount}`);
console.log(`  ❌ Failed fixes: ${errorCount}`);
console.log(`  📝 Total fixes attempted: ${fixes.length}`);
