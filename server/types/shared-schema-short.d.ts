// Focused, permissive shim for '@shared/schema' used during migration.
// This lists the most commonly imported names as `any` so TypeScript import
// sites compile while we iteratively stabilize real types.

declare module '@shared/schema' {
  // Tables
  export const bills: any;
  export const billTags: any;
  export const billSponsorships: any;
  export const billEngagement: any;
  export const billComments: any;
  export const sponsors: any;
  export const sponsorAffiliations: any;
  export const sponsorTransparency: any;
  export const users: any;
  export const userProfiles: any;
  export const userInterests: any;
  export const notifications: any;
  export const analysis: any;
  export const syncJobs: any;
  export const syncErrors: any;

  // Common types
  export type Bill = any;
  export type Sponsor = any;
  export type User = any;
  export type Placeholder = any;

  // Re-export default as any
  const _default: any;
  export default _default;
}

declare module '@shared/schema' {
  export * from '@shared/schema';
  const _default: any;
  export default _default;
}





































