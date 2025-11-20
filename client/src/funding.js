/**
 * STRATEGIC FUNDRAISING INTELLIGENCE SYSTEM
 * Google Apps Script Implementation
 *
 * This script automates the relational database logic, calculated fields,
 * data validation, and conditional formatting for a comprehensive fundraising
 * intelligence platform built in Google Sheets.
 */

// ============================================================================
// CONFIGURATION AND CONSTANTS
// ============================================================================

/**
 * Define sheet names and structural constants.
 * These constants make the code maintainable and prevent errors from typos.
 */
const SHEETS = {
  FUNDERS: 'Funder Intelligence Repository',
  CONTACTS: 'Contact Relationship Intelligence',
  PIPELINE: 'Active Opportunity Pipeline',
  INTERACTIONS: 'Interaction and Cultivation Log',
  DASHBOARD: 'Portfolio Dashboard',
};

/**
 * Define column indices for each sheet.
 * Using named constants instead of magic numbers makes formulas readable.
 */
const FUNDER_COLS = {
  FUNDER_ID: 1,
  LEGAL_NAME: 2,
  FUNDER_TYPE: 3,
  HEADQUARTERS: 4,
  GEOGRAPHIC_SCOPE: 5,
  FOCUS_AREAS: 6,
  FUNDING_APPROACH: 7,
  DECISION_CULTURE: 8,
  RISK_TOLERANCE: 9,
  APPLICATION_CYCLES: 10,
  GRANT_RANGE: 11,
  DECISION_TIMELINE: 12,
  RESTRICTIONS: 13,
  RELATIONSHIP_STAGE: 14,
  LAST_INTERACTION_DATE: 15,
  LAST_INTERACTION_SUMMARY: 16,
  NEXT_CULTIVATION_ACTION: 17,
  LAST_RESEARCH_UPDATE: 18,
  INFORMATION_SOURCES: 19,
  FUNDING_TRENDS: 20,
  KEY_GRANTEES: 21,
  PERCEIVED_COMPETITORS: 22,
  ORG_ARCHAEOLOGY: 23,
  FUNDER_ARCHETYPE: 24,
  KEY_DIFFERENTIATION: 25,
  DAYS_SINCE_INTERACTION: 26,
};

const CONTACT_COLS = {
  CONTACT_ID: 1,
  FUNDER_ID: 2,
  FUNDER_NAME: 3,
  FULL_NAME: 4,
  CURRENT_TITLE: 5,
  EMAIL: 6,
  PHONE: 7,
  LINKEDIN: 8,
  CONTACT_ROLE: 9,
  DECISION_INFLUENCE: 10,
  AREAS_OF_EXPERTISE: 11,
  CONNECTION_PATHWAY: 12,
  RELATIONSHIP_QUALITY: 13,
  QUALITY_JUSTIFICATION: 14,
  LAST_INTERACTION_DATE: 15,
  LAST_INTERACTION_TYPE: 16,
  LAST_INTERACTION_SUMMARY: 17,
  RELATIONSHIP_TRAJECTORY: 18,
  PERSONAL_BACKGROUND: 19,
  COMMUNICATION_STYLE: 20,
  LINKED_ARCHETYPE: 21,
  ARCHETYPE_MESSAGING: 22,
  THEIR_PRIORITIES: 23,
  NON_MONETARY_VALUE: 24,
  NEXT_TOUCHPOINT_DATE: 25,
  NEXT_TOUCHPOINT_PURPOSE: 26,
  CULTIVATION_STRATEGY: 27,
  DAYS_SINCE_INTERACTION: 28,
};

const PIPELINE_COLS = {
  OPPORTUNITY_ID: 1,
  FUNDER_ID: 2,
  FUNDER_NAME: 3,
  OPPORTUNITY_NAME: 4,
  FUNDING_MECHANISM: 5,
  FOCUS_AREA: 6,
  GEOGRAPHIC_SCOPE: 7,
  PROPOSED_AMOUNT: 8,
  PROPOSED_DURATION: 9,
  TOTAL_PROJECT_BUDGET: 10,
  APPLICATION_DEADLINE: 11,
  APPLICATION_TYPE: 12,
  ESTIMATED_DEV_HOURS: 13,
  DEVELOPMENT_COMPLEXITY: 14,
  CALCULATED_START_DATE: 15,
  CALCULATED_SUBMISSION_WEEK: 16,
  APPLICATION_STATUS: 17,
  STATUS_CHANGE_DATE: 18,
  SUBMITTED_DATE: 19,
  STRATEGIC_ALIGNMENT_SCORE: 20,
  STRATEGIC_ALIGNMENT_RATIONALE: 21,
  COMPETITIVE_PROBABILITY: 22,
  COMPETITIVE_ANALYSIS: 23,
  QUANTITATIVE_EXPECTED_VALUE: 24,
  QUALITATIVE_VALUE: 25,
  OPPORTUNITY_COST: 26,
  GO_NOGO_DECISION: 27,
  DECISION_DATE: 28,
  DECISION_MAKER: 29,
  DECISION_RATIONALE: 30,
  DECISION_REVIEW_DATE: 31,
  REQUIRED_PARTNERS: 32,
  PARTNERSHIP_STATUS: 33,
  PARTNERSHIP_COMPLEXITY: 34,
  OUTCOME_DATE: 35,
  OUTCOME_DETAILS: 36,
  LESSONS_LEARNED: 37,
};

const INTERACTION_COLS = {
  LOG_ID: 1,
  FUNDER_ID: 2,
  FUNDER_NAME: 3,
  CONTACT_ID: 4,
  CONTACT_NAME: 5,
  INTERACTION_DATE: 6,
  INTERACTION_TYPE: 7,
  INITIATOR: 8,
  OUR_PARTICIPANTS: 9,
  THEIR_PARTICIPANTS: 10,
  DURATION: 11,
  PURPOSE: 12,
  DISCUSSION_TOPICS: 13,
  KEY_INSIGHTS: 14,
  ACTION_ITEMS: 15,
  RELATIONSHIP_TEMPERATURE: 16,
  PLANNED_FOLLOWUP_DATE: 17,
  PLANNED_FOLLOWUP_ACTION: 18,
  FOLLOWUP_COMPLETED: 19,
};

/**
 * Define enumerated values for dropdowns.
 * These lists ensure consistent terminology across all data entry.
 */
const ENUMS = {
  FUNDER_TYPES: [
    'Private Foundation',
    'Community Foundation',
    'Corporate Foundation',
    'Government Agency',
    'Bilateral Development Organization',
    'Multilateral Development Organization',
    'Corporate Giving Program',
    'Impact Investor',
  ],

  RELATIONSHIP_STAGES: [
    'Identified',
    'Prospect',
    'Cultivation',
    'Proposal Stage',
    'Active Partner',
    'Past Partner',
    'Inactive',
  ],

  FUNDER_ARCHETYPES: [
    'Systems Thinker',
    'Mission-Driven Advocate',
    'Pragmatic Bureaucrat',
    'Community Champion',
    'Impact Investor',
    'Innovation Enthusiast',
    'Risk Manager',
    'Partnership Builder',
  ],

  CONTACT_ROLES: [
    'Program Officer',
    'Senior Leadership',
    'Board Member',
    'Grants Committee Member',
    'External Advisor or Consultant',
    'Administrative or Operations Staff',
    'Other',
  ],

  INTERACTION_TYPES: [
    'Email Exchange',
    'Phone Call',
    'Video Meeting',
    'In-Person Meeting',
    'Conference or Event Encounter',
    'Site Visit to Our Organization',
    'Site Visit to Funder Organization',
    'Introduction by Third Party',
    'Other',
  ],

  RELATIONSHIP_TRAJECTORY: ['Strengthening', 'Maintaining', 'Weakening', 'Unknown'],

  FUNDING_MECHANISMS: [
    'Unrestricted Operating Support',
    'Project-Specific Grant',
    'Multi-Year Core Support',
    'Challenge Grant or Match',
    'Capital Campaign',
    'Research Grant',
    'Fellowship or Scholarship',
    'Prize or Competition',
    'Contract for Services',
    'Social Investment or Loan',
    'Other',
  ],

  APPLICATION_TYPES: [
    'Letter of Inquiry (LOI)',
    'Full Proposal Single-Stage',
    'Multi-Stage Competition (LOI then Proposal)',
    'Pre-Proposal Required Consultation',
    'Invitation Only',
    'Proactive Unsolicited Proposal',
    'Other',
  ],

  DEVELOPMENT_COMPLEXITY: ['Simple', 'Moderate', 'Complex', 'Highly Complex'],

  APPLICATION_STATUS: [
    'Under Evaluation',
    'Go Decision Approved',
    'In Development',
    'Internal Review',
    'Finalization',
    'Submitted',
    'Under Funder Review',
    'Invited to Next Stage',
    'Declined',
    'Awarded',
    'Withdrawn',
    'Deferred',
  ],

  GO_NOGO_DECISIONS: [
    'Pursue Actively',
    'Pursue if Capacity Allows',
    'Defer to Future Cycle',
    'Decline to Pursue',
  ],

  PARTNERSHIP_STATUS: [
    'No Partners Required',
    'Partners Identified and Committed',
    'Partner Conversations Underway',
    'Partners Needed but Not Yet Identified',
    'Partnership Challenges Present',
  ],

  INITIATORS: ['We Initiated', 'They Initiated', 'Mutual'],

  RELATIONSHIP_TEMPERATURE: ['Very Positive', 'Positive', 'Neutral', 'Concerning', 'Negative'],
};

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

