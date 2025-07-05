
import { db } from './index';
import {
  users,
  bills,
  comments,
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
  console.log('🌱 Starting comprehensive seed process...');

  try {
    // Clear existing data in reverse dependency order
    console.log('🧹 Clearing existing data...');
    await db.delete(billSectionConflicts);
    await db.delete(sponsorTransparency);
    await db.delete(billSponsorships);
    await db.delete(sponsorAffiliations);
    await db.delete(sponsors);
    await db.delete(analysis);
    await db.delete(notifications);
    await db.delete(billEngagement);
    await db.delete(comments);
    await db.delete(bills);
    await db.delete(userProfiles);
    await db.delete(users);

    // 1. Create diverse user base
    console.log('👥 Creating users...');
    const createdUsers = await db.insert(users).values([
      {
        email: 'admin@chanuka.ke',
        password: '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9',
        name: 'System Administrator',
        role: 'admin',
        verificationStatus: 'verified',
        isActive: true
      },
      {
        email: 'analyst@chanuka.ke',
        password: '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9',
        name: 'Dr. Sarah Wanjiku',
        role: 'expert',
        verificationStatus: 'verified',
        isActive: true
      },
      {
        email: 'citizen1@example.com',
        password: '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9',
        name: 'James Mwangi',
        role: 'citizen',
        verificationStatus: 'verified',
        isActive: true
      },
      {
        email: 'activist@example.com',
        password: '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9',
        name: 'Grace Akinyi',
        role: 'advocate',
        verificationStatus: 'verified',
        isActive: true
      },
      {
        email: 'journalist@example.com',
        password: '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9',
        name: 'Michael Ochieng',
        role: 'journalist',
        verificationStatus: 'verified',
        isActive: true
      }
    ]).returning();

    const userIds = createdUsers.map(u => u.id);

    // 2. Create comprehensive user profiles
    console.log('📋 Creating user profiles...');
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
    console.log('🏛️ Creating sponsors...');
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
    console.log('🔗 Creating sponsor affiliations...');
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
    console.log('📄 Creating bills...');
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
        publicationDate: new Date('2024-01-15'),
        votingDeadline: new Date('2024-06-30'),
        parliamentaryStage: 'Committee Review',
        publicSupport: 72.5,
        priority: 'high',
        isArchived: false
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
        publicationDate: new Date('2024-02-01'),
        votingDeadline: new Date('2024-08-15'),
        parliamentaryStage: 'First Reading',
        publicSupport: 85.3,
        priority: 'critical',
        isArchived: false
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
        publicationDate: new Date('2023-11-20'),
        votingDeadline: new Date('2024-03-15'),
        parliamentaryStage: 'Presidential Assent',
        publicSupport: 91.7,
        priority: 'critical',
        isArchived: false
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
        publicationDate: new Date('2024-03-01'),
        votingDeadline: new Date('2024-09-30'),
        parliamentaryStage: 'Drafting',
        publicSupport: 78.9,
        priority: 'high',
        isArchived: false
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
        publicationDate: new Date('2024-02-15'),
        votingDeadline: new Date('2024-07-30'),
        parliamentaryStage: 'Committee Review',
        publicSupport: 88.2,
        priority: 'high',
        isArchived: false
      }
    ]).returning();

    const billIds = createdBills.map(b => b.id);

    // 6. Create bill sponsorships linking sponsors to bills
    console.log('🤝 Creating bill sponsorships...');
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
    console.log('🔍 Creating sponsor transparency records...');
    await db.insert(sponsorTransparency).values([
      {
        sponsorId: sponsorIds[0], // Catherine Wambilianga
        disclosure: 'complete',
        lastUpdated: new Date('2024-02-01'),
        publicStatements: 15,
        disclosureDocuments: [
          { type: 'financial_disclosure', url: 'https://example.com/docs/wambilianga_financial.pdf', date: '2024-01-15' },
          { type: 'conflict_statement', url: 'https://example.com/docs/wambilianga_conflicts.pdf', date: '2024-01-20' },
          { type: 'voting_record', url: 'https://example.com/docs/wambilianga_voting.pdf', date: '2024-02-01' }
        ],
        verificationStatus: 'verified'
      },
      {
        sponsorId: sponsorIds[1], // David Sankok
        disclosure: 'partial',
        lastUpdated: new Date('2024-01-20'),
        publicStatements: 8,
        disclosureDocuments: [
          { type: 'financial_disclosure', url: 'https://example.com/docs/sankok_financial.pdf', date: '2023-12-01' },
          { type: 'business_interests', url: 'https://example.com/docs/sankok_business.pdf', date: '2024-01-10' }
        ],
        verificationStatus: 'pending'
      },
      {
        sponsorId: sponsorIds[2], // Beatrice Elachi
        disclosure: 'complete',
        lastUpdated: new Date('2024-02-15'),
        publicStatements: 22,
        disclosureDocuments: [
          { type: 'financial_disclosure', url: 'https://example.com/docs/elachi_financial.pdf', date: '2024-02-01' },
          { type: 'conflict_statement', url: 'https://example.com/docs/elachi_conflicts.pdf', date: '2024-02-05' },
          { type: 'voting_record', url: 'https://example.com/docs/elachi_voting.pdf', date: '2024-02-15' },
          { type: 'public_statements', url: 'https://example.com/docs/elachi_statements.pdf', date: '2024-02-15' }
        ],
        verificationStatus: 'verified'
      },
      {
        sponsorId: sponsorIds[3], // John Kiarie
        disclosure: 'partial',
        lastUpdated: new Date('2024-01-30'),
        publicStatements: 12,
        disclosureDocuments: [
          { type: 'media_interests', url: 'https://example.com/docs/kiarie_media.pdf', date: '2024-01-15' },
          { type: 'entertainment_business', url: 'https://example.com/docs/kiarie_entertainment.pdf', date: '2024-01-25' }
        ],
        verificationStatus: 'pending'
      },
      {
        sponsorId: sponsorIds[4], // Joyce Emanikor
        disclosure: 'complete',
        lastUpdated: new Date('2024-02-10'),
        publicStatements: 18,
        disclosureDocuments: [
          { type: 'financial_disclosure', url: 'https://example.com/docs/emanikor_financial.pdf', date: '2024-02-01' },
          { type: 'community_interests', url: 'https://example.com/docs/emanikor_community.pdf', date: '2024-02-05' },
          { type: 'advocacy_work', url: 'https://example.com/docs/emanikor_advocacy.pdf', date: '2024-02-10' }
        ],
        verificationStatus: 'verified'
      }
    ]);

    // 8. Create bill section conflicts
    console.log('⚠️ Creating bill section conflicts...');
    await db.insert(billSectionConflicts).values([
      {
        billId: billIds[0], // Digital Economy Act
        sectionNumber: '11',
        sectionTitle: 'Cryptocurrency framework',
        conflictLevel: 'medium',
        description: 'Primary sponsor has interests in fintech companies that could benefit from relaxed cryptocurrency regulations.',
        affectedSponsors: [sponsorIds[3]], // John Kiarie
        analysisData: {
          conflictType: 'financial',
          riskLevel: 'medium',
          mitigationSuggestions: ['Enhanced disclosure requirements', 'Independent oversight committee'],
          publicInterestImpact: 'medium'
        }
      },
      {
        billId: billIds[1], // Agriculture Act
        sectionNumber: '11',
        sectionTitle: 'Agricultural credit facilitation',
        conflictLevel: 'high',
        description: 'Co-sponsor has significant interests in livestock trading that could benefit from improved agricultural credit systems.',
        affectedSponsors: [sponsorIds[1]], // David Sankok
        analysisData: {
          conflictType: 'economic',
          riskLevel: 'high',
          mitigationSuggestions: ['Recusal from relevant votes', 'Independent committee review', 'Enhanced public consultation'],
          publicInterestImpact: 'high'
        }
      },
      {
        billId: billIds[4], // Youth Empowerment Act
        sectionNumber: '12',
        sectionTitle: 'Business incubation centers',
        conflictLevel: 'low',
        description: 'Primary sponsor\'s entertainment business could indirectly benefit from youth entrepreneurship programs.',
        affectedSponsors: [sponsorIds[3]], // John Kiarie
        analysisData: {
          conflictType: 'indirect',
          riskLevel: 'low',
          mitigationSuggestions: ['Disclosure of potential benefits', 'Transparent selection criteria'],
          publicInterestImpact: 'low'
        }
      }
    ]);

    // 9. Create comprehensive analysis records
    console.log('📊 Creating analysis records...');
    await db.insert(analysis).values([
      {
        billId: billIds[0],
        analysisType: 'conflict_of_interest',
        result: {
          overallRisk: 'medium',
          primaryConcerns: ['fintech conflicts', 'regulatory capture'],
          recommendations: ['Enhanced oversight', 'Public consultation'],
          affectedSections: ['11', '12', '13'],
          transparencyScore: 76.4
        },
        confidence: 85.2,
        metadata: {
          analysisDate: '2024-01-25',
          analyst: 'Dr. Sarah Wanjiku',
          reviewStatus: 'completed',
          publicationStatus: 'published'
        },
        version: '1.2',
        isLatest: true
      },
      {
        billId: billIds[1],
        analysisType: 'stakeholder_impact',
        result: {
          primaryBeneficiaries: ['smallholder farmers', 'agricultural cooperatives'],
          potentialRisks: ['market concentration', 'technology barriers'],
          economicImpact: 'positive',
          socialImpact: 'highly positive',
          environmentalImpact: 'positive'
        },
        confidence: 92.7,
        metadata: {
          analysisDate: '2024-02-05',
          analyst: 'Agricultural Policy Team',
          reviewStatus: 'completed',
          publicationStatus: 'published'
        },
        version: '1.0',
        isLatest: true
      },
      {
        billId: billIds[2],
        analysisType: 'constitutional_compliance',
        result: {
          constitutionalAlignment: 'full',
          humanRightsImpact: 'positive',
          legalChallenges: 'minimal',
          implementationFeasibility: 'high',
          budgetaryImplications: 'significant'
        },
        confidence: 96.3,
        metadata: {
          analysisDate: '2023-12-01',
          analyst: 'Constitutional Law Team',
          reviewStatus: 'completed',
          publicationStatus: 'published'
        },
        version: '1.1',
        isLatest: true
      }
    ]);

    // 10. Create diverse comments and engagement
    console.log('💬 Creating comments...');
    await db.insert(comments).values([
      {
        billId: billIds[0],
        userId: userIds[1],
        content: 'The cryptocurrency framework in Section 11 requires more robust consumer protection measures. Current provisions may not adequately address the risks associated with digital asset volatility and market manipulation.',
        upvotes: 24,
        downvotes: 3,
        isVerified: true,
        isExpertComment: true,
        sentiment: 'constructive',
        confidenceScore: 92.5
      },
      {
        billId: billIds[0],
        userId: userIds[2],
        content: 'As a citizen concerned about digital rights, I appreciate the data localization requirements. However, we need stronger provisions for cross-border data transfers to ensure Kenya remains competitive in the global digital economy.',
        upvotes: 18,
        downvotes: 2,
        isVerified: true,
        sentiment: 'supportive',
        confidenceScore: 78.3
      },
      {
        billId: billIds[1],
        userId: userIds[3],
        content: 'The agricultural modernization initiatives are commendable, but we must ensure that smallholder farmers are not left behind in the technology adoption process. More support for digital literacy and affordable access to modern farming tools is needed.',
        upvotes: 31,
        downvotes: 1,
        isVerified: true,
        sentiment: 'constructive',
        confidenceScore: 89.7
      },
      {
        billId: billIds[2],
        userId: userIds[4],
        content: 'Universal healthcare access is a fundamental right. This amendment strengthens our health system, but implementation will require significant investment in rural health infrastructure and healthcare worker training.',
        upvotes: 42,
        downvotes: 4,
        isVerified: true,
        sentiment: 'supportive',
        confidenceScore: 94.1
      },
      {
        billId: billIds[3],
        userId: userIds[1],
        content: 'Climate adaptation measures are crucial for Kenya\'s future. The community resilience programs outlined in Part III align well with international best practices. However, funding mechanisms need clearer implementation timelines.',
        upvotes: 27,
        downvotes: 2,
        isVerified: true,
        isExpertComment: true,
        sentiment: 'supportive',
        confidenceScore: 91.2
      }
    ]);

    // 11. Create bill engagement records
    console.log('📈 Creating bill engagement...');
    await db.insert(billEngagement).values([
      {
        billId: billIds[0],
        userId: userIds[1],
        engagementType: 'analysis',
        engagementData: { analysisType: 'conflict_review', timeSpent: 45 },
        sessionDuration: 2700
      },
      {
        billId: billIds[0],
        userId: userIds[2],
        engagementType: 'comment',
        engagementData: { commentLength: 256, sentiment: 'supportive' },
        sessionDuration: 1200
      },
      {
        billId: billIds[1],
        userId: userIds[3],
        engagementType: 'share',
        engagementData: { platform: 'twitter', reach: 150 },
        sessionDuration: 300
      },
      {
        billId: billIds[2],
        userId: userIds[4],
        engagementType: 'bookmark',
        engagementData: { category: 'healthcare_priority' },
        sessionDuration: 180
      }
    ]);

    // 12. Create notifications
    console.log('🔔 Creating notifications...');
    await db.insert(notifications).values([
      {
        userId: userIds[0],
        type: 'system',
        title: 'Platform Analytics Update',
        message: 'Weekly platform analytics report is now available. View engagement metrics and user feedback summary.',
        priority: 'normal',
        isRead: false
      },
      {
        userId: userIds[1],
        type: 'bill_update',
        title: 'New Bill Requires Expert Review',
        message: 'The Digital Economy Enhancement Act 2024 has been flagged for expert constitutional review.',
        data: { billId: billIds[0], priority: 'high' },
        priority: 'high',
        isRead: false
      },
      {
        userId: userIds[2],
        type: 'engagement',
        title: 'Your Comment Received Recognition',
        message: 'Your analysis on the Agriculture Modernization Act has been highlighted by the platform moderators.',
        data: { billId: billIds[1], commentId: 'sample' },
        priority: 'normal',
        isRead: true,
        readAt: new Date('2024-02-20T10:30:00Z')
      },
      {
        userId: userIds[3],
        type: 'bill_status',
        title: 'Bill Status Change',
        message: 'Universal Healthcare Access Amendment Bill has moved to Presidential Assent stage.',
        data: { billId: billIds[2], newStatus: 'presidential_assent' },
        priority: 'important',
        isRead: false
      },
      {
        userId: userIds[4],
        type: 'transparency_alert',
        title: 'New Transparency Report Available',
        message: 'Monthly transparency report on legislative processes is now available for review.',
        priority: 'normal',
        isRead: false
      }
    ]);

    console.log('✅ Comprehensive seed data creation completed!');
    console.log('\n📊 Summary of created records:');
    console.log(`- Users: ${createdUsers.length}`);
    console.log(`- User Profiles: ${createdUsers.length}`);
    console.log(`- Sponsors: ${createdSponsors.length}`);
    console.log(`- Sponsor Affiliations: 12`);
    console.log(`- Bills: ${createdBills.length}`);
    console.log(`- Bill Sponsorships: 11`);
    console.log(`- Transparency Records: ${createdSponsors.length}`);
    console.log(`- Section Conflicts: 3`);
    console.log(`- Analysis Records: 3`);
    console.log(`- Comments: 5`);
    console.log(`- Engagement Records: 4`);
    console.log(`- Notifications: 5`);
    
    console.log('\n🎯 Features represented in seed data:');
    console.log('✓ Bill Sponsorship Analysis (all subtabs)');
    console.log('✓ Primary Sponsor Analysis');
    console.log('✓ Co-Sponsors Analysis'); 
    console.log('✓ Financial Network Analysis');
    console.log('✓ Methodology & Transparency');
    console.log('✓ Conflict of Interest Detection');
    console.log('✓ Stakeholder Mapping');
    console.log('✓ Expert Verification System');
    console.log('✓ Public Engagement Features');
    console.log('✓ User Profile & Authentication');
    console.log('✓ Dashboard Analytics');
    console.log('✓ Notification System');
    console.log('✓ Multi-role User Support');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

// Execute seeding if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      console.log('🌟 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seed };
