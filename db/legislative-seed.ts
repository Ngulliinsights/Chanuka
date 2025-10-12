import { db } from "../server/db";
import { logger } from '../utils/logger';
import {
  users, bills, sponsors, billSponsorships, billComments,
  userProfiles, analysis, sponsorAffiliations, sponsorTransparency,
  billSectionConflicts
} from "../shared/schema.js";

async function seedLegislativeData() {
  logger.info('Starting legislative data seeding...', { component: 'SimpleTool' });

  try {
    // Create sample users
    const sampleUsers = await db.insert(users).values([
      {
        email: "jane.citizen@example.com",
        passwordHash: "$2a$10$hash1", // In real app, properly hash passwords
        name: "Jane Citizen",
        role: "citizen",
        verificationStatus: "verified"
      },
      {
        email: "expert.analyst@university.edu",
        passwordHash: "$2a$10$hash2",
        name: "Dr. Sarah Analyst",
        role: "expert",
        verificationStatus: "verified"
      },
      {
        email: "admin@chanuka.platform",
        passwordHash: "$2a$10$hash3",
        name: "Platform Admin",
        role: "admin",
        verificationStatus: "verified"
      }
    ]).returning();

    console.log(`Created ${sampleUsers.length} users`);

    // Create user profiles
    await db.insert(userProfiles).values([
      {
        userId: sampleUsers[1].id,
        bio: "Constitutional law expert with 15 years experience",
        expertise: ["Constitutional Law", "Legislative Analysis", "Government Policy"],
        location: "Nairobi, Kenya",
        organization: "University of Nairobi",
        reputationScore: 850
      }
    ]);

    // Create sample sponsors
    const sampleSponsors = await db.insert(sponsors).values([
      {
        name: "Hon. Michael Wanjala",
        role: "Member of Parliament",
        party: "ODM",
        constituency: "Westlands",
        email: "m.wanjala@parliament.go.ke",
        phone: "+254700123456",
        bio: "Advocate for education reform and infrastructure development",
        conflictLevel: "low",
        transparencyScore: "85.5"
      },
      {
        name: "Sen. Grace Mutindi",
        role: "Senator",
        party: "UDA",
        constituency: "Machakos",
        email: "g.mutindi@senate.go.ke",
        phone: "+254700654321",
        bio: "Champion of women's rights and healthcare access",
        conflictLevel: "medium",
        transparencyScore: "72.3"
      },
      {
        name: "Hon. James Kiprotich",
        role: "Member of Parliament",
        party: "UDA",
        constituency: "Uasin Gishu North",
        email: "j.kiprotich@parliament.go.ke",
        bio: "Focus on agricultural policy and rural development",
        conflictLevel: "high",
        transparencyScore: "45.8"
      }
    ]).returning();

    console.log(`Created ${sampleSponsors.length} sponsors`);

    // Create sponsor affiliations
    await db.insert(sponsorAffiliations).values([
      {
        sponsorId: sampleSponsors[2].id,
        organization: "AgriCorp Kenya Ltd",
        role: "Board Member",
        type: "economic",
        conflictType: "financial",
        startDate: new Date("2020-01-01"),
        isActive: true
      }
    ]);

    // Create transparency records
    await db.insert(sponsorTransparency).values([
      {
        sponsorId: sampleSponsors[2].id,
        disclosureType: "financial_interest",
        description: "Shareholding in agricultural processing company",
        amount: "2500000.00",
        source: "Asset Declaration Form",
        dateReported: new Date("2024-12-01"),
        isVerified: true
      }
    ]);

    // Create sample bills
    const sampleBills = await db.insert(bills).values([
      {
        title: "Digital Literacy Enhancement Act 2025",
        description: "A comprehensive bill to improve digital literacy and technology access in schools across Kenya",
        content: "This bill proposes to establish digital learning centers, provide tablets to students, and train teachers in modern technology integration...",
        summary: "Aims to modernize education through technology integration and digital literacy programs",
        status: "committee",
        billNumber: "HB-2025-001",
        sponsorId: sampleUsers[0].id,
        category: "Education",
        tags: ["education", "technology", "digital-literacy", "schools"],
        complexityScore: 7,
        constitutionalConcerns: {
          "issues": ["Budget allocation requires constitutional review"],
          "severity": "medium"
        },
        stakeholderAnalysis: {
          "beneficiaries": ["Students", "Teachers", "Tech companies"],
          "opponents": ["Traditional publishers", "Budget conservatives"]
        },
        introducedDate: new Date("2025-01-15"),
        lastActionDate: new Date("2025-01-20")
      },
      {
        title: "Healthcare Access Improvement Bill 2025",
        description: "Legislation to expand healthcare coverage and improve medical facility infrastructure in rural areas",
        content: "This comprehensive healthcare bill addresses the critical need for improved medical services in underserved communities...",
        summary: "Expands healthcare access through infrastructure development and coverage improvements",
        status: "introduced",
        billNumber: "SB-2025-002",
        sponsorId: sampleUsers[0].id,
        category: "Healthcare",
        tags: ["healthcare", "rural-development", "infrastructure", "medical-access"],
        complexityScore: 9,
        constitutionalConcerns: {
          "issues": ["Right to health provisions", "County vs National government roles"],
          "severity": "low"
        },
        stakeholderAnalysis: {
          "beneficiaries": ["Rural communities", "Healthcare workers", "Medical suppliers"],
          "opponents": ["Private healthcare providers", "Insurance companies"]
        },
        introducedDate: new Date("2025-02-01"),
        lastActionDate: new Date("2025-02-01")
      },
      {
        title: "Agricultural Modernization and Support Act 2025",
        description: "Bill to provide subsidies and modern farming techniques to smallholder farmers",
        content: "This bill establishes a comprehensive framework for agricultural modernization including subsidized inputs, technical training, and market access improvements...",
        summary: "Modernizes agriculture through subsidies, training, and improved market access",
        status: "passed",
        billNumber: "HB-2025-003",
        sponsorId: sampleUsers[0].id,
        category: "Agriculture",
        tags: ["agriculture", "subsidies", "farming", "rural-economy"],
        complexityScore: 8,
        constitutionalConcerns: {
          "issues": ["Land rights considerations", "Public spending limits"],
          "severity": "high"
        },
        stakeholderAnalysis: {
          "beneficiaries": ["Small farmers", "Agricultural suppliers", "Rural communities"],
          "opponents": ["Large agribusiness", "Import companies"]
        },
        introducedDate: new Date("2024-11-01"),
        lastActionDate: new Date("2025-01-30")
      }
    ]).returning();

    console.log(`Created ${sampleBills.length} bills`);

    // Create bill sponsorships
    await db.insert(billSponsorships).values([
      {
        billId: sampleBills[0].id,
        sponsorId: sampleSponsors[0].id,
        sponsorshipType: "primary",
        sponsorshipDate: new Date("2025-01-15")
      },
      {
        billId: sampleBills[1].id,
        sponsorId: sampleSponsors[1].id,
        sponsorshipType: "primary",
        sponsorshipDate: new Date("2025-02-01")
      },
      {
        billId: sampleBills[2].id,
        sponsorId: sampleSponsors[2].id,
        sponsorshipType: "primary",
        sponsorshipDate: new Date("2024-11-01")
      },
      {
        billId: sampleBills[0].id,
        sponsorId: sampleSponsors[1].id,
        sponsorshipType: "co-sponsor",
        sponsorshipDate: new Date("2025-01-18")
      }
    ]);

    // Create bill comments
    await db.insert(billComments).values([
      {
        billId: sampleBills[0].id,
        userId: sampleUsers[0].id,
        content: "This bill has excellent potential to transform education in Kenya. The focus on digital literacy is exactly what our children need for the future.",
        commentType: "support",
        isVerified: false,
        upvotes: 12,
        downvotes: 2
      },
      {
        billId: sampleBills[0].id,
        userId: sampleUsers[1].id,
        content: "From a policy analysis perspective, this bill addresses critical infrastructure gaps. However, implementation timelines may need adjustment to ensure sustainability.",
        commentType: "analysis",
        isVerified: true,
        upvotes: 28,
        downvotes: 1
      },
      {
        billId: sampleBills[2].id,
        userId: sampleUsers[0].id,
        content: "While agricultural support is needed, the conflict of interest with the sponsor's business connections raises transparency concerns.",
        commentType: "concern",
        isVerified: false,
        upvotes: 45,
        downvotes: 8
      }
    ]);

    // Create analysis records
    await db.insert(analysis).values([
      {
        billId: sampleBills[0].id,
        analysisType: "constitutional",
        results: {
          "compliance_score": 0.85,
          "potential_conflicts": ["Budget allocation methodology"],
          "recommendations": ["Clarify funding mechanisms", "Define implementation timeline"]
        },
        confidence: "0.8500",
        modelVersion: "v2.1",
        isApproved: true,
        approvedBy: sampleUsers[1].id
      },
      {
        billId: sampleBills[2].id,
        analysisType: "stakeholder",
        results: {
          "conflict_score": 0.75,
          "affected_parties": ["Small farmers", "Agribusiness", "Taxpayers"],
          "risk_assessment": "High due to sponsor financial interests"
        },
        confidence: "0.9200",
        modelVersion: "v2.1",
        isApproved: true,
        approvedBy: sampleUsers[1].id
      }
    ]);

    // Create bill section conflicts
    await db.insert(billSectionConflicts).values([
      {
        billId: sampleBills[2].id,
        sectionNumber: "Section 4.2",
        conflictType: "conflict_of_interest",
        severity: "high",
        description: "Subsidy provisions directly benefit companies affiliated with primary sponsor",
        recommendation: "Require independent oversight committee for subsidy allocation",
        isResolved: false
      }
    ]);

    logger.info('✅ Legislative data seeding completed successfully!', { component: 'SimpleTool' });
    logger.info('Database now contains:', { component: 'SimpleTool' });
    console.log(`- ${sampleUsers.length} users`);
    console.log(`- ${sampleSponsors.length} sponsors`);
    console.log(`- ${sampleBills.length} bills`);
    logger.info('- Multiple comments, analysis records, and transparency data', { component: 'SimpleTool' });

  } catch (error) {
    logger.error('❌ Error seeding legislative data:', { component: 'SimpleTool' }, error);
    throw error;
  }
}

// Run the seed function
seedLegislativeData()
  .then(() => {
    logger.info('Seeding process completed!', { component: 'SimpleTool' });
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Seeding failed:', { component: 'SimpleTool' }, error);
    process.exit(1);
  });






