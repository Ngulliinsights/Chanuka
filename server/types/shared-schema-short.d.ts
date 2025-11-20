// Focused, permissive shim for '@shared/schema' used during migration.
// This lists the most commonly imported names as `any` so TypeScript import
// sites compile while we iteratively stabilize real types.

declare module '@shared/schema' {
  // Tables
  export const bills: any;
  export const bill_tags: any;
  export const bill_sponsorships: any;
  export const bill_engagement: any;
  export const comments: any;
  export const sponsors: any;
  export const sponsorAffiliations: any;
  export const sponsorTransparency: any;
  export const users: any;
  export const user_profiles: any;
  export const user_interests: any;
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







































