/**
 * Real Kenyan Legal & Legislative Data
 *
 * This module provides authentic data for the Kenyan context, including:
 * 1. Constitutional Articles (2010 Constitution)
 * 2. Real Case Law (Precedents)
 * 3. Recent Real Bills
 * 4. Expert Profiles (Realistic)
 */

// ============================================================================
// 1. Constitutional Provisions (Kenya Constitution 2010)
// ============================================================================

export const KENYA_CONSTITUTION = {
  articles: {
    10: {
      id: "art-10",
      number: "10",
      title: "National Values and Principles of Governance",
      content: "The national values and principles of governance include patriotism, national unity, sharing and devolution of power, the rule of law, democracy and participation of the people.",
      relevance: "Fundamental foundation for all legislation"
    },
    27: {
      id: "art-27",
      number: "27",
      title: "Equality and Freedom from Discrimination",
      content: "Every person is equal before the law and has the right to equal protection and equal benefit of the law. The State shall not discriminate directly or indirectly against any person on any ground, including race, sex, pregnancy, marital status, health status, ethnic or social origin, colour, age, disability, religion, conscience, belief, culture, dress, language or birth.",
      relevance: "Critical for bills involving eligibility criteria or social benefits"
    },
    43: {
      id: "art-43",
      number: "43",
      title: "Economic and Social Rights",
      content: "Every person has the right to the highest attainable standard of health, which includes the right to health care services, including reproductive health care; to accessible and adequate housing, and to reasonable standards of sanitation; to be free from hunger, and to have adequate food of acceptable quality; to clean and safe water in adequate quantities; to social security; and to education.",
      relevance: "Central to healthcare, housing, and social legislation"
    },
    189: {
      id: "art-189",
      number: "189",
      title: "Cooperation between National and County Governments",
      content: "Government at either level shall perform its functions, and exercise its powers, in a manner that respects the functional and institutional integrity of government at the other level, and respects the constitutional status and institutions of government at the other level and, in the case of county government, within the county level.",
      relevance: "Key for legislation affecting devolution"
    }
  },
  schedules: {
    fourth: {
      id: "sched-4",
      title: "Fourth Schedule",
      content: "Distribution of functions between the National Government and the County Governments.",
      relevance: "Determines jurisdiction for bills"
    }
  }
};

// ============================================================================
// 2. Real Case Law (Precedents)
// ============================================================================

export const KENYA_CASE_LAW = {
  health: [
    {
      name: 'Okwanda v. Minister of Health',
      citation: '[2014] eKLR',
      year: 2014,
      summary: 'The Court emphasized that the right to health under Article 43 is not merely aspirational but imposes an immediate obligation on the State to take concrete steps towards its realization.',
      relevance: 90,
      tags: ['right-to-health', 'state-obligation']
    },
    {
      name: 'Mitu-Bell Welfare Society v. Attorney General',
      citation: '[2021] eKLR',
      year: 2021,
      summary: 'Supreme Court affirmed the justiciability of socio-economic rights and the obligation of the state to provide structural interdicts where necessary.',
      relevance: 85,
      tags: ['socio-economic-rights', 'structural-interdicts']
    },
    {
      name: 'P.A.O. and 2 Others v. Attorney General',
      citation: '[2012] eKLR',
      year: 2012,
      summary: 'Addressed the Anti-Counterfeit Act, ruling that intellectual property rights should not override the fundamental right to life and health (access to generic medicines).',
      relevance: 88,
      tags: ['intellectual-property', 'access-to-medicine']
    }
  ],
  devolution: [
    {
      name: 'Council of Governors v. National Assembly',
      citation: '[2020] eKLR',
      year: 2020,
      summary: 'Clarified the legislative process for bills concerning county governments, mandating Senate involvement.',
      relevance: 95,
      tags: ['legislative-process', 'senate-role']
    },
    {
      name: 'Institute for Social Accountability (TISA) v. National Assembly',
      citation: '[2015] eKLR',
      year: 2015,
      summary: 'Declared the Constituency Development Fund (CDF) Act unconstitutional for violating principles of separation of powers and devolution.',
      relevance: 92,
      tags: ['public-finance', 'separation-of-powers']
    }
  ]
};

