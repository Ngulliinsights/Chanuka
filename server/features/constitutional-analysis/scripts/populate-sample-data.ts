// ============================================================================
// CONSTITUTIONAL ANALYSIS - Sample Data Population Script
// ============================================================================
// Script to populate the database with sample constitutional provisions and precedents

import { db  } from '@shared/core';
import { logger  } from '@shared/core';

/**
 * Sample constitutional provisions from Kenya's 2010 Constitution
 */
const SAMPLE_PROVISIONS = [
  {
    id: 'prov-001',
    article_number: 33,
    section_number: 1,
    subsection_number: 'a',
    provision_text: 'Every person has the right to freedom of expression, which includes freedom of the press and other media, freedom to receive or impart information or ideas, freedom of artistic creativity, and academic freedom and freedom of scientific research.',
    provision_summary: 'Guarantees freedom of expression including press, media, information, artistic, academic and scientific freedom',
    keywords: ['expression', 'press', 'media', 'information', 'artistic', 'academic', 'scientific', 'freedom'],
    rights_category: 'expression',
    constitutional_chapter: 'Bill of Rights',
    enforcement_mechanisms: ['High Court jurisdiction', 'Constitutional petition'],
    related_articles: [34, 35, 36],
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'prov-002',
    article_number: 31,
    section_number: 1,
    subsection_number: null,
    provision_text: 'Privacy of the person, home, correspondence, communications and property of every person is protected.',
    provision_summary: 'Protects privacy rights of persons, homes, correspondence, communications and property',
    keywords: ['privacy', 'person', 'home', 'correspondence', 'communications', 'property', 'protected'],
    rights_category: 'privacy',
    constitutional_chapter: 'Bill of Rights',
    enforcement_mechanisms: ['High Court jurisdiction', 'Constitutional petition'],
    related_articles: [32, 33, 40],
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'prov-003',
    article_number: 32,
    section_number: 1,
    subsection_number: null,
    provision_text: 'Every person has the right to freedom of conscience, religion, thought, belief and opinion.',
    provision_summary: 'Guarantees freedom of conscience, religion, thought, belief and opinion',
    keywords: ['conscience', 'religion', 'thought', 'belief', 'opinion', 'freedom'],
    rights_category: 'religion',
    constitutional_chapter: 'Bill of Rights',
    enforcement_mechanisms: ['High Court jurisdiction', 'Constitutional petition'],
    related_articles: [33, 34],
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'prov-004',
    article_number: 50,
    section_number: 1,
    subsection_number: null,
    provision_text: 'Every person has the right to a fair hearing within a reasonable time before a court or, if appropriate, another independent and impartial tribunal or body.',
    provision_summary: 'Guarantees right to fair hearing within reasonable time before independent tribunal',
    keywords: ['fair', 'hearing', 'reasonable', 'time', 'court', 'independent', 'impartial', 'tribunal'],
    rights_category: 'due_process',
    constitutional_chapter: 'Bill of Rights',
    enforcement_mechanisms: ['High Court jurisdiction', 'Constitutional petition', 'Judicial review'],
    related_articles: [47, 48, 49],
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'prov-005',
    article_number: 40,
    section_number: 1,
    subsection_number: null,
    provision_text: 'Subject to Article 65, every person has the right, either individually or in association with others, to acquire and own property of any description in any part of Kenya.',
    provision_summary: 'Protects right to acquire and own property individually or in association with others',
    keywords: ['property', 'acquire', 'own', 'individually', 'association', 'description', 'Kenya'],
    rights_category: 'property',
    constitutional_chapter: 'Bill of Rights',
    enforcement_mechanisms: ['High Court jurisdiction', 'Constitutional petition'],
    related_articles: [65, 66, 67],
    created_at: new Date(),
    updated_at: new Date()
  }
];

/**
 * Sample legal precedents from Kenyan courts
 */