/**
 * Creates the menu item when the spreadsheet opens.
 * This provides users with easy access to setup and maintenance functions.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Fundraising System')
    .addItem('Initialize System', 'initializeSystem')
    .addItem('Refresh All Calculations', 'refreshAllCalculations')
    .addItem('Update Conditional Formatting', 'applyAllConditionalFormatting')
    .addItem('Validate Data Integrity', 'validateDataIntegrity')
    .addSeparator()
    .addItem('Create Dashboard', 'createDashboard')
    .addToUi();
}

/**
 * Master initialization function that sets up the entire system.
 * Run this once when first implementing the system.
 */
function initializeSystem() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Initialize Fundraising System',
    'This will set up all sheets, headers, formulas, and validation rules. ' +
      'If sheets already exist, this will update their structure. Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  try {
    createOrUpdateSheets();
    setupNamedRanges();
    setupDataValidation();
    applyAllConditionalFormatting();
    createDashboard();

    ui.alert(
      'System Initialized',
      'The fundraising intelligence system has been successfully set up. ' +
        'You can now begin entering data.',
      ui.ButtonSet.OK
    );
  } catch (error) {
    ui.alert(
      'Error',
      'An error occurred during initialization: ' + error.toString(),
      ui.ButtonSet.OK
    );
  }
}

/**
 * Creates or updates all sheet structures with proper headers and formatting.
 */
function createOrUpdateSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create Funder Intelligence Repository
  createFunderSheet(ss);

  // Create Contact Relationship Intelligence
  createContactSheet(ss);

  // Create Active Opportunity Pipeline
  createPipelineSheet(ss);

  // Create Interaction and Cultivation Log
  createInteractionSheet(ss);

  // Dashboard will be created separately
}

/**
 * Creates and formats the Funder Intelligence Repository sheet.
 */
function createFunderSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.FUNDERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.FUNDERS);
  }

  // Define headers with descriptions
  const headers = [
    [
      'Funder ID',
      'Legal Name',
      'Funder Type',
      'Headquarters Location',
      'Geographic Scope',
      'Primary Focus Areas',
      'Funding Approach',
      'Decision-Making Culture',
      'Risk Tolerance',
      'Application Cycles',
      'Typical Grant Range',
      'Expected Decision Timeline',
      'Restrictions and Requirements',
      'Relationship Stage',
      'Last Interaction Date',
      'Last Interaction Summary',
      'Next Cultivation Action',
      'Last Research Update',
      'Information Sources',
      'Funding Trends Analysis',
      'Key Grantees and Partners',
      'Perceived Competitors',
      'Org Archaeology Insight',
      'Funder Archetype',
      'Key Differentiation',
      'Days Since Last Interaction',
    ],
  ];

  // Set headers
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);

  // Format header row
  sheet
    .getRange(1, 1, 1, headers[0].length)
    .setBackground('#4A86E8')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setWrap(true);

  // Freeze header row
  sheet.setFrozenRows(1);

  // Set column widths for readability
  sheet.setColumnWidth(1, 100); // Funder ID
  sheet.setColumnWidth(2, 200); // Legal Name
  sheet.setColumnWidth(3, 150); // Funder Type

  // Add formula for Days Since Last Interaction in column 26
  if (sheet.getLastRow() > 1) {
    const formulaRange = sheet.getRange(
      2,
      FUNDER_COLS.DAYS_SINCE_INTERACTION,
      sheet.getLastRow() - 1
    );
    formulaRange.setFormula(`=IF(ISBLANK(O2),"",TODAY()-O2)`);
  }

  // Apply alternating row colors
  sheet
    .getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), headers[0].length)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
}

/**
 * Creates and formats the Contact Relationship Intelligence sheet.
 */
function createContactSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.CONTACTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.CONTACTS);
  }

  const headers = [
    [
      'Contact ID',
      'Funder ID',
      'Funder Name',
      'Full Name',
      'Current Title',
      'Email Address',
      'Phone Number',
      'LinkedIn URL',
      'Contact Role',
      'Decision Influence',
      'Areas of Expertise and Interest',
      'Connection Pathway',
      'Relationship Quality Score',
      'Relationship Quality Justification',
      'Last Interaction Date',
      'Last Interaction Type',
      'Last Interaction Summary',
      'Relationship Trajectory',
      'Personal Background Notes',
      'Communication Style Preferences',
      'Linked Archetype',
      'Archetype Messaging Cue',
      'Their Priorities and Concerns',
      'Non-Monetary Value',
      'Next Planned Touchpoint',
      'Next Touchpoint Purpose',
      'Cultivation Strategy',
      'Days Since Last Interaction',
    ],
  ];

  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);

  sheet
    .getRange(1, 1, 1, headers[0].length)
    .setBackground('#6AA84F')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setWrap(true);

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 150);

  // Add VLOOKUP formula for Funder Name in column 3
  if (sheet.getLastRow() > 1) {
    const funderNameFormula = `=IFERROR(VLOOKUP(B2,'${SHEETS.FUNDERS}'!A:B,2,FALSE),"")`;
    sheet.getRange(2, CONTACT_COLS.FUNDER_NAME).setFormula(funderNameFormula);
  }

  // Add VLOOKUP formula for Linked Archetype in column 21
  if (sheet.getLastRow() > 1) {
    const archetypeFormula = `=IFERROR(VLOOKUP(B2,'${SHEETS.FUNDERS}'!A:X,24,FALSE),"Archetype Not Assigned")`;
    sheet.getRange(2, CONTACT_COLS.LINKED_ARCHETYPE).setFormula(archetypeFormula);
  }

  // Add formula for Days Since Last Interaction
  if (sheet.getLastRow() > 1) {
    sheet
      .getRange(2, CONTACT_COLS.DAYS_SINCE_INTERACTION)
      .setFormula(`=IF(ISBLANK(O2),"",TODAY()-O2)`);
  }

  sheet
    .getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), headers[0].length)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
}

/**
 * Creates and formats the Active Opportunity Pipeline sheet.
 */
function createPipelineSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.PIPELINE);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.PIPELINE);
  }

  const headers = [
    [
      'Opportunity ID',
      'Funder ID',
      'Funder Name',
      'Opportunity Name',
      'Funding Mechanism Type',
      'Focus Area Alignment',
      'Geographic Scope of Work',
      'Proposed Grant Amount',
      'Proposed Grant Duration',
      'Total Project Budget',
      'Application Deadline',
      'Application Type',
      'Estimated Development Hours',
      'Development Complexity',
      'Calculated Start Date',
      'Calculated Submission Week',
      'Application Status',
      'Status Change Date',
      'Application Submitted Date',
      'Strategic Alignment Score',
      'Strategic Alignment Rationale',
      'Competitive Probability Score',
      'Competitive Analysis Narrative',
      'Quantitative Expected Value',
      'Qualitative Strategic Value',
      'Opportunity Cost Analysis',
      'Go/No-Go Decision',
      'Go/No-Go Decision Date',
      'Go/No-Go Decision Maker',
      'Go/No-Go Rationale',
      'Decision Review Date',
      'Required Partners',
      'Partnership Status',
      'Partnership Coordination Complexity',
      'Outcome Date',
      'Outcome Details',
      'Lessons Learned From Outcome',
    ],
  ];

  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);

  sheet
    .getRange(1, 1, 1, headers[0].length)
    .setBackground('#E69138')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setWrap(true);

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 200);

  sheet
    .getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), headers[0].length)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
}

/**
 * Creates and formats the Interaction and Cultivation Log sheet.
 */
function createInteractionSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.INTERACTIONS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.INTERACTIONS);
  }

  const headers = [
    [
      'Log ID',
      'Funder ID',
      'Funder Name',
      'Contact ID',
      'Contact Name',
      'Interaction Date',
      'Interaction Type',
      'Interaction Initiator',
      'Our Participants',
      'Their Participants',
      'Interaction Duration',
      'Interaction Purpose',
      'Discussion Topics',
      'Key Insights Learned',
      'Action Items and Commitments',
      'Relationship Temperature',
      'Planned Follow-Up Date',
      'Planned Follow-Up Action',
      'Follow-Up Completed',
    ],
  ];

  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);

  sheet
    .getRange(1, 1, 1, headers[0].length)
    .setBackground('#A64D79')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setWrap(true);

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 200);

  sheet
    .getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), headers[0].length)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
}