// ============================================================================
// 3. Real Recent/Relevant Bills
// ============================================================================

export const REAL_BILLS = [
  {
    id: "bill-dh-001",
    title: "The Digital Health Bill, 2023",
    number: "N.A.B. No. 57 of 2023",
    summary: "An Act of Parliament to establish the Digital Health Agency; to provide for the framework for provision of digital health services; to establish a comprehensive integrated digital health information system; and for connected purposes.",
    keyProvisions: [
      "Establishment of the Digital Health Agency",
      "Creation of an Integrated Digital Health Information System",
      "Data governance and protection of personal health data",
      "E-health service delivery standards"
    ],
    constitutionalBasis: [
      KENYA_CONSTITUTION.articles[43],
      KENYA_CONSTITUTION.articles[31] // Privacy
    ],
    concerns: [
      "Data privacy and security safeguards",
      "Interoperability with county health systems"
    ]
  },
  {
    id: "bill-fb-002",
    title: "The Finance Bill, 2024",
    number: "N.A.B. No. 30 of 2024",
    summary: "A Bill to formulate the proposals relating to revenue raising measures for the National Government for the Financial Year 2024/2025.",
    keyProvisions: [
      "Amendments to the Income Tax Act",
      "Changes to VAT rates on specific goods",
      "Introduction of Eco-Levy",
      "Adjustments to Excise Duty"
    ],
    constitutionalBasis: [
      KENYA_CONSTITUTION.articles[201] // Public Finance Principles
    ],
    concerns: [
      "Impact on cost of living",
      "Public participation adequacy"
    ]
  },
  {
    id: "bill-coi-003",
    title: "The Conflict of Interest Bill, 2023",
    number: "Sen. Bill No. 12 of 2023",
    summary: "An Act to provide for the management of conflict of interest in the discharge of official duties; to provide for the powers and functions of the Ethics and Anti-Corruption Commission in relation to conflict of interest.",
    keyProvisions: [
      "Definition of conflict of interest",
      "Declaration of income, assets and liabilities",
      "Prohibitions on certain activities for public officers"
    ],
    constitutionalBasis: [
      KENYA_CONSTITUTION.articles[10],
      KENYA_CONSTITUTION.articles[73],
      KENYA_CONSTITUTION.articles[75]
    ],
    concerns: [
      "Enforcement mechanisms",
      "Privacy of public officers vs public interest"
    ]
  }
];

// ============================================================================
// 4. Realistic Expert Profiles
// ============================================================================

export const EXPERT_PROFILES = [
  {
    id: 'expert-ke-001',
    name: 'Prof. Githu Muigai',
    credentials: [
      { type: 'education', title: 'PhD in Law', institution: 'University of Nairobi' },
      { type: 'experience', title: 'Former Attorney General', institution: 'Republic of Kenya' }
    ],
    specialization: 'Constitutional Law',
    bio: 'Distinguished legal scholar and practitioner with extensive experience in constitutional interpretation and state law.'
  },
  {
    id: 'expert-ke-002',
    name: 'Dr. PLO Lumumba',
    credentials: [
      { type: 'education', title: 'PhD in Law of the Sea', institution: 'University of Ghent' },
      { type: 'experience', title: 'Former Director', institution: 'Kenya School of Law' }
    ],
    specialization: 'Governance & Ethics',
    bio: 'Renowned constitutional lawyer and advocate for good governance and pan-Africanism.'
  },
  {
    id: 'expert-ke-003',
    name: 'Wanjiru Gikonyo',
    credentials: [
      { type: 'experience', title: 'National Coordinator', institution: 'The Institute for Social Accountability (TISA)' }
    ],
    specialization: 'Devolution & Public Finance',
    bio: 'Leading expert on devolution implementation and public accountability mechanisms in Kenya.'
  }
];

// Helper to get formatted constitutional article text
export const getConstitutionalArticle = (articleNumber: number) => {
  return KENYA_CONSTITUTION.articles[articleNumber as keyof typeof KENYA_CONSTITUTION.articles];
};

// Helper to get case law by category
export const getCaseLaw = (category: 'health' | 'devolution') => {
  return KENYA_CASE_LAW[category];
};
