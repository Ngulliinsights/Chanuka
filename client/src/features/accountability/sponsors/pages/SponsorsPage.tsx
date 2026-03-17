/**
 * SponsorsPage Component
 * Main page for sponsors listing and management
 */

import { useNavigate } from 'react-router-dom';

import { SponsorList } from '../ui/SponsorList';
import type { Sponsor } from '../types';

// ============================================================================
// Component
// ============================================================================

export function SponsorsPage() {
  const navigate = useNavigate();

  const handleSponsorSelect = (sponsor: Sponsor) => {
    navigate(`/sponsors/${sponsor.id}`);
  };

  const handleViewConflicts = (sponsor: Sponsor) => {
    navigate(`/sponsors/${sponsor.id}/conflicts`);
  };

  const handleCreateSponsor = () => {
    navigate('/sponsors/new');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <SponsorList
        onSponsorSelect={handleSponsorSelect}
        onViewConflicts={handleViewConflicts}
        onCreateSponsor={handleCreateSponsor}
        showConflictIndicators={true}
      />
    </div>
  );
}

export default SponsorsPage;