// ============================================================================
// NAMED RANGES AND DATA VALIDATION
// ============================================================================

/**
 * Sets up named ranges for all enumerated lists.
 * Named ranges make formulas more readable and validation rules maintainable.
 */
function setupNamedRanges() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create a hidden sheet for reference data
  let refSheet = ss.getSheetByName('_ReferenceData');
  if (!refSheet) {
    refSheet = ss.insertSheet('_ReferenceData');
    refSheet.hideSheet();
  }

  // Clear existing content
  refSheet.clear();

  let col = 1;

  // Create named range for each enum
  for (const [enumName, values] of Object.entries(ENUMS)) {
    const rangeName = enumName.charAt(0) + enumName.slice(1).toLowerCase();
    const range = refSheet.getRange(1, col, values.length, 1);
    range.setValues(values.map(v => [v]));

    try {
      ss.setNamedRange(rangeName, range);
    } catch (e) {
      // Range might already exist, remove and recreate
      const existingRange = ss.getNamedRanges().find(r => r.getName() === rangeName);
      if (existingRange) {
        existingRange.remove();
      }
      ss.setNamedRange(rangeName, range);
    }

    col++;
  }

  // Create dynamic named ranges for Funder IDs and Contact IDs
  const funderSheet = ss.getSheetByName(SHEETS.FUNDERS);
  if (funderSheet && funderSheet.getLastRow() > 1) {
    const funderIdRange = funderSheet.getRange(
      2,
      FUNDER_COLS.FUNDER_ID,
      funderSheet.getLastRow() - 1,
      1
    );
    try {
      ss.setNamedRange('FunderIDList', funderIdRange);
    } catch (e) {
      const existing = ss.getNamedRanges().find(r => r.getName() === 'FunderIDList');
      if (existing) existing.remove();
      ss.setNamedRange('FunderIDList', funderIdRange);
    }
  }

  const contactSheet = ss.getSheetByName(SHEETS.CONTACTS);
  if (contactSheet && contactSheet.getLastRow() > 1) {
    const contactIdRange = contactSheet.getRange(
      2,
      CONTACT_COLS.CONTACT_ID,
      contactSheet.getLastRow() - 1,
      1
    );
    try {
      ss.setNamedRange('ContactIDList', contactIdRange);
    } catch (e) {
      const existing = ss.getNamedRanges().find(r => r.getName() === 'ContactIDList');
      if (existing) existing.remove();
      ss.setNamedRange('ContactIDList', contactIdRange);
    }
  }
}

/**
 * Applies data validation rules to enforce data quality.
 */
function setupDataValidation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Funder Sheet Validations
  setupFunderValidation(ss);

  // Contact Sheet Validations
  setupContactValidation(ss);

  // Pipeline Sheet Validations
  setupPipelineValidation(ss);

  // Interaction Sheet Validations
  setupInteractionValidation(ss);
}

/**
 * Sets up validation rules for the Funder sheet.
 */
function setupFunderValidation(ss) {
  const sheet = ss.getSheetByName(SHEETS.FUNDERS);
  if (!sheet || sheet.getLastRow() < 2) return;

  const dataRange = sheet.getRange(2, 1, sheet.getMaxRows() - 1, sheet.getLastColumn());

  // Funder Type dropdown
  const funderTypeRange = sheet.getRange(2, FUNDER_COLS.FUNDER_TYPE, sheet.getMaxRows() - 1, 1);
  const funderTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.FUNDER_TYPES, true)
    .setAllowInvalid(false)
    .build();
  funderTypeRange.setDataValidation(funderTypeRule);

  // Relationship Stage dropdown
  const stageRange = sheet.getRange(2, FUNDER_COLS.RELATIONSHIP_STAGE, sheet.getMaxRows() - 1, 1);
  const stageRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.RELATIONSHIP_STAGES, true)
    .setAllowInvalid(false)
    .build();
  stageRange.setDataValidation(stageRule);

  // Funder Archetype dropdown
  const archetypeRange = sheet.getRange(2, FUNDER_COLS.FUNDER_ARCHETYPE, sheet.getMaxRows() - 1, 1);
  const archetypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.FUNDER_ARCHETYPES, true)
    .setAllowInvalid(false)
    .build();
  archetypeRange.setDataValidation(archetypeRule);

  // Date validation for Last Interaction Date and Last Research Update
  const lastInteractionRange = sheet.getRange(
    2,
    FUNDER_COLS.LAST_INTERACTION_DATE,
    sheet.getMaxRows() - 1,
    1
  );
  const dateRule = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build();
  lastInteractionRange.setDataValidation(dateRule);

  const lastResearchRange = sheet.getRange(
    2,
    FUNDER_COLS.LAST_RESEARCH_UPDATE,
    sheet.getMaxRows() - 1,
    1
  );
  lastResearchRange.setDataValidation(dateRule);
}

/**
 * Sets up validation rules for the Contact sheet.
 */
function setupContactValidation(ss) {
  const sheet = ss.getSheetByName(SHEETS.CONTACTS);
  if (!sheet || sheet.getLastRow() < 2) return;

  // Contact Role dropdown
  const roleRange = sheet.getRange(2, CONTACT_COLS.CONTACT_ROLE, sheet.getMaxRows() - 1, 1);
  const roleRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.CONTACT_ROLES, true)
    .setAllowInvalid(false)
    .build();
  roleRange.setDataValidation(roleRule);

  // Relationship Quality Score (1-10)
  const qualityRange = sheet.getRange(
    2,
    CONTACT_COLS.RELATIONSHIP_QUALITY,
    sheet.getMaxRows() - 1,
    1
  );
  const qualityRule = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 10)
    .setAllowInvalid(false)
    .setHelpText('Enter a score between 1 and 10')
    .build();
  qualityRange.setDataValidation(qualityRule);

  // Interaction Type dropdown
  const typeRange = sheet.getRange(
    2,
    CONTACT_COLS.LAST_INTERACTION_TYPE,
    sheet.getMaxRows() - 1,
    1
  );
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.INTERACTION_TYPES, true)
    .setAllowInvalid(false)
    .build();
  typeRange.setDataValidation(typeRule);

  // Relationship Trajectory dropdown
  const trajectoryRange = sheet.getRange(
    2,
    CONTACT_COLS.RELATIONSHIP_TRAJECTORY,
    sheet.getMaxRows() - 1,
    1
  );
  const trajectoryRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.RELATIONSHIP_TRAJECTORY, true)
    .setAllowInvalid(false)
    .build();
  trajectoryRange.setDataValidation(trajectoryRule);
}

/**
 * Sets up validation rules for the Pipeline sheet.
 */
/**
 * STRATEGIC FUNDRAISING INTELLIGENCE SYSTEM - COMPLETE IMPLEMENTATION
 * Google Apps Script for Google Sheets
 *
 * This script completes the automation for your fundraising intelligence platform,
 * including validation rules, calculated fields, conditional formatting, and dashboard generation.
 */

// ============================================================================
// PIPELINE VALIDATION CONTINUATION
// ============================================================================

/**
 * Sets up validation rules for the Pipeline sheet.
 * This ensures data quality for all opportunity tracking fields.
 */
