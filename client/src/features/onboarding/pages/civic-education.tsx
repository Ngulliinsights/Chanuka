import { CivicEducationHub } from '@client/lib/ui/civic';

/**
 * Civic Education Landing Page
 * 
 * Main entry point for civic education content
 * Uses the CivicEducationHub component
 */
export default function CivicEducationPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-12">
        <CivicEducationHub />
      </div>
    </div>
  );
}