const SAMPLE_PRECEDENTS = [
  {
    id: 'prec-001',
    case_name: 'Bloggers Association of Kenya (BAKE) v Attorney General & 4 others',
    case_number: 'Petition No. 206 of 2018',
    court_level: 'high_court',
    judgment_date: new Date('2019-05-29'),
    judges: ['Justice Chacha Mwita', 'Justice Weldon Korir', 'Justice Mumbi Ngugi'],
    holding: 'Sections of the Computer Misuse and Cybercrimes Act 2018 that criminalize publication of false information are unconstitutional as they violate freedom of expression',
    facts_summary: 'Challenge to provisions of Computer Misuse and Cybercrimes Act 2018 that criminalize publication of false information online',
    legal_principles: ['Freedom of expression cannot be limited by vague and overbroad provisions', 'Criminal sanctions on speech must be narrowly tailored'],
    constitutional_provisions_cited: ['prov-001'], // Article 33 - Freedom of Expression
    citation_count: 15,
    binding_precedent: true,
    relevance_score_percentage: 95,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'prec-002',
    case_name: 'Coalition for Reform and Democracy (CORD) v Republic of Kenya',
    case_number: 'Petition No. 628 of 2014',
    court_level: 'high_court',
    judgment_date: new Date('2015-02-23'),
    judges: ['Justice George Oduya', 'Justice Mumbi Ngugi', 'Justice Weldon Korir'],
    holding: 'The Security Laws (Amendment) Act 2014 provisions limiting media freedom and requiring licensing are unconstitutional',
    facts_summary: 'Constitutional challenge to Security Laws (Amendment) Act 2014 provisions affecting media freedom and requiring media licensing',
    legal_principles: ['Media freedom is essential to democracy', 'Prior restraint on media requires compelling state interest'],
    constitutional_provisions_cited: ['prov-001'], // Article 33 - Freedom of Expression
    citation_count: 22,
    binding_precedent: true,
    relevance_score_percentage: 88,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'prec-003',
    case_name: 'Samuel Gichuru & 4 others v Republic',
    case_number: 'Criminal Appeal No. 53 of 2017',
    court_level: 'court_of_appeal',
    judgment_date: new Date('2018-07-20'),
    judges: ['Justice Roselyn Nambuye', 'Justice Patrick Kiage', 'Justice Sankale ole Kantai'],
    holding: 'Right to fair hearing includes right to adequate time to prepare defense and access to legal representation',
    facts_summary: 'Appeal challenging conviction where appellants claimed they were denied adequate time to prepare their defense',
    legal_principles: ['Fair hearing requires adequate time for preparation', 'Access to legal representation is fundamental'],
    constitutional_provisions_cited: ['prov-004'], // Article 50 - Fair Hearing
    citation_count: 18,
    binding_precedent: true,
    relevance_score_percentage: 82,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'prec-004',
    case_name: 'Trusted Society of Human Rights Alliance v Attorney General & 2 others',
    case_number: 'Petition No. 229 of 2012',
    court_level: 'high_court',
    judgment_date: new Date('2013-04-15'),
    judges: ['Justice David Majanja'],
    holding: 'Surveillance of communications without judicial oversight violates privacy rights under Article 31',
    facts_summary: 'Challenge to government surveillance programs conducted without judicial oversight or legal framework',
    legal_principles: ['Privacy rights require judicial oversight for surveillance', 'Surveillance must be proportionate and necessary'],
    constitutional_provisions_cited: ['prov-002'], // Article 31 - Privacy
    citation_count: 12,
    binding_precedent: true,
    relevance_score_percentage: 78,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'prec-005',
    case_name: 'Satrose Ayuma & 11 others v Registered Trustees of the Kenya Railways Staff Retirement Benefits Scheme & 3 others',
    case_number: 'Petition No. 65 of 2010',
    court_level: 'supreme_court',
    judgment_date: new Date('2020-12-11'),
    judges: ['Chief Justice David Maraga', 'Justice Philomena Mwilu', 'Justice Mohamed Ibrahim', 'Justice Smokin Wanjala', 'Justice Njoki Ndung\'u'],
    holding: 'Property rights include pension rights and cannot be arbitrarily interfered with by the state or private entities',
    facts_summary: 'Dispute over pension scheme benefits and whether pension rights constitute property under the Constitution',
    legal_principles: ['Pension rights are property rights protected by the Constitution', 'Property rights cannot be arbitrarily interfered with'],
    constitutional_provisions_cited: ['prov-005'], // Article 40 - Property Rights
    citation_count: 25,
    binding_precedent: true,
    relevance_score_percentage: 90,
    created_at: new Date(),
    updated_at: new Date()
  }
];

