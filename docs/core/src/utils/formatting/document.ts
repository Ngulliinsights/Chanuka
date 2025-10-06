/**
 * Document Formatting Utilities
 */

export type DocumentType = 'deed' | 'title' | 'certificate' | 'contract' | 'other';

export function formatDocumentType(type: string): string {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

export function formatProcessingStep(step: string): string {
  const steps: Record<string, string> = {
    upload: 'Document Upload',
    validation: 'Validation',
    verification: 'Verification',
    review: 'Expert Review',
    approval: 'Final Approval'
  };
  return steps[step.toLowerCase()] || formatDocumentType(step);
}

export function getDocumentIcon(type: DocumentType): string {
  const icons: Record<DocumentType, string> = {
    deed: '📄',
    title: '📑',
    certificate: '📋',
    contract: '📝',
    other: '📎'
  };
  return icons[type] || icons.other;
}
