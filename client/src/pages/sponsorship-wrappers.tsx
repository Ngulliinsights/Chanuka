import { useParams } from 'react-router-dom';
import SponsorshipOverview from './sponsorship/overview';
import PrimarySponsor from './sponsorship/primary-sponsor';
import CoSponsors from './sponsorship/co-sponsors';
import FinancialNetwork from './sponsorship/financial-network';
import Methodology from './sponsorship/methodology';
import { logger } from '../utils/browser-logger';

// Wrapper components that extract billId from URL params and pass to the actual components

export function SponsorshipOverviewWrapper() {
  const { id: billId } = useParams<{ id: string }>();
  return <SponsorshipOverview billId={billId} />;
}

export function PrimarySponsorWrapper() {
  const { id: billId } = useParams<{ id: string }>();
  return <PrimarySponsor billId={billId} />;
}

export function CoSponsorsWrapper() {
  const { id: billId } = useParams<{ id: string }>();
  return <CoSponsors billId={billId} />;
}

export function FinancialNetworkWrapper() {
  const { id: billId } = useParams<{ id: string }>();
  return <FinancialNetwork billId={billId} />;
}

export function MethodologyWrapper() {
  const { id: billId } = useParams<{ id: string }>();
  return <Methodology billId={billId} />;
}