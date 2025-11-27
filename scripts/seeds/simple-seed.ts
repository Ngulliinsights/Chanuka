import * as dotenv from 'dotenv';
dotenv.config();

import { database as db } from '@shared/database/connection';
import { logger } from '@shared/core';
import * as schema from '@shared/schema';

export default async function seedSimple() {
  logger.info('🌱 Starting simple comprehensive seed process...', { component: 'Chanuka' });

  try {
    // Clear existing data in reverse dependency order
    logger.info('🧹 Clearing existing data...', { component: 'Chanuka' });
    await db.execute('DELETE FROM bill_section_conflicts');
    await db.execute('DELETE FROM sponsor_transparency');
    await db.execute('DELETE FROM bill_sponsorships');
    await db.execute('DELETE FROM sponsor_affiliations');
    await db.execute('DELETE FROM sponsors');
    await db.execute('DELETE FROM analysis');
    await db.execute('DELETE FROM notifications');
    await db.execute('DELETE FROM bill_engagement');
    await db.execute('DELETE FROM bill_comments');
    await db.execute('DELETE FROM bills');
    await db.execute('DELETE FROM user_profiles');
    await db.execute('DELETE FROM users');

    // 1. Create diverse user base
    logger.info('👥 Creating users...', { component: 'Chanuka' });
    await db.execute(`
      INSERT INTO users (username, password, email, expertise, onboarding_completed, reputation)
      VALUES 
        ('admin', '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9', 'admin@chanuka.ke', 'platform management', true, 100),
        ('analyst', '$2b$10$K9p.M9M.M9M.M9M.M9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9', 'analyst@chanuka.ke', 'constitutional law', true, 95),
        ('citizen1', '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9', 'citizen1@example.com', 'civic engagement', true, 75),
        ('activist', '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9', 'activist@example.com', 'human rights', true, 85),
        ('journalist', '$2b$10$K9p.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9M.M9', 'journalist@example.com', 'investigative journalism', true, 90);
    `);

    // Get the created user IDs
  const createdUsers = await db.execute('SELECT id FROM users ORDER BY id DESC LIMIT 5');
  const user_ids = createdUsers.rows.map((row: any) => row.id);

    // 2. Create comprehensive user profiles
    logger.info('📋 Creating user profiles...', { component: 'Chanuka' });
    await db.execute(`
      INSERT INTO user_profiles (user_id, bio, expertise, location, organization, is_public)
      VALUES 
        (${user_ids[4]}, 'System administrator ensuring platform integrity and transparency.', ARRAY['platform management', 'data governance', 'civic technology'], 'Nairobi, Kenya', 'Chanuka Platform', true),
        (${user_ids[3]}, 'Legal analyst and constitutional law expert with 15 years experience in legislative analysis.', ARRAY['constitutional law', 'legislative analysis', 'governance', 'policy research'], 'Nairobi, Kenya', 'University of Nairobi School of Law', true),
        (${user_ids[2]}, 'Concerned citizen interested in government transparency and accountability.', ARRAY['civic engagement', 'community organizing'], 'Mombasa, Kenya', 'Coastal Civic Society', true),
        (${user_ids[1]}, 'Human rights advocate working on governance and transparency issues.', ARRAY['human rights', 'governance', 'advocacy', 'transparency'], 'Kisumu, Kenya', 'Transparency International Kenya', true),
        (${user_ids[0]}, 'Investigative journalist covering governance and legislative affairs.', ARRAY['investigative journalism', 'political reporting', 'data analysis'], 'Nairobi, Kenya', 'The Standard Media Group', true);
    `);

    // 3. Create comprehensive sponsor database
    logger.info('🏛️ Creating sponsors...', { component: 'Chanuka' });
    await db.execute(`
      INSERT INTO sponsors (name, role, party, constituency, email, phone, conflict_level, financial_exposure, voting_alignment, transparency_score, bio, is_active)
      VALUES 
        ('Hon. Catherine Wambilianga', 'Member of Parliament', 'Azimio la Umoja', 'Bungoma West', 'c.wambilianga@parliament.go.ke', '+254-712-345-678', 'medium', 2500000.00, 78.5, 85.2, 'Serving her second term as MP for Bungoma West. Chair of the Public Accounts Committee with extensive experience in financial oversight.', true),
        ('Hon. David Sankok', 'Member of Parliament', 'Kenya Kwanza', 'Nominated MP', 'd.sankok@parliament.go.ke', '+254-722-456-789', 'high', 8750000.00, 65.3, 62.8, 'Nominated MP representing persons with disabilities. Strong advocate for inclusive legislation but with significant business interests.', true),
        ('Hon. Beatrice Elachi', 'Senator', 'Independent', 'Nairobi County', 'b.elachi@senate.go.ke', '+254-733-567-890', 'low', 890000.00, 92.1, 94.7, 'Former Speaker of Nairobi County Assembly, now serving as Senator. Known for transparency and good governance advocacy.', true),
        ('Hon. John Kiarie', 'Member of Parliament', 'Kenya Kwanza', 'Dagoretti South', 'j.kiarie@parliament.go.ke', '+254-744-678-901', 'medium', 3200000.00, 71.8, 76.4, 'Media personality turned politician. Active in ICT and media-related legislation with interests in the entertainment industry.', true),
        ('Hon. Joyce Emanikor', 'Member of Parliament', 'Azimio la Umoja', 'Turkana West', 'j.emanikor@parliament.go.ke', '+254-755-789-012', 'low', 450000.00, 88.9, 91.3, 'First-time MP from Turkana West. Strong focus on gender equality and pastoralist communities development.', true);
    `);

    // Get the created sponsor IDs
  const createdSponsors = await db.execute('SELECT id FROM sponsors ORDER BY id DESC LIMIT 5');
  const sponsor_ids = createdSponsors.rows.map((row: any) => row.id);

    // 4. Create comprehensive bills with varied complexity
    logger.info('📄 Creating bills...', { component: 'Chanuka' });
    await db.execute(`
      INSERT INTO bills (title, description, content, summary, status, sponsor_id, category, tags, introduced_date, last_action_date, complexity_score)
      VALUES 
        ('Digital Economy Enhancement Act 2024', 'Comprehensive legislation to modernize Kenya''s digital infrastructure, promote fintech innovation, and establish regulatory frameworks for cryptocurrency and digital assets.', 'ARRANGEMENT OF CLAUSES\n\nPART I – PRELIMINARY\n1. Short title and commencement\n2. Interpretation\n3. Objects and purpose\n4. Application\n\nPART II – DIGITAL INFRASTRUCTURE DEVELOPMENT\n5. National Digital Infrastructure Framework\n6. Broadband connectivity standards\n7. 5G network deployment requirements\n8. Digital inclusion initiatives\n9. Cybersecurity standards', 'This Act establishes a comprehensive framework for Kenya''s digital economy transformation, covering infrastructure development, fintech regulation, data governance, and digital rights protection.', 'committee', ${user_ids[0]}, 'Technology & Innovation', ARRAY['digital economy', 'fintech', 'cryptocurrency', 'data protection', 'infrastructure'], '2024-01-15', '2024-06-30', 8),
        ('Agriculture Modernization and Food Security Act 2024', 'Legislation aimed at transforming agricultural practices through technology adoption, improving food security, and supporting smallholder farmers with modern farming techniques.', 'ARRANGEMENT OF CLAUSES\n\nPART I – PRELIMINARY\n1. Short title and commencement\n2. Interpretation\n3. Objects and principles\n4. Application and scope\n\nPART II – AGRICULTURAL TRANSFORMATION\n5. National Agricultural Modernization Strategy\n6. Technology adoption frameworks\n7. Precision agriculture initiatives', 'Comprehensive agricultural reform legislation focusing on modernization, food security, farmer support, and environmental sustainability.', 'introduced', ${user_ids[1]}, 'Agriculture & Food Security', ARRAY['agriculture', 'food security', 'farmers', 'technology', 'sustainability'], '2024-02-01', '2024-08-15', 7),
        ('Universal Healthcare Access Amendment Bill 2024', 'Amendment to the Health Act to expand universal healthcare coverage, improve service delivery, and strengthen the public health system.', 'ARRANGEMENT OF CLAUSES\n\nPART I – PRELIMINARY\n1. Short title and commencement\n2. Amendment of principal Act\n3. Interpretation amendments\n\nPART II – UNIVERSAL HEALTH COVERAGE\n4. Extension of UHC benefits\n5. Service delivery standards', 'Amendment bill to strengthen universal healthcare coverage and improve health system performance in Kenya.', 'passed', ${user_ids[2]}, 'Health & Social Services', ARRAY['healthcare', 'universal coverage', 'health system', 'public health'], '2023-11-20', '2024-03-15', 6),
        ('Climate Change Adaptation and Resilience Act 2024', 'Legislation to establish comprehensive climate change adaptation strategies, enhance community resilience, and promote green economy transitions.', 'ARRANGEMENT OF CLAUSES\n\nPART I – PRELIMINARY\n1. Short title and commencement\n2. Interpretation\n3. Objects and guiding principles\n4. Application\n\nPART II – CLIMATE CHANGE FRAMEWORK\n5. National Climate Change Strategy', 'Comprehensive climate legislation establishing adaptation strategies, resilience building, and green economy transition frameworks.', 'draft', ${user_ids[3]}, 'Environment & Climate', ARRAY['climate change', 'adaptation', 'resilience', 'green economy', 'sustainability'], '2024-03-01', '2024-09-30', 9),
        ('Youth Economic Empowerment Act 2024', 'Legislation to create comprehensive youth economic empowerment programs, including entrepreneurship support, skills development, and employment creation.', 'ARRANGEMENT OF CLAUSES\n\nPART I – PRELIMINARY\n1. Short title and commencement\n2. Interpretation\n3. Objects and principles\n4. Application\n\nPART II – YOUTH EMPOWERMENT FRAMEWORK\n5. National Youth Empowerment Strategy', 'Comprehensive youth empowerment legislation covering entrepreneurship, skills development, employment creation, and economic opportunities.', 'committee', ${user_ids[4]}, 'Social Development', ARRAY['youth empowerment', 'entrepreneurship', 'employment', 'skills development'], '2024-02-15', '2024-07-30', 5);
    `);

    // Get the created bill IDs
  const createdBills = await db.execute('SELECT id FROM bills ORDER BY id DESC LIMIT 5');
  const bill_ids = createdBills.rows.map((row: any) => row.id);

    // 5. Create bill comments
    logger.info('💬 Creating comments...', { component: 'Chanuka' });
    await db.execute(`
      INSERT INTO bill_comments (bill_id, user_id, content, upvotes, downvotes, is_verified)
      VALUES 
        (${bill_ids[4]}, ${user_ids[3]}, 'The cryptocurrency framework in Section 11 requires more robust consumer protection measures. Current provisions may not adequately address the risks associated with digital asset volatility and market manipulation.', 24, 3, true),
        (${bill_ids[4]}, ${user_ids[2]}, 'As a citizen concerned about digital rights, I appreciate the focus on privacy protection in Part IV. However, the data localization requirements might create barriers for small businesses trying to compete globally.', 18, 7, false),
        (${bill_ids[3]}, ${user_ids[0]}, 'The climate-smart agriculture programs in Part II align well with Kenya''s climate commitments. Implementation will require significant coordination between national and county governments.', 15, 4, true),
        (${bill_ids[2]}, ${user_ids[1]}, 'Universal healthcare is a human right. This amendment addresses critical gaps in our current system, particularly for rural communities.', 42, 8, false),
        (${bill_ids[0]}, ${user_ids[2]}, 'As a young Kenyan, I''m hopeful about the entrepreneurship support programs. However, we need to ensure these opportunities reach youth in rural areas, not just urban centers.', 35, 2, false);
    `);

    // 6. Create engagement data
    logger.info('📈 Creating engagement data...', { component: 'Chanuka' });
    await db.execute(`
      INSERT INTO bill_engagement (bill_id, user_id, view_count, comment_count, share_count, engagement_score)
      VALUES 
        (${bill_ids[4]}, ${user_ids[0]}, 5, 1, 2, 8.5),
  (${bill_ids[4]}, ${user_ids[1]}, 8, 1, 3, 12.0),
        (${bill_ids[3]}, ${user_ids[0]}, 7, 1, 3, 11.5),
        (${bill_ids[2]}, ${user_ids[1]}, 6, 1, 2, 9.0),
        (${bill_ids[1]}, ${user_ids[2]}, 7, 1, 4, 12.0);
    `);

    // 7. Create notifications
    logger.info('🔔 Creating notifications...', { component: 'Chanuka' });
    await db.execute(`
      INSERT INTO notifications (user_id, type, title, message, related_bill_id, is_read)
      VALUES 
        (${user_ids[0]}, 'bill_update', 'Bill Status Update', 'Digital Economy Enhancement Act 2024 has moved to committee review', ${bill_ids[4]}, false),
        (${user_ids[1]}, 'comment_reply', 'New Reply to Your Comment', 'Someone replied to your comment on Agriculture Modernization Act', ${bill_ids[3]}, true),
        (${user_ids[2]}, 'bill_update', 'New Bill Published', 'Climate Change Adaptation and Resilience Act 2024 has been published for public comment', ${bill_ids[1]}, false),
        (${user_ids[3]}, 'verification_status', 'Account Verification Complete', 'Your expert verification has been approved', null, true),
        (${user_ids[4]}, 'bill_update', 'Bill Passed', 'Universal Healthcare Access Amendment Bill 2024 has been passed', ${bill_ids[2]}, false);
    `);

    logger.info('✅ Simple comprehensive seed data creation completed successfully!', { component: 'Chanuka' });
    logger.info('📊 Database now contains:', { component: 'Chanuka' });
    console.log(`   - 5 users with diverse roles`);
    console.log(`   - 5 sponsors with detailed profiles`);
    console.log(`   - 5 bills with comprehensive content`);
    console.log(`   - Multiple comment threads and engagement data`);
    console.log(`   - User notifications and interaction history`);

  } catch (error) {
    logger.error('❌ Error during seed data creation:', { component: 'Chanuka' }, error);
    throw error;
  }
}

