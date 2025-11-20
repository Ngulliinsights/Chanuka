/**
 * Property Validation Schemas
 * 
 * Validation patterns for property-related data in the real estate platform
 */

import { z } from 'zod';
import { logger } from '../../observability/logging';
import {
  coordinateSchema,
  addressSchema,
  moneySchema,
  urlSchema,
  fileUploadSchema,
  paginationSchema,
  uuidSchema
} from './common';

/**
 * Property type enumeration
 */
export const propertyTypeSchema = z.enum([
  'residential',
  'commercial',
  'industrial',
  'land',
  'mixed_use',
  'agricultural',
  'special_purpose'
]);

/**
 * Property status enumeration
 */
export const propertyStatusSchema = z.enum([
  'active',
  'pending',
  'sold',
  'rented',
  'off_market',
  'under_construction',
  'planned'
]);

/**
 * Listing type enumeration
 */
export const listingTypeSchema = z.enum([
  'sale',
  'rent',
  'lease',
  'auction',
  'pre_sale'
]);

/**
 * Property condition enumeration
 */
export const propertyConditionSchema = z.enum([
  'excellent',
  'good',
  'fair',
  'poor',
  'needs_renovation',
  'new_construction'
]);

/**
 * Basic property information schema
 */
export const propertyBasicSchema = z.object({
  title: z.string().min(1, 'Property title is required').max(200, 'Title is too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description is too long'),
  propertyType: propertyTypeSchema,
  listingType: listingTypeSchema,
  status: propertyStatusSchema.default('active'),
  condition: propertyConditionSchema.optional(),
});

/**
 * Property location schema
 */
export const propertyLocationSchema = z.object({
  address: addressSchema,
  coordinates: coordinateSchema.optional(),
  neighborhood: z.string().max(100, 'Neighborhood name is too long').optional(),
  district: z.string().max(100, 'District name is too long').optional(),
  region: z.string().max(100, 'Region name is too long').optional(),
  nearbyLandmarks: z.array(z.string().max(100)).max(10, 'Too many landmarks').optional(),
  publicTransport: z.array(z.object({
    type: z.enum(['bus', 'train', 'metro', 'tram', 'ferry']),
    name: z.string().max(100),
    distance: z.number().min(0).max(50000), // Distance in meters
  })).optional(),
});

/**
 * Property dimensions and features schema
 */
export const propertyFeaturesSchema = z.object({
  totalArea: z.number().min(1, 'Total area must be positive').max(1000000, 'Area is too large'),
  builtArea: z.number().min(0).max(1000000, 'Built area is too large').optional(),
  lotSize: z.number().min(0).max(1000000, 'Lot size is too large').optional(),
  bedrooms: z.number().int().min(0).max(50, 'Too many bedrooms').optional(),
  bathrooms: z.number().min(0).max(50, 'Too many bathrooms').optional(),
  floors: z.number().int().min(1).max(200, 'Too many floors').optional(),
  parkingSpaces: z.number().int().min(0).max(100, 'Too many parking spaces').optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 5, 'Invalid year built').optional(),
  amenities: z.array(z.string().max(50)).max(50, 'Too many amenities').optional(),
  features: z.array(z.string().max(50)).max(50, 'Too many features').optional(),
});

/**
 * Property pricing schema
 */
export const propertyPricingSchema = z.object({
  price: moneySchema,
  pricePerUnit: moneySchema.optional(), // Price per sqm/sqft
  monthlyRent: moneySchema.optional(),
  securityDeposit: moneySchema.optional(),
  maintenanceFee: moneySchema.optional(),
  propertyTax: moneySchema.optional(),
  hoaFees: moneySchema.optional(),
  utilities: z.object({
    electricity: moneySchema.optional(),
    water: moneySchema.optional(),
    gas: moneySchema.optional(),
    internet: moneySchema.optional(),
    cable: moneySchema.optional(),
  }).optional(),
  priceHistory: z.array(z.object({
    price: moneySchema,
    date: z.coerce.date(),
    reason: z.string().max(200).optional(),
  })).optional(),
});

/**
 * Property media schema
 */