/**
 * Populate constitutional provisions
 */
async function populateProvisions(): Promise<void> {
  logger.info('Populating constitutional provisions...', { component: 'ConstitutionalAnalysis' });

  for (const provision of SAMPLE_PROVISIONS) {
    try {
      await db.execute(`
        INSERT INTO constitutional_provisions (
          id, article_number, section_number, subsection_number, provision_text,
          provision_summary, keywords, rights_category, constitutional_chapter,
          enforcement_mechanisms, related_articles, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          provision_text = excluded.provision_text,
          provision_summary = excluded.provision_summary,
          keywords = excluded.keywords,
          updated_at = excluded.updated_at
      `, [
        provision.id,
        provision.article_number,
        provision.section_number,
        provision.subsection_number,
        provision.provision_text,
        provision.provision_summary,
        JSON.stringify(provision.keywords),
        provision.rights_category,
        provision.constitutional_chapter,
        JSON.stringify(provision.enforcement_mechanisms),
        JSON.stringify(provision.related_articles),
        provision.created_at,
        provision.updated_at
      ]);

      logger.info(`✅ Inserted provision: Article ${provision.article_number}`, { component: 'ConstitutionalAnalysis' });
    } catch (error) {
      logger.error(`❌ Failed to insert provision ${provision.id}:`, error, { component: 'ConstitutionalAnalysis' });
    }
  }
}

/**
 * Populate legal precedents
 */
async function populatePrecedents(): Promise<void> {
  logger.info('Populating legal precedents...', { component: 'ConstitutionalAnalysis' });

  for (const precedent of SAMPLE_PRECEDENTS) {
    try {
      await db.execute(`
        INSERT INTO legal_precedents (
          id, case_name, case_number, court_level, judgment_date, judges,
          holding, facts_summary, legal_principles, constitutional_provisions_cited,
          citation_count, binding_precedent, relevance_score_percentage,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          holding = excluded.holding,
          facts_summary = excluded.facts_summary,
          legal_principles = excluded.legal_principles,
          citation_count = excluded.citation_count,
          relevance_score_percentage = excluded.relevance_score_percentage,
          updated_at = excluded.updated_at
      `, [
        precedent.id,
        precedent.case_name,
        precedent.case_number,
        precedent.court_level,
        precedent.judgment_date,
        JSON.stringify(precedent.judges),
        precedent.holding,
        precedent.facts_summary,
        JSON.stringify(precedent.legal_principles),
        JSON.stringify(precedent.constitutional_provisions_cited),
        precedent.citation_count,
        precedent.binding_precedent,
        precedent.relevance_score_percentage,
        precedent.created_at,
        precedent.updated_at
      ]);

      logger.info(`✅ Inserted precedent: ${precedent.case_name}`, { component: 'ConstitutionalAnalysis' });
    } catch (error) {
      logger.error(`❌ Failed to insert precedent ${precedent.id}:`, error, { component: 'ConstitutionalAnalysis' });
    }
  }
}

/**
 * Main population function
 */
export async function populateSampleData(): Promise<void> {
  try {
    logger.info('🏛️ Starting constitutional analysis sample data population...', { component: 'ConstitutionalAnalysis' });

    await populateProvisions();
    await populatePrecedents();

    logger.info('✅ Constitutional analysis sample data populated successfully!', { component: 'ConstitutionalAnalysis' });
  } catch (error) {
    logger.error('❌ Failed to populate constitutional analysis sample data:', error, { component: 'ConstitutionalAnalysis' });
    throw error;
  }
}

/**
 * Run the script if called directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  populateSampleData()
    .then(() => {
      console.log('✅ Sample data population completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Sample data population failed:', error);
      process.exit(1);
    });
}