function setupPipelineValidation(ss) {
  const sheet = ss.getSheetByName(SHEETS.PIPELINE);
  if (!sheet || sheet.getLastRow() < 2) return;

  // Funding Mechanism dropdown
  const mechanismRange = sheet.getRange(
    2,
    PIPELINE_COLS.FUNDING_MECHANISM,
    sheet.getMaxRows() - 1,
    1
  );
  const mechanismRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.FUNDING_MECHANISMS, true)
    .setAllowInvalid(false)
    .build();
  mechanismRange.setDataValidation(mechanismRule);

  // Application Type dropdown
  const appTypeRange = sheet.getRange(2, PIPELINE_COLS.APPLICATION_TYPE, sheet.getMaxRows() - 1, 1);
  const appTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.APPLICATION_TYPES, true)
    .setAllowInvalid(false)
    .build();
  appTypeRange.setDataValidation(appTypeRule);

  // Development Complexity dropdown
  const complexityRange = sheet.getRange(
    2,
    PIPELINE_COLS.DEVELOPMENT_COMPLEXITY,
    sheet.getMaxRows() - 1,
    1
  );
  const complexityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.DEVELOPMENT_COMPLEXITY, true)
    .setAllowInvalid(false)
    .build();
  complexityRange.setDataValidation(complexityRule);

  // Application Status dropdown
  const statusRange = sheet.getRange(
    2,
    PIPELINE_COLS.APPLICATION_STATUS,
    sheet.getMaxRows() - 1,
    1
  );
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.APPLICATION_STATUS, true)
    .setAllowInvalid(false)
    .build();
  statusRange.setDataValidation(statusRule);

  // Strategic Alignment Score (1-10)
  const alignmentRange = sheet.getRange(
    2,
    PIPELINE_COLS.STRATEGIC_ALIGNMENT_SCORE,
    sheet.getMaxRows() - 1,
    1
  );
  const scoreRule = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 10)
    .setAllowInvalid(false)
    .setHelpText('Enter a score between 1 and 10')
    .build();
  alignmentRange.setDataValidation(scoreRule);

  // Competitive Probability Score (1-10)
  const probabilityRange = sheet.getRange(
    2,
    PIPELINE_COLS.COMPETITIVE_PROBABILITY,
    sheet.getMaxRows() - 1,
    1
  );
  probabilityRange.setDataValidation(scoreRule);

  // Go/No-Go Decision dropdown
  const decisionRange = sheet.getRange(
    2,
    PIPELINE_COLS.GO_NOGO_DECISION,
    sheet.getMaxRows() - 1,
    1
  );
  const decisionRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.GO_NOGO_DECISIONS, true)
    .setAllowInvalid(false)
    .build();
  decisionRange.setDataValidation(decisionRule);

  // Partnership Status dropdown
  const partnerRange = sheet.getRange(
    2,
    PIPELINE_COLS.PARTNERSHIP_STATUS,
    sheet.getMaxRows() - 1,
    1
  );
  const partnerRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.PARTNERSHIP_STATUS, true)
    .setAllowInvalid(false)
    .build();
  partnerRange.setDataValidation(partnerRule);

  // Application Deadline cannot be in the past for new records
  const deadlineRange = sheet.getRange(
    2,
    PIPELINE_COLS.APPLICATION_DEADLINE,
    sheet.getMaxRows() - 1,
    1
  );
  const dateRule = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build();
  deadlineRange.setDataValidation(dateRule);
}

/**
 * Sets up validation rules for the Interaction sheet.
 */
function setupInteractionValidation(ss) {
  const sheet = ss.getSheetByName(SHEETS.INTERACTIONS);
  if (!sheet || sheet.getLastRow() < 2) return;

  // Interaction Type dropdown
  const typeRange = sheet.getRange(2, INTERACTION_COLS.INTERACTION_TYPE, sheet.getMaxRows() - 1, 1);
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.INTERACTION_TYPES, true)
    .setAllowInvalid(false)
    .build();
  typeRange.setDataValidation(typeRule);

  // Initiator dropdown
  const initiatorRange = sheet.getRange(2, INTERACTION_COLS.INITIATOR, sheet.getMaxRows() - 1, 1);
  const initiatorRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.INITIATORS, true)
    .setAllowInvalid(false)
    .build();
  initiatorRange.setDataValidation(initiatorRule);

  // Relationship Temperature dropdown
  const tempRange = sheet.getRange(
    2,
    INTERACTION_COLS.RELATIONSHIP_TEMPERATURE,
    sheet.getMaxRows() - 1,
    1
  );
  const tempRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ENUMS.RELATIONSHIP_TEMPERATURE, true)
    .setAllowInvalid(false)
    .build();
  tempRange.setDataValidation(tempRule);

  // Follow-Up Completed checkbox
  const followupRange = sheet.getRange(
    2,
    INTERACTION_COLS.FOLLOWUP_COMPLETED,
    sheet.getMaxRows() - 1,
    1
  );
  const checkboxRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  followupRange.setDataValidation(checkboxRule);
}

// ============================================================================
// CALCULATED FIELDS AND FORMULAS
// ============================================================================

/**
 * Refreshes all calculated fields across all sheets.
 * This function updates VLOOKUP formulas, date calculations, and expected value computations.
 */
function refreshAllCalculations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  refreshFunderCalculations(ss);
  refreshContactCalculations(ss);
  refreshPipelineCalculations(ss);
  refreshInteractionCalculations(ss);

  SpreadsheetApp.getUi().alert('All calculations have been refreshed successfully.');
}

/**
 * Updates calculated fields in the Funder sheet.
 */
function refreshFunderCalculations(ss) {
  const sheet = ss.getSheetByName(SHEETS.FUNDERS);
  if (!sheet || sheet.getLastRow() < 2) return;

  const lastRow = sheet.getLastRow();

  // Days Since Last Interaction formula
  const daysFormula = sheet.getRange(2, FUNDER_COLS.DAYS_SINCE_INTERACTION);
  daysFormula.setFormula(`=IF(ISBLANK(O2),"",TODAY()-O2)`);

  // Copy formula down to all rows
  if (lastRow > 2) {
    daysFormula.copyTo(sheet.getRange(3, FUNDER_COLS.DAYS_SINCE_INTERACTION, lastRow - 2, 1));
  }
}

/**
 * Updates calculated fields in the Contact sheet.
 */
function refreshContactCalculations(ss) {
  const sheet = ss.getSheetByName(SHEETS.CONTACTS);
  if (!sheet || sheet.getLastRow() < 2) return;

  const lastRow = sheet.getLastRow();

  // Funder Name VLOOKUP formula
  const funderNameCell = sheet.getRange(2, CONTACT_COLS.FUNDER_NAME);
  funderNameCell.setFormula(`=IFERROR(VLOOKUP(B2,'${SHEETS.FUNDERS}'!A:B,2,FALSE),"")`);

  // Linked Archetype VLOOKUP formula
  const archetypeCell = sheet.getRange(2, CONTACT_COLS.LINKED_ARCHETYPE);
  archetypeCell.setFormula(
    `=IFERROR(VLOOKUP(B2,'${SHEETS.FUNDERS}'!A:X,24,FALSE),"Archetype Not Assigned")`
  );

  // Days Since Last Interaction formula
  const daysCell = sheet.getRange(2, CONTACT_COLS.DAYS_SINCE_INTERACTION);
  daysCell.setFormula(`=IF(ISBLANK(O2),"",TODAY()-O2)`);

  // Copy formulas down to all rows
  if (lastRow > 2) {
    funderNameCell.copyTo(sheet.getRange(3, CONTACT_COLS.FUNDER_NAME, lastRow - 2, 1));
    archetypeCell.copyTo(sheet.getRange(3, CONTACT_COLS.LINKED_ARCHETYPE, lastRow - 2, 1));
    daysCell.copyTo(sheet.getRange(3, CONTACT_COLS.DAYS_SINCE_INTERACTION, lastRow - 2, 1));
  }
}

/**
 * Updates calculated fields in the Pipeline sheet.
 * This implements the sophisticated timeline calculation algorithm.
 */
function refreshPipelineCalculations(ss) {
  const sheet = ss.getSheetByName(SHEETS.PIPELINE);
  if (!sheet || sheet.getLastRow() < 2) return;

  const lastRow = sheet.getLastRow();

  // Funder Name VLOOKUP
  const funderNameCell = sheet.getRange(2, PIPELINE_COLS.FUNDER_NAME);
  funderNameCell.setFormula(`=IFERROR(VLOOKUP(B2,'${SHEETS.FUNDERS}'!A:B,2,FALSE),"")`);

  // Calculated Start Date with complexity-based algorithm
  const startDateCell = sheet.getRange(2, PIPELINE_COLS.CALCULATED_START_DATE);
  const startDateFormula = `=IF(ISBLANK(K2),"",K2-(IF(N2="Simple",14,IF(N2="Moderate",28,IF(N2="Complex",42,60)))+IF(L2="Letter of Inquiry (LOI)",-4,IF(L2="Multi-Stage Competition (LOI then Proposal)",6,IF(L2="Invitation Only",-3,0)))+7))`;
  startDateCell.setFormula(startDateFormula);

  // Calculated Submission Week
  const weekCell = sheet.getRange(2, PIPELINE_COLS.CALCULATED_SUBMISSION_WEEK);
  weekCell.setFormula(`=IF(ISBLANK(K2),"",WEEKNUM(K2))`);

  // Quantitative Expected Value
  const expectedValueCell = sheet.getRange(2, PIPELINE_COLS.QUANTITATIVE_EXPECTED_VALUE);
  expectedValueCell.setFormula(`=IF(OR(ISBLANK(H2),ISBLANK(V2)),"",H2*(V2/10))`);

  // Copy formulas down to all rows
  if (lastRow > 2) {
    funderNameCell.copyTo(sheet.getRange(3, PIPELINE_COLS.FUNDER_NAME, lastRow - 2, 1));
    startDateCell.copyTo(sheet.getRange(3, PIPELINE_COLS.CALCULATED_START_DATE, lastRow - 2, 1));
    weekCell.copyTo(sheet.getRange(3, PIPELINE_COLS.CALCULATED_SUBMISSION_WEEK, lastRow - 2, 1));
    expectedValueCell.copyTo(
      sheet.getRange(3, PIPELINE_COLS.QUANTITATIVE_EXPECTED_VALUE, lastRow - 2, 1)
    );
  }
}

