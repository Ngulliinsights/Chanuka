/**
 * Mock Data Generators
 *
 * Utility functions for generating realistic mock data with proper
 * relationships and realistic engagement metrics.
 */

import { faker } from '@faker-js/faker';

// Seed faker for consistent data across sessions
faker.seed(12345);

/**
 * Generate a random ID with optional prefix
 */
export const generateId = (prefix?: string): string => {
  const id = faker.string.uuid();
  return prefix ? `${prefix}_${id}` : id;
};

/**
 * Generate a random date within a range
 */
export const generateDateInRange = (startDays: number, endDays: number = 0): string => {
  const start = new Date();
  start.setDate(start.getDate() - startDays);

  const end = new Date();
  end.setDate(end.getDate() - endDays);

  return faker.date.between({ from: start, to: end }).toISOString();
};

/**
 * Generate realistic engagement metrics
 */
export const generateEngagementMetrics = (basePopularity: number = 1) => {
  const multiplier = Math.max(0.1, basePopularity);

  return {
    viewCount: Math.floor(faker.number.int({ min: 50, max: 5000 }) * multiplier),
    saveCount: Math.floor(faker.number.int({ min: 5, max: 500 }) * multiplier),
    commentCount: Math.floor(faker.number.int({ min: 0, max: 200 }) * multiplier),
    shareCount: Math.floor(faker.number.int({ min: 0, max: 100 }) * multiplier),
  };
};

/**
 * Generate realistic voting metrics
 */
export const generateVotingMetrics = () => {
  const upvotes = faker.number.int({ min: 0, max: 150 });
  const downvotes = faker.number.int({ min: 0, max: Math.floor(upvotes * 0.3) });

  return {
    upvotes,
    downvotes,
    userVote: faker.helpers.arrayElement(['up', 'down', null] as const),
  };
};

/**
 * Generate realistic quality scores
 */
export const generateQualityMetrics = () => {
  const qualityScore = faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 });

  return {
    qualityScore,
    isHighQuality: qualityScore > 0.7,
  };
};

/**
 * Generate trending metrics
 */
export const generateTrendingMetrics = () => {
  const velocity = faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 });
  const diversity = faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 });
  const substance = faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 });

  return {
    velocity,
    diversity,
    substance,
    trendingScore: velocity * 0.4 + diversity * 0.3 + substance * 0.3,
  };
};

/**
 * Generate geographic location data
 */
export const generateLocation = () => {
  const states = [
    'California',
    'Texas',
    'Florida',
    'New York',
    'Pennsylvania',
    'Illinois',
    'Ohio',
    'Georgia',
    'North Carolina',
    'Michigan',
    'New Jersey',
    'Virginia',
    'Washington',
    'Arizona',
    'Massachusetts',
  ];

  const state = faker.helpers.arrayElement(states);

  return {
    state,
    district: `${state} ${faker.number.int({ min: 1, max: 15 })}`,
    county: faker.location.county(),
  };
};

/**
 * Generate policy areas
 */
export const generatePolicyAreas = (count: number = 2): string[] => {
  const areas = [
    'Healthcare',
    'Education',
    'Environment',
    'Economy',
    'Transportation',
    'Housing',
    'Criminal Justice',
    'Immigration',
    'Technology',
    'Agriculture',
    'Energy',
    'Defense',
    'Social Services',
    'Civil Rights',
    'Infrastructure',
    'Tax Policy',
    'Labor',
    'Trade',
    'Foreign Policy',
    'Veterans Affairs',
  ];

  return faker.helpers.arrayElements(areas, count);
};

/**
 * Generate bill number in realistic format
 */
export const generateBillNumber = (): string => {
  const chamber = faker.helpers.arrayElement(['H.R.', 'S.']);
  const number = faker.number.int({ min: 1, max: 9999 });
  return `${chamber} ${number}`;
};

/**
 * Generate realistic bill title
 */
export const generateBillTitle = (): string => {
  const actions = [
    'To establish',
    'To amend',
    'To provide',
    'To authorize',
    'To improve',
    'To strengthen',
    'To enhance',
    'To create',
    'To reform',
    'To modernize',
  ];

  const subjects = [
    'healthcare access',
    'educational opportunities',
    'environmental protection',
    'economic development',
    'infrastructure investment',
    'public safety',
    'civil rights protections',
    'technology innovation',
    'energy efficiency',
    'social services',
    'veterans benefits',
    'housing affordability',
  ];

  const action = faker.helpers.arrayElement(actions);
  const subject = faker.helpers.arrayElement(subjects);

  return `${action} ${subject} and for other purposes.`;
};

