// ============================================================================
// DOMAIN EXPORTS - Parliamentary Process Schema
// ============================================================================
// Granular import path to avoid loading entire schema
// Usage: import { bill_amendments, parliamentary_votes } from '@shared/schema/domains/parliamentary-process'

export {
  bill_committee_assignments,
  bill_amendments,
  bill_versions,
  bill_readings,
  parliamentary_votes,
  bill_cosponsors,
  public_participation_events,
  public_submissions,
  public_hearings,
  billCommitteeAssignmentsRelations,
  billAmendmentsRelations,
  billVersionsRelations,
  billReadingsRelations,
  parliamentaryVotesRelations,
  billCosponsorsRelations,
  publicParticipationEventsRelations,
  publicSubmissionsRelations,
  publicHearingsRelations
} from "./parliamentary_process";
