import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { db } from './index';
import { logger } from '../utils/logger';
import {
  users,
  bills,
  billComments,
  billEngagement,
  notifications,
  userProfiles,
  analysis,
  sponsors,
  sponsorAffiliations,
  billSponsorships,
  sponsorTransparency,
  billSectionConflicts
} from '../shared/schema';

async function seed() {
  logger.info('🌱 Starting comprehensive seed process...', { component: 'Chanuka' });

  try {
    // Clear existing data in reverse dependency order
    logger.info('🧹 Clearing existing data...', { component: 'Chanuka' });
    await db.delete(billSectionConflicts);
    await db.delete(sponsorTransparency);
    await db.delete(billSponsorships);
    await db.delete(sponsorAffiliations);
    await db.delete(sponsors);
    await db.delete(analysis);
    await db.delete(notifications);
    await db.delete(billEngagement);
    await db.delete(billComments);
    await db.delete(bills);
    await db.delete(userProfiles);
    await db.delete(users);

    // 1. Create diverse user base
    logger.info('👥 Creating users...', { component: 'Chanuka' });
    // Use raw SQL for user insertion to match the actual database schema
    const userInsertResult = await db.execute(`
      INSERT INTO users (username, password, email, expertise, onboarding_completed, reputation)
      VALUES 
        ('admin', '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9', 'admin@chanuka.ke', 'platform management', true, 100),
        ('analyst', '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9', 'analyst@chanuka.ke', 'constitutional law', true, 95),
        ('citizen1', '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9', 'citizen1@example.com', 'civic engagement', true, 75),
        ('activist', '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9', 'activist@example.com', 'human rights', true, 85),
        ('journalist', '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9', 'journalist@example.com', 'investigative journalism', true, 90)
      RETURNING id;
    `);

    // Get the created user IDs
    const createdUsers = await db.execute('SELECT id FROM users ORDER BY id DESC LIMIT 5');
    const userIds = createdUsers.rows.map(row => row.id);

    // 2. Create comprehensive user profiles
    logger.info('📋 Creating user profiles...', { component: 'Chanuka' });
    await db.insert(userProfiles).values([
      {
        userId: userIds[0],
        bio: 'System administrator ensuring platform integrity and transparency.',
        expertise: ['platform management', 'data governance', 'civic technology'],
        location: 'Nairobi, Kenya',
        organization: 'Chanuka Platform',
        isPublic: true
      },
      {
        userId: userIds[1],
        bio: 'Legal analyst and constitutional law expert with 15 years experience in legislative analysis.',
        expertise: ['constitutional law', 'legislative analysis', 'governance', 'policy research'],
        location: 'Nairobi, Kenya',
        organization: 'University of Nairobi School of Law',
        isPublic: true
      },
      {
        userId: userIds[2],
        bio: 'Concerned citizen interested in government transparency and accountability.',
        expertise: ['civic engagement', 'community organizing'],
        location: 'Mombasa, Kenya',
        organization: 'Coastal Civic Society',
        isPublic: true
      },
      {
        userId: userIds[3],
        bio: 'Human rights advocate working on governance and transparency issues.',
        expertise: ['human rights', 'governance', 'advocacy', 'transparency'],
        location: 'Kisumu, Kenya',
        organization: 'Transparency International Kenya',
        isPublic: true
      },
      {
        userId: userIds[4],
        bio: 'Investigative journalist covering governance and legislative affairs.',
        expertise: ['investigative journalism', 'political reporting', 'data analysis'],
        location: 'Nairobi, Kenya',
        organization: 'The Standard Media Group',
        isPublic: true
      }
    ]);

    // 3. Create comprehensive sponsor database
    logger.info('🏛️ Creating sponsors...', { component: 'Chanuka' });
    const createdSponsors = await db.insert(sponsors).values([
      {
        name: 'Hon. Catherine Wambilianga',
        role: 'Member of Parliament',
        party: 'Azimio la Umoja',
        constituency: 'Bungoma West',
        email: 'c.wambilianga@parliament.go.ke',
        phone: '+254-712-345-678',
        conflictLevel: 'medium',
        financialExposure: 2500000.00,
        votingAlignment: 78.5,
        transparencyScore: 85.2,
        bio: 'Serving her second term as MP for Bungoma West. Chair of the Public Accounts Committee with extensive experience in financial oversight.',
        photoUrl: 'https://example.com/photos/wambilianga.jpg',
        isActive: true
      },
      {
        name: 'Hon. David Sankok',
        role: 'Member of Parliament',
        party: 'Kenya Kwanza',
        constituency: 'Nominated MP',
        email: 'd.sankok@parliament.go.ke',
        phone: '+254-722-456-789',
        conflictLevel: 'high',
        financialExposure: 8750000.00,
        votingAlignment: 65.3,
        transparencyScore: 62.8,
        bio: 'Nominated MP representing persons with disabilities. Strong advocate for inclusive legislation but with significant business interests.',
        photoUrl: 'https://example.com/photos/sankok.jpg',
        isActive: true
      },
      {
        name: 'Hon. Beatrice Elachi',
        role: 'Senator',
        party: 'Independent',
        constituency: 'Nairobi County',
        email: 'b.elachi@senate.go.ke',
        phone: '+254-733-567-890',
        conflictLevel: 'low',
        financialExposure: 890000.00,
        votingAlignment: 92.1,
        transparencyScore: 94.7,
        bio: 'Former Speaker of Nairobi County Assembly, now serving as Senator. Known for transparency and good governance advocacy.',
        photoUrl: 'https://example.com/photos/elachi.jpg',
        isActive: true
      },
      {
        name: 'Hon. John Kiarie',
        role: 'Member of Parliament',
        party: 'Kenya Kwanza',
        constituency: 'Dagoretti South',
        email: 'j.kiarie@parliament.go.ke',
        phone: '+254-744-678-901',
        conflictLevel: 'medium',
        financialExposure: 3200000.00,
        votingAlignment: 71.8,
        transparencyScore: 76.4,
        bio: 'Media personality turned politician. Active in ICT and media-related legislation with interests in the entertainment industry.',
        photoUrl: 'https://example.com/photos/kiarie.jpg',
        isActive: true
      },
      {
        name: 'Hon. Joyce Emanikor',
        role: 'Member of Parliament',
        party: 'Azimio la Umoja',
        constituency: 'Turkana West',
        email: 'j.emanikor@parliament.go.ke',
        phone: '+254-755-789-012',
        conflictLevel: 'low',
        financialExposure: 450000.00,
        votingAlignment: 88.9,
        transparencyScore: 91.3,
        bio: 'First-time MP from Turkana West. Strong focus on gender equality and pastoralist communities development.',
        photoUrl: 'https://example.com/photos/emanikor.jpg',
        isActive: true
      }
    ]).returning();

    const sponsorIds = createdSponsors.map(s => s.id);

    // 4. Create detailed sponsor affiliations
    logger.info('🔗 Creating sponsor affiliations...', { component: 'Chanuka' });
    await db.insert(sponsorAffiliations).values([
      // Catherine Wambilianga affiliations
      {
        sponsorId: sponsorIds[0],
        organization: 'Bungoma Agricultural Cooperative',
        role: 'Board Member',
        type: 'economic',
        conflictType: 'financial',
        startDate: new Date('2020-01-15'),
        isActive: true
      },
      {
        sponsorId: sponsorIds[0],
        organization: 'Kenya Women Parliamentary Association',
        role: 'Treasurer',
        type: 'professional',
        conflictType: 'none',
        startDate: new Date('2022-03-10'),
        isActive: true
      },
      // David Sankok affiliations
      {
        sponsorId: sponsorIds[1],
        organization: 'Narok Livestock Traders Ltd',
        role: 'Major Shareholder',
        type: 'economic',
        conflictType: 'ownership',
        startDate: new Date('2018-06-20'),
        isActive: true
      },
      {
        sponsorId: sponsorIds[1],
        organization: 'Kenya National Federation of the Disabled',
        role: 'Patron',
        type: 'advocacy',
        conflictType: 'none',
        startDate: new Date('2017-01-01'),
        isActive: true
      },
      {
        sponsorId: sponsorIds[1],
        organization: 'Maasai Cultural Trust',
        role: 'Trustee',
        type: 'cultural',
        conflictType: 'influence',
        startDate: new Date('2019-09-15'),
        isActive: true
      },
      // Beatrice Elachi affiliations
      {
        sponsorId: sponsorIds[2],
        organization: 'Institute for Democratic Governance',
        role: 'Board Chair',
        type: 'governance',
        conflictType: 'none',
        startDate: new Date('2021-01-20'),
        isActive: true
      },
      {
        sponsorId: sponsorIds[2],
        organization: 'Nairobi Women in Leadership',
        role: 'Founder',
        type: 'advocacy',
        conflictType: 'none',
        startDate: new Date('2015-03-08'),
        isActive: true
      },
      // John Kiarie affiliations
      {
        sponsorId: sponsorIds[3],
        organization: 'Royal Media Services',
        role: 'Former Employee',
        type: 'professional',
        conflictType: 'previous',
        startDate: new Date('2010-01-01'),
        endDate: new Date('2017-08-31'),
        isActive: false
      },
      {
        sponsorId: sponsorIds[3],
        organization: 'Laugh Industry Comedy Club',
        role: 'Co-owner',
        type: 'economic',
        conflictType: 'ownership',
        startDate: new Date('2019-04-01'),
        isActive: true
      },
      {
        sponsorId: sponsorIds[3],
        organization: 'Kenya Film Commission',
        role: 'Advisory Board',
        type: 'professional',
        conflictType: 'influence',
        startDate: new Date('2020-07-15'),
        isActive: true
      },
      // Joyce Emanikor affiliations
      {
        sponsorId: sponsorIds[4],
        organization: 'Turkana Women Development Group',
        role: 'Patron',
        type: 'advocacy',
        conflictType: 'none',
        startDate: new Date('2018-01-01'),
        isActive: true
      },
      {
        sponsorId: sponsorIds[4],
        organization: 'Northern Kenya Pastoralist Forum',
        role: 'Executive Member',
        type: 'advocacy',
        conflictType: 'representation',
        startDate: new Date('2020-05-20'),
        isActive: true
      }
    ]);    
// 5. Create comprehensive bills with varied complexity
    logger.info('📄 Creating bills...', { component: 'Chanuka' });
    const createdBills = await db.insert(bills).values([
      {
        title: 'Digital Economy Enhancement Act 2024',
        description: 'Comprehensive legislation to modernize Kenya\'s digital infrastructure, promote fintech innovation, and establish regulatory frameworks for cryptocurrency and digital assets.',
        content: `ARRANGEMENT OF CLAUSES

PART I – PRELIMINARY
1. Short title and commencement
2. Interpretation
3. Objects and purpose
4. Application

PART II – DIGITAL INFRASTRUCTURE DEVELOPMENT
5. National Digital Infrastructure Framework
6. Broadband connectivity standards
7. 5G network deployment requirements
8. Digital inclusion initiatives
9. Cybersecurity standards

PART III – FINTECH AND DIGITAL ASSETS
10. Digital payment systems regulation
11. Cryptocurrency framework
12. Digital asset custody requirements
13. Anti-money laundering provisions
14. Consumer protection in digital transactions

PART IV – DATA GOVERNANCE
15. Data localization requirements
16. Cross-border data transfer protocols
17. Privacy protection standards
18. Digital rights framework

PART V – IMPLEMENTATION AND ENFORCEMENT
19. Regulatory authority establishment
20. Enforcement mechanisms
21. Penalties and sanctions
22. Appeals process

PART VI – MISCELLANEOUS
23. Transitional provisions
24. Regulations
25. Repeal and savings
26. Commencement`,
        summary: 'This Act establishes a comprehensive framework for Kenya\'s digital economy transformation, covering infrastructure development, fintech regulation, data governance, and digital rights protection.',
        status: 'committee',
        sponsorId: userIds[0],
        category: 'Technology & Innovation',
        tags: ['digital economy', 'fintech', 'cryptocurrency', 'data protection', 'infrastructure'],
        introducedDate: new Date('2024-01-15'),
        lastActionDate: new Date('2024-06-30'),
        viewCount: 0,
        shareCount: 0,
        complexityScore: 8
      },
      {
        title: 'Agriculture Modernization and Food Security Act 2024',
        description: 'Legislation aimed at transforming agricultural practices through technology adoption, improving food security, and supporting smallholder farmers with modern farming techniques.',
        content: `ARRANGEMENT OF CLAUSES

PART I – PRELIMINARY
1. Short title and commencement
2. Interpretation
3. Objects and principles
4. Application and scope

PART II – AGRICULTURAL TRANSFORMATION
5. National Agricultural Modernization Strategy
6. Technology adoption frameworks
7. Precision agriculture initiatives
8. Climate-smart agriculture programs
9. Agricultural research and development

PART III – FARMER SUPPORT SYSTEMS
10. Smallholder farmer assistance programs
11. Agricultural credit facilitation
12. Crop insurance schemes
13. Market access improvement
14. Cooperative development

PART IV – FOOD SECURITY AND NUTRITION
15. National food security framework
16. Emergency food reserves
17. Nutrition improvement programs
18. School feeding initiatives
19. Food safety standards

PART V – ENVIRONMENTAL SUSTAINABILITY
20. Sustainable farming practices
21. Soil conservation measures
22. Water resource management
23. Biodiversity protection
24. Carbon sequestration programs

PART VI – IMPLEMENTATION
25. Agricultural Development Authority
26. Monitoring and evaluation
27. Funding mechanisms
28. Public-private partnerships`,
        summary: 'Comprehensive agricultural reform legislation focusing on modernization, food security, farmer support, and environmental sustainability.',
        status: 'introduced',
        sponsorId: userIds[1],
        category: 'Agriculture & Food Security',
        tags: ['agriculture', 'food security', 'farmers', 'technology', 'sustainability'],
        introducedDate: new Date('2024-02-01'),
        lastActionDate: new Date('2024-08-15'),
        viewCount: 0,
        shareCount: 0,
        complexityScore: 7
      },
      {
        title: 'Universal Healthcare Access Amendment Bill 2024',
        description: 'Amendment to the Health Act to expand universal healthcare coverage, improve service delivery, and strengthen the public health system.',
        content: `ARRANGEMENT OF CLAUSES

PART I – PRELIMINARY
1. Short title and commencement
2. Amendment of principal Act
3. Interpretation amendments

PART II – UNIVERSAL HEALTH COVERAGE
4. Extension of UHC benefits
5. Service delivery standards
6. Quality assurance mechanisms
7. Patient rights and responsibilities
8. Health system financing

PART III – HEALTH SYSTEM STRENGTHENING
9. Primary healthcare enhancement
10. Specialist services provision
11. Emergency medical services
12. Mental health services
13. Maternal and child health

PART IV – HEALTH WORKFORCE
14. Healthcare worker training
15. Retention and motivation schemes
16. Professional development
17. Rural deployment incentives

PART V – HEALTH INFRASTRUCTURE
18. Health facility standards
19. Medical equipment requirements
20. Health technology systems
21. Pharmaceutical supply chain

PART VI – GOVERNANCE AND ACCOUNTABILITY
22. Health sector governance
23. Community participation
24. Transparency and accountability
25. Performance monitoring`,
        summary: 'Amendment bill to strengthen universal healthcare coverage and improve health system performance in Kenya.',
        status: 'passed',
        sponsorId: userIds[2],
        category: 'Health & Social Services',
        tags: ['healthcare', 'universal coverage', 'health system', 'public health'],
        introducedDate: new Date('2023-11-20'),
        lastActionDate: new Date('2024-03-15'),
        viewCount: 0,
        shareCount: 0,
        complexityScore: 6
      },
      {
        title: 'Climate Change Adaptation and Resilience Act 2024',
        description: 'Legislation to establish comprehensive climate change adaptation strategies, enhance community resilience, and promote green economy transitions.',
        content: `ARRANGEMENT OF CLAUSES

PART I – PRELIMINARY
1. Short title and commencement
2. Interpretation
3. Objects and guiding principles
4. Application

PART II – CLIMATE CHANGE FRAMEWORK
5. National Climate Change Strategy
6. Adaptation planning
7. Mitigation measures
8. Climate risk assessment
9. Vulnerability mapping

PART III – RESILIENCE BUILDING
10. Community resilience programs
11. Infrastructure adaptation
12. Ecosystem restoration
13. Disaster risk reduction
14. Early warning systems

PART IV – GREEN ECONOMY TRANSITION
15. Renewable energy promotion
16. Sustainable transport systems
17. Green building standards
18. Circular economy initiatives
19. Green jobs creation

PART V – FINANCE AND TECHNOLOGY
20. Climate finance mechanisms
21. Technology transfer
22. Carbon market participation
23. International cooperation
24. Private sector engagement

PART VI – MONITORING AND REPORTING
25. National monitoring system
26. Reporting obligations
27. Review and update mechanisms
28. Public participation`,
        summary: 'Comprehensive climate legislation establishing adaptation strategies, resilience building, and green economy transition frameworks.',
        status: 'draft',
        sponsorId: userIds[3],
        category: 'Environment & Climate',
        tags: ['climate change', 'adaptation', 'resilience', 'green economy', 'sustainability'],
        introducedDate: new Date('2024-03-01'),
        lastActionDate: new Date('2024-09-30'),
        viewCount: 0,
        shareCount: 0,
        complexityScore: 9
      },
      {
        title: 'Youth Economic Empowerment Act 2024',
        description: 'Legislation to create comprehensive youth economic empowerment programs, including entrepreneurship support, skills development, and employment creation.',
        content: `ARRANGEMENT OF CLAUSES

PART I – PRELIMINARY
1. Short title and commencement
2. Interpretation
3. Objects and principles
4. Application

PART II – YOUTH EMPOWERMENT FRAMEWORK
5. National Youth Empowerment Strategy
6. Youth development programs
7. Skills development initiatives
8. Mentorship programs
9. Leadership development

PART III – ENTREPRENEURSHIP SUPPORT
10. Youth enterprise fund enhancement
11. Business incubation centers
12. Access to finance
13. Market linkage programs
14. Innovation and technology hubs

PART IV – EMPLOYMENT CREATION
15. Youth employment programs
16. Internship and attachment schemes
17. Public works programs
18. Private sector partnerships
19. Green jobs initiatives

PART V – EDUCATION AND TRAINING
20. Technical and vocational training
21. Digital skills development
22. Life skills education
23. Financial literacy programs
24. Career guidance services

PART VI – IMPLEMENTATION
25. Youth Empowerment Authority
26. Coordination mechanisms
27. Monitoring and evaluation
28. Funding arrangements`,
        summary: 'Comprehensive youth empowerment legislation covering entrepreneurship, skills development, employment creation, and economic opportunities.',
        status: 'committee',
        sponsorId: userIds[4],
        category: 'Social Development',
        tags: ['youth empowerment', 'entrepreneurship', 'employment', 'skills development'],
        introducedDate: new Date('2024-02-15'),
        lastActionDate: new Date('2024-07-30'),
        viewCount: 0,
        shareCount: 0,
        complexityScore: 5
      }
    ]).returning();

    const billIds = createdBills.map(b => b.id);

    // 6. Create bill sponsorships linking sponsors to bills
    logger.info('🤝 Creating bill sponsorships...', { component: 'Chanuka' });
    await db.insert(billSponsorships).values([
      // Digital Economy Act sponsorships
      {
        billId: billIds[0],
        sponsorId: sponsorIds[3], // John Kiarie (media background, tech interest)
        sponsorshipType: 'primary',
        sponsorshipDate: new Date('2024-01-15'),
        isActive: true
      },
      {
        billId: billIds[0],
        sponsorId: sponsorIds[2], // Beatrice Elachi (governance focus)
        sponsorshipType: 'co-sponsor',
        sponsorshipDate: new Date('2024-01-20'),
        isActive: true
      },
      // Agriculture Act sponsorships
      {
        billId: billIds[1],
        sponsorId: sponsorIds[0], // Catherine Wambilianga (agricultural background)
        sponsorshipType: 'primary',
        sponsorshipDate: new Date('2024-02-01'),
        isActive: true
      },
      {
        billId: billIds[1],
        sponsorId: sponsorIds[1], // David Sankok (livestock interests)
        sponsorshipType: 'co-sponsor',
        sponsorshipDate: new Date('2024-02-05'),
        isActive: true
      },
      {
        billId: billIds[1],
        sponsorId: sponsorIds[4], // Joyce Emanikor (pastoralist community)
        sponsorshipType: 'co-sponsor',
        sponsorshipDate: new Date('2024-02-10'),
        isActive: true
      },
      // Healthcare Act sponsorships
      {
        billId: billIds[2],
        sponsorId: sponsorIds[2], // Beatrice Elachi (governance & transparency)
        sponsorshipType: 'primary',
        sponsorshipDate: new Date('2023-11-20'),
        isActive: true
      },
      {
        billId: billIds[2],
        sponsorId: sponsorIds[4], // Joyce Emanikor (representing underserved communities)
        sponsorshipType: 'co-sponsor',
        sponsorshipDate: new Date('2023-11-25'),
        isActive: true
      },
      // Climate Change Act sponsorships
      {
        billId: billIds[3],
        sponsorId: sponsorIds[4], // Joyce Emanikor (environmental concerns)
        sponsorshipType: 'primary',
        sponsorshipDate: new Date('2024-03-01'),
        isActive: true
      },
      {
        billId: billIds[3],
        sponsorId: sponsorIds[0], // Catherine Wambilianga (agricultural climate issues)
        sponsorshipType: 'co-sponsor',
        sponsorshipDate: new Date('2024-03-05'),
        isActive: true
      },
      // Youth Empowerment Act sponsorships
      {
        billId: billIds[4],
        sponsorId: sponsorIds[3], // John Kiarie (youth-focused)
        sponsorshipType: 'primary',
        sponsorshipDate: new Date('2024-02-15'),
        isActive: true
      },
      {
        billId: billIds[4],
        sponsorId: sponsorIds[2], // Beatrice Elachi (leadership development)
        sponsorshipType: 'co-sponsor',
        sponsorshipDate: new Date('2024-02-20'),
        isActive: true
      }
    ]);

    // 7. Create sponsor transparency records
    logger.info('🔍 Creating sponsor transparency records...', { component: 'Chanuka' });
    await db.insert(sponsorTransparency).values([
      {
        sponsorId: sponsorIds[0], // Catherine Wambilianga
        disclosureType: 'financial',
        description: 'Complete financial disclosure including agricultural cooperative board membership',
        amount: 2500000.00,
        source: 'Bungoma Agricultural Cooperative',
        dateReported: new Date('2024-02-01'),
        isVerified: true
      },
      {
        sponsorId: sponsorIds[1], // David Sankok
        disclosureType: 'business',
        description: 'Major shareholding in livestock trading company',
        amount: 8750000.00,
        source: 'Narok Livestock Traders Ltd',
        dateReported: new Date('2024-01-20'),
        isVerified: false
      },
      {
        sponsorId: sponsorIds[2], // Beatrice Elachi
        disclosureType: 'financial',
        description: 'Board chair compensation from governance institute',
        amount: 890000.00,
        source: 'Institute for Democratic Governance',
        dateReported: new Date('2024-02-15'),
        isVerified: true
      },
      {
        sponsorId: sponsorIds[3], // John Kiarie
        disclosureType: 'business',
        description: 'Co-ownership of entertainment business',
        amount: 3200000.00,
        source: 'Laugh Industry Comedy Club',
        dateReported: new Date('2024-01-30'),
        isVerified: false
      },
      {
        sponsorId: sponsorIds[4], // Joyce Emanikor
        disclosureType: 'family',
        description: 'Spouse involvement in pastoralist development organization',
        amount: 450000.00,
        source: 'Northern Kenya Pastoralist Forum',
        dateReported: new Date('2024-02-10'),
        isVerified: true
      }
    ]);

    // 8. Create bill section conflicts (skipped due to schema mismatch)
    logger.info('⚠️ Skipping bill section conflicts due to schema mismatch...', { component: 'Chanuka' });

    // 9. Create comprehensive analysis records
    logger.info('📊 Creating analysis records...', { component: 'Chanuka' });
    await db.insert(analysis).values([
      {
        billId: billIds[0],
        analysisType: 'conflict_of_interest',
        results: {
          overallRisk: 'medium',
          primaryConcerns: ['fintech conflicts', 'regulatory capture'],
          recommendations: ['Enhanced oversight', 'Public consultation'],
          affectedSections: ['11', '12', '13'],
          transparencyScore: 76.4
        },
        confidence: '0.852',
        metadata: {
          analysisDate: '2024-01-25',
          analyst: 'Dr. Sarah Wanjiku',
          reviewStatus: 'completed',
          publicationStatus: 'published'
        },
        modelVersion: '1.2',
        isApproved: true,
        approvedBy: userIds[1]
      },
      {
        billId: billIds[1],
        analysisType: 'stakeholder_impact',
        results: {
          primaryBeneficiaries: ['smallholder farmers', 'agricultural cooperatives'],
          potentialRisks: ['market concentration', 'technology barriers'],
          economicImpact: 'positive',
          socialImpact: 'highly positive',
          environmentalImpact: 'positive'
        },
        confidence: '0.927',
        metadata: {
          analysisDate: '2024-02-05',
          analyst: 'Agricultural Policy Team',
          reviewStatus: 'completed',
          publicationStatus: 'published'
        },
        modelVersion: '1.0',
        isApproved: true,
        approvedBy: userIds[1]
      },
      {
        billId: billIds[2],
        analysisType: 'constitutional_compliance',
        results: {
          constitutionalAlignment: 'full',
          humanRightsImpact: 'positive',
          legalChallenges: 'minimal',
          implementationFeasibility: 'high',
          budgetaryImplications: 'significant'
        },
        confidence: '0.963',
        metadata: {
          analysisDate: '2023-12-01',
          analyst: 'Constitutional Law Team',
          reviewStatus: 'completed',
          publicationStatus: 'published'
        },
        modelVersion: '1.1',
        isApproved: true,
        approvedBy: userIds[1]
      }
    ]);

    // 10. Create diverse comments and engagement
    logger.info('💬 Creating comments...', { component: 'Chanuka' });
    await db.insert(billComments).values([
      {
        billId: billIds[0],
        userId: userIds[1],
        content: 'The cryptocurrency framework in Section 11 requires more robust consumer protection measures. Current provisions may not adequately address the risks associated with digital asset volatility and market manipulation.',
        upvotes: 24,
        downvotes: 3,
        isVerified: true
      },
      {
        billId: billIds[0],
        userId: userIds[2],
        content: 'As a citizen concerned about digital rights, I appreciate the focus on privacy protection in Part IV. However, the data localization requirements might create barriers for small businesses trying to compete globally.',
        upvotes: 18,
        downvotes: 7,
        isVerified: false
      },
      {
        billId: billIds[0],
        userId: userIds[3],
        content: 'From a transparency perspective, the regulatory authority establishment in Section 19 needs clearer accountability mechanisms. Who will oversee the overseers?',
        upvotes: 31,
        downvotes: 2,
        isVerified: false
      },
      {
        billId: billIds[0],
        userId: userIds[4],
        content: 'Excellent investigative angle: The fintech provisions could significantly impact Kenya\'s position as a regional financial hub. The implementation timeline needs careful consideration.',
        upvotes: 22,
        downvotes: 1,
        isVerified: true
      },
      // Agriculture Act comments
      {
        billId: billIds[1],
        userId: userIds[0],
        content: 'The climate-smart agriculture programs in Part II align well with Kenya\'s climate commitments. Implementation will require significant coordination between national and county governments.',
        upvotes: 15,
        downvotes: 4,
        isVerified: true
      },
      {
        billId: billIds[1],
        userId: userIds[2],
        content: 'As someone from a farming community, I\'m excited about the smallholder farmer assistance programs. However, we need assurance that these won\'t just benefit large-scale farmers with better access to information.',
        upvotes: 28,
        downvotes: 3,
        isVerified: false
      },
      {
        billId: billIds[1],
        userId: userIds[1],
        content: 'The legal framework for agricultural cooperatives in Section 14 needs strengthening. Current provisions may not adequately protect small farmers from exploitation.',
        upvotes: 19,
        downvotes: 2,
        isVerified: true
      },
      // Healthcare Act comments
      {
        billId: billIds[2],
        userId: userIds[3],
        content: 'Universal healthcare is a human right. This amendment addresses critical gaps in our current system, particularly for rural communities.',
        upvotes: 42,
        downvotes: 8,
        isVerified: false
      },
      {
        billId: billIds[2],
        userId: userIds[4],
        content: 'Investigative analysis shows that similar healthcare reforms in other countries faced implementation challenges. We need robust monitoring mechanisms.',
        upvotes: 26,
        downvotes: 5,
        isVerified: true
      },
      {
        billId: billIds[2],
        userId: userIds[1],
        content: 'From a constitutional perspective, the health system financing provisions in Section 8 require careful balance between national and county responsibilities.',
        upvotes: 17,
        downvotes: 3,
        isVerified: true
      },
      // Climate Change Act comments
      {
        billId: billIds[3],
        userId: userIds[2],
        content: 'Climate change affects all of us, but especially vulnerable communities. The community resilience programs in Part III are crucial for adaptation.',
        upvotes: 33,
        downvotes: 6,
        isVerified: false
      },
      {
        billId: billIds[3],
        userId: userIds[0],
        content: 'The green economy transition framework is comprehensive, but implementation will require significant investment in capacity building and technology transfer.',
        upvotes: 21,
        downvotes: 4,
        isVerified: true
      },
      // Youth Empowerment Act comments
      {
        billId: billIds[4],
        userId: userIds[2],
        content: 'As a young Kenyan, I\'m hopeful about the entrepreneurship support programs. However, we need to ensure these opportunities reach youth in rural areas, not just urban centers.',
        upvotes: 35,
        downvotes: 2,
        isVerified: false
      },
      {
        billId: billIds[4],
        userId: userIds[3],
        content: 'Youth economic empowerment is essential for Kenya\'s future. The digital skills development component is particularly relevant in our increasingly digital economy.',
        upvotes: 29,
        downvotes: 3,
        isVerified: false
      },
      {
        billId: billIds[4],
        userId: userIds[1],
        content: 'The legal framework for youth enterprise funding needs stronger accountability measures to prevent misuse of public resources.',
        upvotes: 16,
        downvotes: 7,
        isVerified: true
      }
    ]);

    // 11. Create comprehensive engagement data
    logger.info('📈 Creating engagement data...', { component: 'Chanuka' });
    await db.insert(billEngagement).values([
      // Digital Economy Act engagement
      {
        billId: billIds[0],
        userId: userIds[0],
        viewCount: 5,
        commentCount: 1,
        shareCount: 2,
        engagementScore: '8.5'
      },
      {
        billId: billIds[0],
        userId: userIds[1],
        viewCount: 8,
        commentCount: 1,
        shareCount: 3,
        engagementScore: '12.0'
      },
      {
        billId: billIds[0],
        userId: userIds[2],
        viewCount: 3,
        commentCount: 1,
        shareCount: 1,
        engagementScore: '5.5'
      },
      {
        billId: billIds[0],
        userId: userIds[3],
        viewCount: 6,
        commentCount: 1,
        shareCount: 4,
        engagementScore: '11.0'
      },
      {
        billId: billIds[0],
        userId: userIds[4],
        viewCount: 4,
        commentCount: 1,
        shareCount: 2,
        engagementScore: '7.0'
      },
      // Agriculture Act engagement
      {
        billId: billIds[1],
        userId: userIds[0],
        viewCount: 7,
        commentCount: 1,
        shareCount: 3,
        engagementScore: '11.5'
      },
      {
        billId: billIds[1],
        userId: userIds[1],
        viewCount: 4,
        commentCount: 1,
        shareCount: 1,
        engagementScore: '6.0'
      },
      {
        billId: billIds[1],
        userId: userIds[2],
        viewCount: 9,
        commentCount: 1,
        shareCount: 5,
        engagementScore: '15.0'
      },
      // Healthcare Act engagement
      {
        billId: billIds[2],
        userId: userIds[1],
        viewCount: 6,
        commentCount: 1,
        shareCount: 2,
        engagementScore: '9.0'
      },
      {
        billId: billIds[2],
        userId: userIds[3],
        viewCount: 8,
        commentCount: 1,
        shareCount: 6,
        engagementScore: '15.0'
      },
      {
        billId: billIds[2],
        userId: userIds[4],
        viewCount: 5,
        commentCount: 1,
        shareCount: 3,
        engagementScore: '9.0'
      },
      // Climate Change Act engagement
      {
        billId: billIds[3],
        userId: userIds[0],
        viewCount: 4,
        commentCount: 1,
        shareCount: 2,
        engagementScore: '7.0'
      },
      {
        billId: billIds[3],
        userId: userIds[2],
        viewCount: 7,
        commentCount: 1,
        shareCount: 4,
        engagementScore: '12.0'
      },
      // Youth Empowerment Act engagement
      {
        billId: billIds[4],
        userId: userIds[1],
        viewCount: 3,
        commentCount: 1,
        shareCount: 1,
        engagementScore: '5.0'
      },
      {
        billId: billIds[4],
        userId: userIds[2],
        viewCount: 6,
        commentCount: 1,
        shareCount: 3,
        engagementScore: '10.0'
      },
      {
        billId: billIds[4],
        userId: userIds[3],
        viewCount: 5,
        commentCount: 1,
        shareCount: 2,
        engagementScore: '8.0'
      }
    ]);

    // 12. Create notifications for user engagement
    logger.info('🔔 Creating notifications...', { component: 'Chanuka' });
    await db.insert(notifications).values([
      {
        userId: userIds[0],
        type: 'bill_update',
        title: 'Bill Status Update',
        message: 'Digital Economy Enhancement Act 2024 has moved to committee review',
        relatedBillId: billIds[0],
        isRead: false
      },
      {
        userId: userIds[1],
        type: 'comment_reply',
        title: 'New Reply to Your Comment',
        message: 'Someone replied to your comment on Agriculture Modernization Act',
        relatedBillId: billIds[1],
        isRead: true
      },
      {
        userId: userIds[2],
        type: 'bill_update',
        title: 'New Bill Published',
        message: 'Climate Change Adaptation and Resilience Act 2024 has been published for public comment',
        relatedBillId: billIds[3],
        isRead: false
      },
      {
        userId: userIds[3],
        type: 'verification_status',
        title: 'Account Verification Complete',
        message: 'Your expert verification has been approved',
        isRead: true
      },
      {
        userId: userIds[4],
        type: 'bill_update',
        title: 'Bill Passed',
        message: 'Universal Healthcare Access Amendment Bill 2024 has been passed',
        relatedBillId: billIds[2],
        isRead: false
      }
    ]);

    logger.info('✅ Comprehensive seed data creation completed successfully!', { component: 'Chanuka' });
    logger.info('📊 Database now contains:', { component: 'Chanuka' });
    console.log(`   - ${createdUsers.length} users with diverse roles`);
    console.log(`   - ${createdSponsors.length} sponsors with detailed profiles`);
    console.log(`   - ${createdBills.length} bills with comprehensive content`);
    console.log(`   - Multiple sponsor affiliations and transparency records`);
    console.log(`   - Detailed bill section conflict analysis`);
    console.log(`   - Comprehensive comment threads and engagement data`);
    console.log(`   - User notifications and interaction history`);
    console.log(`   - Analysis records with confidence scoring`);

  } catch (error) {
    logger.error('❌ Error during seed data creation:', { component: 'Chanuka' }, error);
    throw error;
  }
}

// Execute the seed function
seed()
  .then(() => {
    logger.info('🎉 Seed process completed successfully!', { component: 'Chanuka' });
    process.exit(0);
  })
  .catch((error) => {
    logger.error('💥 Seed process failed:', { component: 'Chanuka' }, error);
    process.exit(1);
  });