/**
 * Generate realistic bill summary
 */
export const generateBillSummary = (): string => {
  const templates = [
    'This bill establishes new requirements for {subject} and provides funding for implementation. The legislation includes provisions for oversight, reporting, and evaluation of program effectiveness.',
    'The proposed legislation amends existing law to improve {subject} by expanding eligibility, increasing funding, and strengthening enforcement mechanisms.',
    'This comprehensive bill addresses {subject} through a multi-faceted approach including regulatory reforms, funding increases, and new accountability measures.',
    'The legislation creates a new framework for {subject} while maintaining existing protections and adding enhanced oversight provisions.',
  ];

  const subjects = [
    'healthcare delivery systems',
    'educational funding mechanisms',
    'environmental compliance',
    'economic development programs',
    'infrastructure maintenance',
    'public safety protocols',
    'civil rights enforcement',
    'technology standards',
    'energy conservation',
    'social service delivery',
    'veterans care programs',
    'housing assistance',
  ];

  const template = faker.helpers.arrayElement(templates);
  const subject = faker.helpers.arrayElement(subjects);

  return template.replace('{subject}', subject);
};

/**
 * Generate realistic comment content
 */
export const generateCommentContent = (isExpert: boolean = false): string => {
  if (isExpert) {
    const expertTemplates = [
      'Based on my analysis of similar legislation, this bill addresses key concerns in {area}. The proposed framework aligns with established best practices and includes necessary safeguards.',
      'From a policy perspective, this legislation represents a significant step forward in {area}. However, implementation will require careful coordination between federal and state agencies.',
      'The constitutional implications of this bill are generally sound, though Section {section} may face challenges under current precedent. I recommend reviewing the Commerce Clause analysis.',
      "This bill's approach to {area} is well-researched and evidence-based. The funding mechanisms are realistic and the timeline for implementation is achievable.",
    ];

    const template = faker.helpers.arrayElement(expertTemplates);
    const area = faker.helpers.arrayElement(generatePolicyAreas(1));
    const section = faker.number.int({ min: 1, max: 15 });

    return template.replace('{area}', area).replace('{section}', section.toString());
  } else {
    const citizenTemplates = [
      'This bill would have a significant impact on my community. I support the provisions for {benefit} but have concerns about the implementation timeline.',
      "As a resident of {location}, I've seen firsthand how important this issue is. This legislation addresses many of the problems we've been facing.",
      'I appreciate the bipartisan effort on this bill. The focus on {area} is exactly what we need right now.',
      'While I support the overall goals, I think the funding allocation could be improved. More resources should go to {priority}.',
    ];

    const template = faker.helpers.arrayElement(citizenTemplates);
    const benefit = faker.helpers.arrayElement([
      'increased funding',
      'improved access',
      'better oversight',
      'enhanced protections',
    ]);
    const location = faker.location.city();
    const area = faker.helpers.arrayElement(generatePolicyAreas(1));
    const priority = faker.helpers.arrayElement([
      'local communities',
      'underserved populations',
      'rural areas',
      'urban centers',
    ]);

    return template
      .replace('{benefit}', benefit)
      .replace('{location}', location)
      .replace('{area}', area)
      .replace('{priority}', priority);
  }
};

/**
 * Generate weighted random selection based on probabilities
 */
export const weightedRandom = <T>(items: T[], weights: number[]): T => {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = faker.number.float({ min: 0, max: totalWeight });

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
};

/**
 * Generate time-series data for analytics
 */
export const generateTimeSeriesData = (
  days: number,
  baseValue: number = 100,
  volatility: number = 0.2
): Array<{ date: string; value: number }> => {
  const data = [];
  let currentValue = baseValue;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Add some realistic variation
    const change = faker.number.float({ min: -1, max: 1 }) * volatility * currentValue;
    currentValue = Math.max(0, currentValue + change);

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(currentValue),
    });
  }

  return data;
};

/**
 * Generate hourly data for real-time analytics
 */
export const generateHourlyData = (hours: number = 24): Array<{ hour: number; value: number }> => {
  const data = [];

  for (let i = 0; i < hours; i++) {
    // Simulate realistic daily patterns (higher activity during business hours)
    let baseValue = 50;
    if (i >= 9 && i <= 17) {
      baseValue = 150; // Business hours
    } else if (i >= 18 && i <= 22) {
      baseValue = 100; // Evening
    }

    const variation = faker.number.int({ min: -20, max: 20 });
    const value = Math.max(0, baseValue + variation);

    data.push({ hour: i, value });
  }

  return data;
};
