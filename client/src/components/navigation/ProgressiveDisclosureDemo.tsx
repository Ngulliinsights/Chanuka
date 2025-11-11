import { ProgressiveDisclosureNavigation } from './ProgressiveDisclosureNavigation';
import type { NavigationSection, ReadingPath } from '../../hooks/useProgressiveDisclosure';

// Demo component to test Progressive Disclosure Navigation
export const ProgressiveDisclosureDemo = () => {
  const demoSections: NavigationSection[] = [
    {
      id: 'overview',
      title: 'Overview',
      complexity: 1,
      estimatedReadTime: 3,
      isRequired: true,
      content: <div>Overview content</div>
    },
    {
      id: 'details',
      title: 'Details',
      complexity: 2,
      estimatedReadTime: 5,
      content: <div>Details content</div>
    }
  ];

  const demoPaths: ReadingPath[] = [
    {
      id: 'quick',
      title: 'Quick Read',
      description: 'Essential information only',
      sections: ['overview'],
      estimatedTotalTime: 3
    }
  ];

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Progressive Disclosure Navigation Demo</h2>
      <ProgressiveDisclosureNavigation
        sections={demoSections}
        readingPaths={demoPaths}
        currentSectionId="overview"
        onSectionChange={(id) => console.log('Section changed:', id)}
      />
    </div>
  );
};

export default ProgressiveDisclosureDemo;