export const propertyMediaSchema = z.object({
  images: z.array(z.object({
    url: urlSchema,
    caption: z.string().max(200).optional(),
    isPrimary: z.boolean().default(false),
    order: z.number().int().min(0).optional(),
  })).min(1, 'At least one image is required').max(50, 'Too many images'),
  videos: z.array(z.object({
    url: urlSchema,
    title: z.string().max(100).optional(),
    duration: z.number().min(0).optional(), // Duration in seconds
    thumbnail: urlSchema.optional(),
  })).max(10, 'Too many videos').optional(),
  virtualTour: urlSchema.optional(),
  floorPlan: urlSchema.optional(),
  documents: z.array(z.object({
    name: z.string().max(100),
    url: urlSchema,
    type: z.enum(['deed', 'survey', 'inspection', 'appraisal', 'other']),
  })).max(20, 'Too many documents').optional(),
});

/**
 * Property ownership and legal schema
 */
export const propertyLegalSchema = z.object({
  ownerId: uuidSchema,
  ownershipType: z.enum(['individual', 'joint', 'corporate', 'trust', 'government']),
  titleNumber: z.string().max(50).optional(),
  deedType: z.enum(['warranty', 'quitclaim', 'special_warranty', 'other']).optional(),
  zoning: z.string().max(50).optional(),
  landUse: z.string().max(100).optional(),
  restrictions: z.array(z.string().max(200)).optional(),
  easements: z.array(z.string().max(200)).optional(),
  liens: z.array(z.object({
    type: z.string().max(50),
    amount: moneySchema,
    holder: z.string().max(100),
    date: z.coerce.date(),
  })).optional(),
});

/**
 * Property verification schema
 */
export const propertyVerificationSchema = z.object({
  is_verified: z.boolean().default(false),
  verificationDate: z.coerce.date().optional(),
  verified_by: uuidSchema.optional(),
  verificationDocuments: z.array(z.string()).optional(),
  inspectionDate: z.coerce.date().optional(),
  inspectionReport: urlSchema.optional(),
  appraisalValue: moneySchema.optional(),
  appraisalDate: z.coerce.date().optional(),
});

/**
 * Complete property schema
 */
export const propertySchema = propertyBasicSchema
  .merge(propertyLocationSchema)
  .merge(propertyFeaturesSchema)
  .merge(propertyPricingSchema)
  .merge(propertyMediaSchema)
  .merge(propertyLegalSchema)
  .merge(propertyVerificationSchema)
  .extend({
    id: uuidSchema.optional(),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
    listingAgent: uuidSchema.optional(),
    listingDate: z.coerce.date().optional(),
    expirationDate: z.coerce.date().optional(),
    view_count: z.number().int().min(0).default(0),
    favoriteCount: z.number().int().min(0).default(0),
    tags: z.array(z.string().max(30)).max(20, 'Too many tags').optional(),
  });

/**
 * Property search/filter schema
 */