/**
 * Updates calculated fields in the Interaction sheet.
 */
function refreshInteractionCalculations(ss) {
  const sheet = ss.getSheetByName(SHEETS.INTERACTIONS);
  if (!sheet || sheet.getLastRow() < 2) return;

  const lastRow = sheet.getLastRow();

  // Funder Name VLOOKUP
  const funderNameCell = sheet.getRange(2, INTERACTION_COLS.FUNDER_NAME);
  funderNameCell.setFormula(`=IFERROR(VLOOKUP(B2,'${SHEETS.FUNDERS}'!A:B,2,FALSE),"")`);

  // Contact Name VLOOKUP
  const contactNameCell = sheet.getRange(2, INTERACTION_COLS.CONTACT_NAME);
  contactNameCell.setFormula(`=IFERROR(VLOOKUP(D2,'${SHEETS.CONTACTS}'!A:D,4,FALSE),"")`);

  // Copy formulas down
  if (lastRow > 2) {
    funderNameCell.copyTo(sheet.getRange(3, INTERACTION_COLS.FUNDER_NAME, lastRow - 2, 1));
    contactNameCell.copyTo(sheet.getRange(3, INTERACTION_COLS.CONTACT_NAME, lastRow - 2, 1));
  }
}

// ============================================================================
// CONDITIONAL FORMATTING
// ============================================================================

/**
 * Applies all conditional formatting rules to create visual alerts.
 * This transforms data into actionable intelligence through color coding.
 */
function applyAllConditionalFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  applyFunderConditionalFormatting(ss);
  applyContactConditionalFormatting(ss);
  applyPipelineConditionalFormatting(ss);

  SpreadsheetApp.getUi().alert('Conditional formatting has been applied successfully.');
}

/**
 * Applies conditional formatting to the Funder sheet.
 * Highlights relationship neglect and missing strategic intelligence.
 */
function applyFunderConditionalFormatting(ss) {
  const sheet = ss.getSheetByName(SHEETS.FUNDERS);
  if (!sheet || sheet.getLastRow() < 2) return;

  const dataRange = sheet.getRange(2, 1, sheet.getMaxRows() - 1, sheet.getLastColumn());

  // Clear existing rules
  sheet.clearConditionalFormatRules();

  const rules = [];

  // Yellow highlight: Cultivation stage + 90+ days since interaction
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND($N2="Cultivation",$O2<TODAY()-90,$O2<>"")`)
      .setBackground('#FFF2CC')
      .setRanges([dataRange])
      .build()
  );

  // Red highlight: Cultivation stage + 180+ days since interaction
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND($N2="Cultivation",$O2<TODAY()-180,$O2<>"")`)
      .setBackground('#F4CCCC')
      .setRanges([dataRange])
      .build()
  );

  // Orange highlight: Missing archetype for active relationships
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND($X2="",$N2<>"Identified")`)
      .setBackground('#FCE5CD')
      .setRanges([dataRange])
      .build()
  );

  // Red text: Stale research (180+ days)
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=$R2<TODAY()-180`)
      .setFontColor('#CC0000')
      .setRanges([sheet.getRange(2, FUNDER_COLS.LAST_RESEARCH_UPDATE, sheet.getMaxRows() - 1, 1)])
      .build()
  );

  sheet.setConditionalFormatRules(rules);
}

/**
 * Applies conditional formatting to the Contact sheet.
 * Highlights high-value relationships missing documentation.
 */
function applyContactConditionalFormatting(ss) {
  const sheet = ss.getSheetByName(SHEETS.CONTACTS);
  if (!sheet || sheet.getLastRow() < 2) return;

  const dataRange = sheet.getRange(2, 1, sheet.getMaxRows() - 1, sheet.getLastColumn());

  sheet.clearConditionalFormatRules();

  const rules = [];

  // Yellow highlight: High relationship quality (7+) missing non-monetary value documentation
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND($M2>=7,$X2="")`)
      .setBackground('#FFF2CC')
      .setRanges([dataRange])
      .build()
  );

  // Orange highlight: Missing archetype messaging cue when archetype is assigned
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND($U2<>"Archetype Not Assigned",$U2<>"",$V2="")`)
      .setBackground('#FCE5CD')
      .setRanges([dataRange])
      .build()
  );

  sheet.setConditionalFormatRules(rules);
}

/**
 * Applies conditional formatting to the Pipeline sheet.
 * Highlights high-priority opportunities and urgent deadlines.
 */
