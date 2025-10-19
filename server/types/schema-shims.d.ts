declare module '@shared/schema' {
  export * from '@shared/schema';
}

declare module '@shared/schema' {
  // Minimal schema shims: export commonly used tables/types as any
  export const bills: any;
  export const users: any;
  export const billComments: any;
  export const userProfiles: any;
  export const billEngagement: any;
  export const notifications: any;
  export const analysis: any;
  export const sponsors: any;
  export const sponsorAffiliations: any;
  export const billSponsorships: any;
  export const sponsorTransparency: any;
  export const billSectionConflicts: any;
  export const userInterests: any;

  // Common types
  export type Bill = any;
  export type InsertBill = any;
  export type User = any;
  export type InsertUser = any;
  export type Sponsor = any;
  export type InsertSponsor = any;
  export type BillComment = any;
  export type InsertBillComment = any;
  export type UserProfile = any;
  export type InsertUserProfile = any;
  export type Analysis = any;
  export type InsertAnalysis = any;
}

// Allow importing .js files with named exports
declare module '*.js' {
  const m: any;
  export = m;
}





