export const propertySearchSchema = z.object({
  query: z.string().max(200).optional(),
  propertyType: z.array(propertyTypeSchema).optional(),
  listingType: z.array(listingTypeSchema).optional(),
  status: z.array(propertyStatusSchema).optional(),
  priceRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
  areaRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
  bedrooms: z.object({
    min: z.number().int().min(0).optional(),
    max: z.number().int().min(0).optional(),
  }).optional(),
  bathrooms: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
  location: z.object({
    center: coordinateSchema.optional(),
    radius: z.number().min(0).max(100000).optional(), // Radius in meters
    bounds: z.object({
      northeast: coordinateSchema,
      southwest: coordinateSchema,
    }).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(3).optional(),
  }).optional(),
  amenities: z.array(z.string().max(50)).optional(),
  features: z.array(z.string().max(50)).optional(),
  yearBuiltRange: z.object({
    min: z.number().int().min(1800).optional(),
    max: z.number().int().max(new Date().getFullYear() + 5).optional(),
  }).optional(),
  sortBy: z.enum(['price', 'area', 'date', 'relevance', 'distance']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
  offset: z.coerce.number().int().min(0, 'Offset must be non-negative').optional(),
}).transform((data) => ({
  ...data,
  offset: data.offset ?? (data.page - 1) * data.limit,
}));

/**
 * Property inquiry schema
 */
export const propertyInquirySchema = z.object({
  propertyId: uuidSchema,
  inquirerName: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  inquirerEmail: z.string().email('Invalid email format'),
  inquirerPhone: z.string().max(20).optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message is too long'),
  inquiryType: z.enum(['viewing', 'information', 'offer', 'general']),
  preferredContactMethod: z.enum(['email', 'phone', 'both']).default('email'),
  preferredContactTime: z.enum(['morning', 'afternoon', 'evening', 'anytime']).default('anytime'),
});

/**
 * Property viewing appointment schema
 */
export const propertyViewingSchema = z.object({
  propertyId: uuidSchema,
  viewerName: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  viewerEmail: z.string().email('Invalid email format'),
  viewerPhone: z.string().max(20).optional(),
  requestedDate: z.coerce.date().refine(
    (date) => date > new Date(),
    { message: 'Viewing date must be in the future' }
  ),
  requestedTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  duration: z.number().int().min(15).max(180).default(30), // Duration in minutes
  notes: z.string().max(500).optional(),
  groupSize: z.number().int().min(1).max(10).default(1),
});

/**
 * Property offer schema
 */
export const propertyOfferSchema = z.object({
  propertyId: uuidSchema,
  buyerId: uuidSchema,
  offerAmount: moneySchema,
  earnestMoney: moneySchema.optional(),
  financingType: z.enum(['cash', 'conventional', 'fha', 'va', 'usda', 'other']),
  downPayment: moneySchema.optional(),
  loanAmount: moneySchema.optional(),
  closingDate: z.coerce.date().refine(
    (date) => date > new Date(),
    { message: 'Closing date must be in the future' }
  ),
  contingencies: z.array(z.enum(['inspection', 'financing', 'appraisal', 'sale_of_home'])).optional(),
  expirationDate: z.coerce.date().refine(
    (date) => date > new Date(),
    { message: 'Offer expiration must be in the future' }
  ),
  additionalTerms: z.string().max(1000).optional(),
  status: z.enum(['pending', 'accepted', 'rejected', 'countered', 'expired']).default('pending'),
});

/**
 * Property comparison schema
 */
export const propertyComparisonSchema = z.object({
  propertyIds: z.array(uuidSchema).min(2, 'At least 2 properties required').max(5, 'Maximum 5 properties allowed'),
  criteria: z.array(z.enum([
    'price',
    'area',
    'bedrooms',
    'bathrooms',
    'location',
    'amenities',
    'condition',
    'year_built'
  ])).optional(),
});

/**
 * Property valuation request schema
 */
export const propertyValuationSchema = z.object({
  propertyId: uuidSchema.optional(),
  address: addressSchema,
  propertyType: propertyTypeSchema,
  totalArea: z.number().min(1, 'Total area is required'),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  condition: propertyConditionSchema.optional(),
  recentRenovations: z.array(z.string().max(100)).optional(),
  requestorName: z.string().min(1, 'Name is required').max(100),
  requestorEmail: z.string().email('Invalid email format'),
  requestorPhone: z.string().max(20).optional(),
  purpose: z.enum(['sale', 'purchase', 'refinance', 'insurance', 'tax_assessment']),
});

/**
 * Property report schema
 */
export const propertyReportSchema = z.object({
  propertyId: uuidSchema,
  reportType: z.enum(['inspection', 'appraisal', 'environmental', 'survey', 'title']),
  report_date: z.coerce.date(),
  inspector: z.string().max(100),
  inspectorLicense: z.string().max(50).optional(),
  findings: z.array(z.object({
    category: z.string().max(50),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string().max(500),
    recommendation: z.string().max(500).optional(),
    estimatedCost: moneySchema.optional(),
  })),
  overallRating: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  reportDocument: urlSchema.optional(),
});

/**
 * Property schemas collection
 */
export const propertySchemas = {
  propertyBasic: propertyBasicSchema,
  propertyLocation: propertyLocationSchema,
  propertyFeatures: propertyFeaturesSchema,
  propertyPricing: propertyPricingSchema,
  propertyMedia: propertyMediaSchema,
  propertyLegal: propertyLegalSchema,
  propertyVerification: propertyVerificationSchema,
  property: propertySchema,
  propertySearch: propertySearchSchema,
  propertyInquiry: propertyInquirySchema,
  propertyViewing: propertyViewingSchema,
  propertyOffer: propertyOfferSchema,
  propertyComparison: propertyComparisonSchema,
  propertyValuation: propertyValuationSchema,
  propertyReport: propertyReportSchema,
} as const;














