function applyPipelineConditionalFormatting(ss) {
  const sheet = ss.getSheetByName(SHEETS.PIPELINE);
  if (!sheet || sheet.getLastRow() < 2) return;

  const dataRange = sheet.getRange(2, 1, sheet.getMaxRows() - 1, sheet.getLastColumn());

  sheet.clearConditionalFormatRules();

  const rules = [];

  // Green highlight: High expected value awaiting decision
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND($X2>PERCENTILE($X:$X,0.75),$Q2="Under Evaluation")`)
      .setBackground('#D9EAD3')
      .setRanges([dataRange])
      .build()
  );

  // Red highlight: Urgent decision needed (start date within 14 days)
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(
        `=AND($O2<TODAY()+14,OR($Q2="Under Evaluation",$Q2="Go Decision Approved"))`
      )
      .setBackground('#F4CCCC')
      .setRanges([dataRange])
      .build()
  );

  // Yellow highlight: Approaching deadline (start date within 30 days)
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(
        `=AND($O2<TODAY()+30,$O2>=TODAY()+14,OR($Q2="Under Evaluation",$Q2="Go Decision Approved"))`
      )
      .setBackground('#FFF2CC')
      .setRanges([dataRange])
      .build()
  );

  sheet.setConditionalFormatRules(rules);
}

// ============================================================================
// DASHBOARD CREATION
// ============================================================================

/**
 * Creates the Portfolio Dashboard with summary metrics and visualizations.
 * This provides executive-level synthesis of your fundraising intelligence.
 */
function createDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let dashboard = ss.getSheetByName(SHEETS.DASHBOARD);
  if (!dashboard) {
    dashboard = ss.insertSheet(SHEETS.DASHBOARD);
  } else {
    dashboard.clear();
  }

  // Set up dashboard structure
  dashboard.setColumnWidth(1, 250);
  dashboard.setColumnWidth(2, 150);
  dashboard.setColumnWidth(3, 150);
  dashboard.setColumnWidth(4, 150);

  let row = 1;

  // Title
  dashboard.getRange(row, 1).setValue('FUNDRAISING INTELLIGENCE DASHBOARD');
  dashboard
    .getRange(row, 1, 1, 4)
    .merge()
    .setBackground('#1155CC')
    .setFontColor('#FFFFFF')
    .setFontSize(16)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  row += 2;

  // Relationship Stage Summary
  dashboard.getRange(row, 1).setValue('RELATIONSHIP STAGE DISTRIBUTION');
  dashboard
    .getRange(row, 1, 1, 2)
    .merge()
    .setBackground('#4A86E8')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');
  row++;

  ENUMS.RELATIONSHIP_STAGES.forEach(stage => {
    dashboard.getRange(row, 1).setValue(stage);
    dashboard.getRange(row, 2).setFormula(`=COUNTIF('${SHEETS.FUNDERS}'!$N:$N,"${stage}")`);
    row++;
  });

  row++;

  // Archetype Distribution
  dashboard.getRange(row, 1).setValue('FUNDER ARCHETYPE DISTRIBUTION');
  dashboard
    .getRange(row, 1, 1, 2)
    .merge()
    .setBackground('#4A86E8')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');
  row++;

  ENUMS.FUNDER_ARCHETYPES.forEach(archetype => {
    dashboard.getRange(row, 1).setValue(archetype);
    dashboard.getRange(row, 2).setFormula(`=COUNTIF('${SHEETS.FUNDERS}'!$X:$X,"${archetype}")`);
    row++;
  });

  row++;

  // Pipeline Summary
  dashboard.getRange(row, 1).setValue('PIPELINE SUMMARY');
  dashboard
    .getRange(row, 1, 1, 4)
    .merge()
    .setBackground('#E69138')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');
  row++;

  dashboard.getRange(row, 1).setValue('Total Pipeline Value');
  dashboard
    .getRange(row, 2)
    .setFormula(`=SUM('${SHEETS.PIPELINE}'!$H:$H)`)
    .setNumberFormat('$#,##0');
  row++;

  dashboard.getRange(row, 1).setValue('Weighted Expected Value');
  dashboard
    .getRange(row, 2)
    .setFormula(`=SUM('${SHEETS.PIPELINE}'!$X:$X)`)
    .setNumberFormat('$#,##0');
  row++;

  dashboard.getRange(row, 1).setValue('Active Opportunities');
  dashboard
    .getRange(row, 2)
    .setFormula(
      `=COUNTIFS('${SHEETS.PIPELINE}'!$Q:$Q,"In Development")+COUNTIFS('${SHEETS.PIPELINE}'!$Q:$Q,"Internal Review")+COUNTIFS('${SHEETS.PIPELINE}'!$Q:$Q,"Finalization")`
    );
  row++;

  dashboard.getRange(row, 1).setValue('Submitted Awaiting Decision');
  dashboard
    .getRange(row, 2)
    .setFormula(
      `=COUNTIFS('${SHEETS.PIPELINE}'!$Q:$Q,"Submitted")+COUNTIFS('${SHEETS.PIPELINE}'!$Q:$Q,"Under Funder Review")`
    );
  row++;

  row++;

  // Cultivation Health Metrics
  dashboard.getRange(row, 1).setValue('CULTIVATION HEALTH METRICS');
  dashboard
    .getRange(row, 1, 1, 3)
    .merge()
    .setBackground('#6AA84F')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');
  row++;

  dashboard.getRange(row, 1).setValue('Funders in Cultivation');
  dashboard.getRange(row, 2).setFormula(`=COUNTIF('${SHEETS.FUNDERS}'!$N:$N,"Cultivation")`);
  row++;

  dashboard.getRange(row, 1).setValue('Contacted in Last 90 Days');
  dashboard
    .getRange(row, 2)
    .setFormula(
      `=COUNTIFS('${SHEETS.FUNDERS}'!$N:$N,"Cultivation",'${SHEETS.FUNDERS}'!$O:$O,">="&TODAY()-90)`
    );
  row++;

  dashboard.getRange(row, 1).setValue('Cultivation Health Rate');
  dashboard
    .getRange(row, 2)
    .setFormula(
      `=IF(COUNTIF('${SHEETS.FUNDERS}'!$N:$N,"Cultivation")=0,"N/A",TEXT(COUNTIFS('${SHEETS.FUNDERS}'!$N:$N,"Cultivation",'${SHEETS.FUNDERS}'!$O:$O,">="&TODAY()-90)/COUNTIF('${SHEETS.FUNDERS}'!$N:$N,"Cultivation"),"0%"))`
    );
  row++;

  row++;

  // Recent Activity
  dashboard.getRange(row, 1).setValue('RECENT ACTIVITY (Last 30 Days)');
  dashboard
    .getRange(row, 1, 1, 2)
    .merge()
    .setBackground('#A64D79')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');
  row++;

  dashboard.getRange(row, 1).setValue('Total Interactions');
  dashboard
    .getRange(row, 2)
    .setFormula(`=COUNTIFS('${SHEETS.INTERACTIONS}'!$F:$F,">="&TODAY()-30)`);
  row++;

  dashboard.getRange(row, 1).setValue('Unique Funders Contacted');
  dashboard
    .getRange(row, 2)
    .setFormula(
      `=SUMPRODUCT(1/COUNTIFS('${SHEETS.INTERACTIONS}'!$B:$B,'${SHEETS.INTERACTIONS}'!$B:$B&"",'${SHEETS.INTERACTIONS}'!$F:$F,">="&TODAY()-30))`
    );
  row++;

  // Format the entire dashboard
  dashboard.getRange(1, 1, row, 4).setVerticalAlignment('middle');

  SpreadsheetApp.getUi().alert('Dashboard has been created successfully!');
}

// ============================================================================
// DATA INTEGRITY VALIDATION
// ============================================================================

/**
 * Validates data integrity across all sheets and reports issues.
 * This helps maintain data quality over time.
 */
function validateDataIntegrity() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const issues = [];

  // Check for orphaned Contact records
  const contactSheet = ss.getSheetByName(SHEETS.CONTACTS);
  const funderSheet = ss.getSheetByName(SHEETS.FUNDERS);

  if (contactSheet && funderSheet && contactSheet.getLastRow() > 1) {
    const contactData = contactSheet
      .getRange(2, 1, contactSheet.getLastRow() - 1, CONTACT_COLS.FUNDER_ID)
      .getValues();
    const funderIds = funderSheet
      .getRange(2, 1, funderSheet.getLastRow() - 1, 1)
      .getValues()
      .flat();

    contactData.forEach((row, index) => {
      const funderIdInContact = row[CONTACT_COLS.FUNDER_ID - 1];
      if (funderIdInContact && !funderIds.includes(funderIdInContact)) {
        issues.push(
          `Row ${index + 2} in Contacts: References non-existent Funder ID ${funderIdInContact}`
        );
      }
    });
  }

  // Check for missing archetype assignments in active relationships
  if (funderSheet && funderSheet.getLastRow() > 1) {
    const funderData = funderSheet
      .getRange(2, 1, funderSheet.getLastRow() - 1, FUNDER_COLS.FUNDER_ARCHETYPE)
      .getValues();

    funderData.forEach((row, index) => {
      const stage = row[FUNDER_COLS.RELATIONSHIP_STAGE - 1];
      const archetype = row[FUNDER_COLS.FUNDER_ARCHETYPE - 1];

      if (
        (stage === 'Cultivation' || stage === 'Proposal Stage' || stage === 'Active Partner') &&
        !archetype
      ) {
        issues.push(`Row ${index + 2} in Funders: Missing archetype assignment for ${stage} stage`);
      }
    });
  }

  // Display results
  const ui = SpreadsheetApp.getUi();
  if (issues.length === 0) {
    ui.alert(
      'Data Integrity Check',
      'All data integrity checks passed successfully!',
      ui.ButtonSet.OK
    );
  } else {
    const message =
      'Found ' +
      issues.length +
      ' integrity issues:\n\n' +
      issues.slice(0, 10).join('\n') +
      (issues.length > 10 ? '\n\n... and ' + (issues.length - 10) + ' more issues.' : '');
    ui.alert('Data Integrity Issues', message, ui.ButtonSet.OK);
  }
}

// ============================================================================
// AUTO-ID GENERATION
// ============================================================================

/**
 * Automatically generates unique IDs for new records.
 * This can be triggered via a custom menu or automatically on edit.
 */
function generateUniqueId(prefix) {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return prefix + '-' + timestamp + '-' + random;
}

/**
 * Auto-populate IDs when new rows are added.
 * This function can be set as an installable trigger.
 */
function onEdit(e) {
  if (!e) return;

  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const row = range.getRow();

  // Only process data rows (not headers)
  if (row < 2) return;

  // Auto-generate Funder ID
  if (sheet.getName() === SHEETS.FUNDERS && range.getColumn() === FUNDER_COLS.LEGAL_NAME) {
    const idCell = sheet.getRange(row, FUNDER_COLS.FUNDER_ID);
    if (!idCell.getValue()) {
      idCell.setValue(generateUniqueId('FND'));
    }
  }

  // Auto-generate Contact ID
  if (sheet.getName() === SHEETS.CONTACTS && range.getColumn() === CONTACT_COLS.FULL_NAME) {
    const idCell = sheet.getRange(row, CONTACT_COLS.CONTACT_ID);
    if (!idCell.getValue()) {
      idCell.setValue(generateUniqueId('CNT'));
    }
  }

  // Auto-generate Opportunity ID
  if (sheet.getName() === SHEETS.PIPELINE && range.getColumn() === PIPELINE_COLS.OPPORTUNITY_NAME) {
    const idCell = sheet.getRange(row, PIPELINE_COLS.OPPORTUNITY_ID);
    if (!idCell.getValue()) {
      idCell.setValue(generateUniqueId('OPP'));
    }
  }

  // Auto-generate Interaction Log ID
  if (
    sheet.getName() === SHEETS.INTERACTIONS &&
    range.getColumn() === INTERACTION_COLS.INTERACTION_DATE
  ) {
    const idCell = sheet.getRange(row, INTERACTION_COLS.LOG_ID);
    if (!idCell.getValue()) {
      idCell.setValue(generateUniqueId('INT'));
    }
  }

  // Update Status Change Date when Application Status changes
  if (
    sheet.getName() === SHEETS.PIPELINE &&
    range.getColumn() === PIPELINE_COLS.APPLICATION_STATUS
  ) {
    const statusDateCell = sheet.getRange(row, PIPELINE_COLS.STATUS_CHANGE_DATE);
    statusDateCell.setValue(new Date());
  }
}

// ============================================================================
// BATCH OPERATIONS AND UTILITIES
// ============================================================================

/**
 * Batch update Last Research Update date for selected funders.
 * Useful after conducting a research sprint.
 */
function batchUpdateResearchDate() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.FUNDERS);
  const ui = SpreadsheetApp.getUi();

  const response = ui.prompt(
    'Batch Update Research Date',
    'Enter Funder IDs (comma-separated) to update research date to today:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const funderIds = response
    .getResponseText()
    .split(',')
    .map(id => id.trim());
  const data = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, FUNDER_COLS.LAST_RESEARCH_UPDATE)
    .getValues();
  const today = new Date();
  let updatedCount = 0;

  data.forEach((row, index) => {
    if (funderIds.includes(row[0])) {
      sheet.getRange(index + 2, FUNDER_COLS.LAST_RESEARCH_UPDATE).setValue(today);
      updatedCount++;
    }
  });

  ui.alert(`Updated research date for ${updatedCount} funder(s).`);
}

/**
 * Export filtered data based on criteria.
 * Creates a new sheet with filtered results.
 */
function exportFilteredFunders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // Ask user for filter criteria
  const stageResponse = ui.prompt(
    'Export Filtered Funders',
    'Enter Relationship Stage to filter (or leave blank for all):',
    ui.ButtonSet.OK_CANCEL
  );

  if (stageResponse.getSelectedButton() !== ui.Button.OK) return;

  const targetStage = stageResponse.getResponseText().trim();

  const archetypeResponse = ui.prompt(
    'Export Filtered Funders',
    'Enter Funder Archetype to filter (or leave blank for all):',
    ui.ButtonSet.OK_CANCEL
  );

  if (archetypeResponse.getSelectedButton() !== ui.Button.OK) return;

  const targetArchetype = archetypeResponse.getResponseText().trim();

  // Get source data
  const sourceSheet = ss.getSheetByName(SHEETS.FUNDERS);
  const data = sourceSheet.getDataRange().getValues();
  const headers = data[0];

  // Filter data
  const filteredData = [headers];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const stage = row[FUNDER_COLS.RELATIONSHIP_STAGE - 1];
    const archetype = row[FUNDER_COLS.FUNDER_ARCHETYPE - 1];

    const stageMatch = !targetStage || stage === targetStage;
    const archetypeMatch = !targetArchetype || archetype === targetArchetype;

    if (stageMatch && archetypeMatch) {
      filteredData.push(row);
    }
  }

  // Create export sheet
  const timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM-dd_HHmm'
  );
  const exportSheetName = 'Export_' + timestamp;
  const exportSheet = ss.insertSheet(exportSheetName);

  exportSheet.getRange(1, 1, filteredData.length, headers.length).setValues(filteredData);
  exportSheet
    .getRange(1, 1, 1, headers.length)
    .setBackground('#4A86E8')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');

  ui.alert(`Exported ${filteredData.length - 1} funder(s) to sheet "${exportSheetName}"`);
}

/**
 * Generate a cultivation plan report for a specific archetype.
 * Creates actionable guidance based on psychological profiles.
 */
function generateArchetypeCultivationGuide() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const response = ui.prompt(
    'Generate Archetype Cultivation Guide',
    'Enter Funder Archetype:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const archetype = response.getResponseText().trim();

  // Archetype-specific cultivation guidance
  const guidanceMap = {
    'Systems Thinker': {
      messaging:
        'Lead with root cause analysis, systems maps, and leverage points. Emphasize interconnections and long-term sustainability.',
      evidence:
        'Use causal loop diagrams, quantitative models, and research citations. Show how interventions create ripple effects.',
      approach:
        'Be intellectually rigorous. Acknowledge complexity and trade-offs. Demonstrate deep understanding of system dynamics.',
    },
    'Mission-Driven Advocate': {
      messaging:
        'Lead with compelling human stories and emotional resonance. Connect work to their passionate commitment.',
      evidence:
        'Use personal testimonials, community voices, and narrative case studies. Show transformation at individual level.',
      approach:
        'Be authentic and values-driven. Show personal connection to the mission. Demonstrate urgency and moral imperative.',
    },
    'Pragmatic Bureaucrat': {
      messaging:
        'Emphasize risk mitigation, compliance, and clear accountability structures. Show process rigor.',
      evidence:
        'Use audited financials, compliance documentation, and structured reporting. Demonstrate institutional stability.',
      approach:
        'Be detail-oriented and process-focused. Anticipate concerns. Show track record of reliable execution.',
    },
    'Community Champion': {
      messaging:
        'Center community voice, local leadership, and participatory processes. Show power-sharing.',
      evidence:
        'Use community-generated data, testimonials from local leaders, and evidence of participatory design.',
      approach:
        'Be humble and community-centered. Demonstrate genuine partnership. Show how community drives decisions.',
    },
    'Impact Investor': {
      messaging:
        'Lead with measurable outcomes, scalability analysis, and ROI frameworks. Use business metrics.',
      evidence:
        'Use quantitative impact data, cost-effectiveness analysis, and growth projections. Show path to scale.',
      approach:
        'Be results-focused and entrepreneurial. Demonstrate innovation and efficiency. Show theory of scale.',
    },
    'Innovation Enthusiast': {
      messaging:
        "Emphasize novelty, creative disruption, and breakthrough potential. Highlight what's unprecedented.",
      evidence:
        'Use pilot data, innovation case studies, and examples of creative solutions. Show differentiation.',
      approach:
        'Be bold and experimental. Show appetite for risk. Demonstrate learning orientation and adaptability.',
    },
    'Risk Manager': {
      messaging:
        'Showcase proven models, institutional stability, and conservative implementation. Minimize perceived risk.',
      evidence:
        'Use replication studies, established best practices, and track records. Show incremental progress.',
      approach:
        'Be conservative and steady. Demonstrate risk awareness. Show how you mitigate potential failures.',
    },
    'Partnership Builder': {
      messaging:
        'Highlight collaboration, collective impact, and network effects. Show ecosystem thinking.',
      evidence:
        'Use partnership agreements, coalition outcomes, and network analysis. Demonstrate convening power.',
      approach:
        'Be collaborative and generous. Show commitment to shared success. Demonstrate ability to coordinate.',
    },
  };

  const guidance = guidanceMap[archetype];

  if (!guidance) {
    ui.alert('Archetype not found. Please use exact archetype name from the system.');
    return;
  }

  // Get funders matching this archetype
  const funderSheet = ss.getSheetByName(SHEETS.FUNDERS);
  const data = funderSheet
    .getRange(2, 1, funderSheet.getLastRow() - 1, FUNDER_COLS.FUNDER_ARCHETYPE)
    .getValues();

  const matchingFunders = [];
  data.forEach((row, index) => {
    if (row[FUNDER_COLS.FUNDER_ARCHETYPE - 1] === archetype) {
      matchingFunders.push({
        name: row[FUNDER_COLS.LEGAL_NAME - 1],
        stage: row[FUNDER_COLS.RELATIONSHIP_STAGE - 1],
        row: index + 2,
      });
    }
  });

  // Create report sheet
  const timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM-dd_HHmm'
  );
  const reportSheet = ss.insertSheet('ArchetypeGuide_' + timestamp);

  let row = 1;

  // Title
  reportSheet.getRange(row, 1).setValue(`CULTIVATION GUIDE: ${archetype}`);
  reportSheet
    .getRange(row, 1, 1, 3)
    .merge()
    .setBackground('#1155CC')
    .setFontColor('#FFFFFF')
    .setFontSize(14)
    .setFontWeight('bold');
  row += 2;

  // Messaging Strategy
  reportSheet.getRange(row, 1).setValue('MESSAGING STRATEGY');
  reportSheet.getRange(row, 1).setFontWeight('bold').setBackground('#E8F0FE');
  row++;
  reportSheet.getRange(row, 1).setValue(guidance.messaging);
  reportSheet.getRange(row, 1, 1, 3).merge().setWrap(true);
  row += 2;

  // Evidence Types
  reportSheet.getRange(row, 1).setValue('EVIDENCE TYPES TO EMPHASIZE');
  reportSheet.getRange(row, 1).setFontWeight('bold').setBackground('#E8F0FE');
  row++;
  reportSheet.getRange(row, 1).setValue(guidance.evidence);
  reportSheet.getRange(row, 1, 1, 3).merge().setWrap(true);
  row += 2;

  // Cultivation Approach
  reportSheet.getRange(row, 1).setValue('CULTIVATION APPROACH');
  reportSheet.getRange(row, 1).setFontWeight('bold').setBackground('#E8F0FE');
  row++;
  reportSheet.getRange(row, 1).setValue(guidance.approach);
  reportSheet.getRange(row, 1, 1, 3).merge().setWrap(true);
  row += 2;

  // Matching Funders
  reportSheet.getRange(row, 1).setValue('FUNDERS WITH THIS ARCHETYPE');
  reportSheet.getRange(row, 1, 1, 3).merge().setFontWeight('bold').setBackground('#E8F0FE');
  row++;

  reportSheet.getRange(row, 1).setValue('Funder Name');
  reportSheet.getRange(row, 2).setValue('Relationship Stage');
  reportSheet.getRange(row, 3).setValue('Action Needed');
  reportSheet.getRange(row, 1, 1, 3).setFontWeight('bold');
  row++;

  matchingFunders.forEach(funder => {
    reportSheet.getRange(row, 1).setValue(funder.name);
    reportSheet.getRange(row, 2).setValue(funder.stage);

    let action = '';
    if (funder.stage === 'Identified' || funder.stage === 'Prospect') {
      action = 'Develop connection pathway';
    } else if (funder.stage === 'Cultivation') {
      action = 'Apply archetype messaging in next touchpoint';
    } else if (funder.stage === 'Proposal Stage') {
      action = 'Ensure proposal reflects archetype preferences';
    }

    reportSheet.getRange(row, 3).setValue(action);
    row++;
  });

  // Format columns
  reportSheet.setColumnWidth(1, 300);
  reportSheet.setColumnWidth(2, 150);
  reportSheet.setColumnWidth(3, 250);

  ui.alert(
    `Cultivation guide created for ${matchingFunders.length} funder(s) with archetype: ${archetype}`
  );
}

/**
 * Calculate portfolio health score based on multiple factors.
 * Provides a single metric for overall fundraising health.
 */
function calculatePortfolioHealthScore() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const funderSheet = ss.getSheetByName(SHEETS.FUNDERS);
  const pipelineSheet = ss.getSheetByName(SHEETS.PIPELINE);

  if (!funderSheet || !pipelineSheet) {
    ui.alert('Required sheets not found.');
    return;
  }

  // Get data
  const funderData = funderSheet
    .getRange(2, 1, Math.max(1, funderSheet.getLastRow() - 1), FUNDER_COLS.RELATIONSHIP_STAGE + 5)
    .getValues();
  const pipelineData = pipelineSheet
    .getRange(
      2,
      1,
      Math.max(1, pipelineSheet.getLastRow() - 1),
      PIPELINE_COLS.QUANTITATIVE_EXPECTED_VALUE
    )
    .getValues();

  // Calculate metrics
  let totalFunders = 0;
  let cultivationFunders = 0;
  let recentlyContactedCultivation = 0;
  let fundersWithArchetypes = 0;

  funderData.forEach(row => {
    if (row[0]) {
      // Has Funder ID
      totalFunders++;

      const stage = row[FUNDER_COLS.RELATIONSHIP_STAGE - 1];
      const lastContact = row[FUNDER_COLS.LAST_INTERACTION_DATE - 1];
      const archetype = row[FUNDER_COLS.FUNDER_ARCHETYPE - 1];

      if (stage === 'Cultivation') {
        cultivationFunders++;
        if (lastContact && (new Date() - new Date(lastContact)) / (1000 * 60 * 60 * 24) <= 90) {
          recentlyContactedCultivation++;
        }
      }

      if (archetype && stage !== 'Identified') {
        fundersWithArchetypes++;
      }
    }
  });

  let activeOpportunities = 0;
  let totalExpectedValue = 0;

  pipelineData.forEach(row => {
    if (row[0]) {
      // Has Opportunity ID
      const status = row[PIPELINE_COLS.APPLICATION_STATUS - 1];
      const expectedValue = row[PIPELINE_COLS.QUANTITATIVE_EXPECTED_VALUE - 1];

      if (
        [
          'In Development',
          'Internal Review',
          'Finalization',
          'Submitted',
          'Under Funder Review',
        ].includes(status)
      ) {
        activeOpportunities++;
      }

      if (expectedValue && !isNaN(expectedValue)) {
        totalExpectedValue += parseFloat(expectedValue);
      }
    }
  });

  // Calculate component scores (0-100 scale)
  const relationshipHealthScore =
    cultivationFunders > 0 ? (recentlyContactedCultivation / cultivationFunders) * 100 : 0;

  const strategicIntelligenceScore =
    totalFunders > 0 ? (fundersWithArchetypes / totalFunders) * 100 : 0;

  const pipelineActivityScore = Math.min(
    (activeOpportunities / Math.max(totalFunders * 0.3, 1)) * 100,
    100
  );

  const pipelineValueScore =
    totalExpectedValue > 0 ? Math.min((totalExpectedValue / 500000) * 100, 100) : 0;

  // Weighted overall score
  const overallScore =
    relationshipHealthScore * 0.35 +
    strategicIntelligenceScore * 0.25 +
    pipelineActivityScore * 0.2 +
    pipelineValueScore * 0.2;

  // Create report
  const report = `
PORTFOLIO HEALTH SCORE: ${overallScore.toFixed(1)}/100

Component Scores:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Relationship Health: ${relationshipHealthScore.toFixed(1)}/100
  ↳ ${recentlyContactedCultivation} of ${cultivationFunders} cultivation relationships contacted in last 90 days

Strategic Intelligence: ${strategicIntelligenceScore.toFixed(1)}/100
  ↳ ${fundersWithArchetypes} of ${totalFunders} active funders have archetype assignments

Pipeline Activity: ${pipelineActivityScore.toFixed(1)}/100
  ↳ ${activeOpportunities} active opportunities in development

Pipeline Value: ${pipelineValueScore.toFixed(1)}/100
  ↳ ${totalExpectedValue.toLocaleString()} weighted expected value

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Interpretation:
${
  overallScore >= 80
    ? '🟢 EXCELLENT: Portfolio is healthy and well-managed'
    : overallScore >= 60
      ? '🟡 GOOD: Portfolio is solid with some improvement opportunities'
      : overallScore >= 40
        ? '🟠 NEEDS ATTENTION: Significant improvement needed in key areas'
        : '🔴 CRITICAL: Immediate action required to strengthen portfolio'
}

Priority Actions:
${relationshipHealthScore < 60 ? '• Increase cultivation touchpoints - many relationships going dormant' : ''}
${strategicIntelligenceScore < 60 ? '• Complete archetype assignments for active funders' : ''}
${pipelineActivityScore < 40 ? '• Develop more funding opportunities to build pipeline' : ''}
${pipelineValueScore < 40 ? '• Focus on higher-value opportunities or improve win probability' : ''}
`;

  ui.alert('Portfolio Health Assessment', report, ui.ButtonSet.OK);
}

// ============================================================================
// INSTALLATION AND SETUP HELPER
// ============================================================================

/**
 * Complete system setup with step-by-step guidance.
 * This is the recommended entry point for new installations.
 */
function completeSystemSetup() {
  const ui = SpreadsheetApp.getUi();

  const welcome = ui.alert(
    'Welcome to Fundraising Intelligence System Setup',
    'This wizard will guide you through complete system installation. The process takes about 5 minutes. Continue?',
    ui.ButtonSet.YES_NO
  );

  if (welcome !== ui.Button.YES) return;

  try {
    ui.alert('Step 1 of 5', 'Creating sheet structure...', ui.ButtonSet.OK);
    createOrUpdateSheets();

    ui.alert('Step 2 of 5', 'Setting up named ranges and validation...', ui.ButtonSet.OK);
    setupNamedRanges();
    setupDataValidation();

    ui.alert('Step 3 of 5', 'Applying conditional formatting...', ui.ButtonSet.OK);
    applyAllConditionalFormatting();

    ui.alert('Step 4 of 5', 'Creating dashboard...', ui.ButtonSet.OK);
    createDashboard();

    ui.alert('Step 5 of 5', 'Initializing calculated fields...', ui.ButtonSet.OK);
    refreshAllCalculations();

    const finalMessage = `
Setup Complete! 🎉

Your Strategic Fundraising Intelligence System is ready to use.

Next Steps:
1. Start by adding 5-10 key funders in the Funder Intelligence Repository
2. Complete the enhanced strategic fields (Org Archaeology, Archetype, Differentiation)
3. Add key contacts for each funder
4. Create opportunity records for active pursuits

Access additional features from the "Fundraising System" menu.

Tip: Review the Portfolio Dashboard regularly to monitor relationship health and pipeline value.
`;

    ui.alert('Setup Complete', finalMessage, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('Setup Error', 'An error occurred: ' + error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Enhanced menu with all available functions.
 * Called when spreadsheet opens.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Fundraising System')
    .addItem('🚀 Complete System Setup', 'completeSystemSetup')
    .addSeparator()
    .addSubMenu(
      ui
        .createMenu('System Maintenance')
        .addItem('Refresh All Calculations', 'refreshAllCalculations')
        .addItem('Update Conditional Formatting', 'applyAllConditionalFormatting')
        .addItem('Validate Data Integrity', 'validateDataIntegrity')
        .addItem('Rebuild Dashboard', 'createDashboard')
    )
    .addSeparator()
    .addSubMenu(
      ui
        .createMenu('Batch Operations')
        .addItem('Batch Update Research Date', 'batchUpdateResearchDate')
        .addItem('Export Filtered Funders', 'exportFilteredFunders')
    )
    .addSeparator()
    .addSubMenu(
      ui
        .createMenu('Strategic Reports')
        .addItem('Generate Archetype Cultivation Guide', 'generateArchetypeCultivationGuide')
        .addItem('Calculate Portfolio Health Score', 'calculatePortfolioHealthScore')
    )
    .addToUi();
}
