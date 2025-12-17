/**
 * Design System Implementation Guide
 * ==================================
 *
 * Step-by-step guide for integrating Chanuka brand standards into components,
 * pages, and features. This ensures consistent application of political neutrality,
 * multilingual support, brand personality, and low-bandwidth design.
 */

export const IMPLEMENTATION_GUIDE = {
  quickStart: {
    step1_setupProviders: {
      title: 'Set up design system providers in your app root',
      file: 'app.tsx or main.tsx',
      code: `
        import { ChanukaProviders } from '@client/shared/design-system/contexts';
        
        export function App() {
          return (
            <ChanukaProviders defaultLanguage="en">
              <Router>
                {/* Your app routes */}
              </Router>
            </ChanukaProviders>
          );
        }
      `,
      note: 'This enables brand voice, low-bandwidth, and multilingual support across the app',
    },

    step2_useBrandVoice: {
      title: 'Apply brand microcopy to UI text',
      file: 'components/BillSearch.tsx',
      code: `
        import { useBrandVoice } from '@client/shared/design-system/contexts';
        
        export function BillSearch() {
          const { getMicrocopy } = useBrandVoice();
          
          return (
            <div>
              <input
                placeholder={getMicrocopy('formLabels.billNumber.placeholder')}
                title={getMicrocopy('formLabels.billNumber.help')}
              />
              <button>
                {getMicrocopy('buttons.primary.search')}
              </button>
            </div>
          );
        }
      `,
      note: 'Replaces hardcoded strings with brand-consistent microcopy',
    },

    step3_politicalNeutrality: {
      title: 'Apply political neutrality patterns to bill comparison',
      file: 'components/BillComparison.tsx',
      code: `
        import { PoliticalNeutralityPrinciples } from '@client/shared/design-system/standards';
        
        export function BillComparison({ billA, billB }) {
          const layout = PoliticalNeutralityPrinciples.layoutPatterns.sideBySideComparison;
          
          return (
            <div className="flex gap-4">
              {/* Bill A - Perspective 1 */}
              <article className="flex-1">
                <h3 style={{ color: '#3b82f6' }}>● Perspective A</h3>
                <p>{billA.content}</p>
              </article>
              
              {/* Bill B - Perspective 2 */}
              <article className="flex-1">
                <h3 style={{ color: '#a855f7' }}>● Perspective B</h3>
                <p>{billB.content}</p>
              </article>
            </div>
          );
        }
      `,
      note: 'Equal visual weight, no bias in layout or color usage',
    },

    step4_multilingual: {
      title: 'Support multilingual content',
      file: 'components/BillTitle.tsx',
      code: `
        import { useLanguage, FormattedDate } from '@client/shared/design-system/contexts';
        
        export function BillTitle({ bill, translations }) {
          const { language } = useLanguage();
          
          return (
            <div>
              <h1>{translations[language].title}</h1>
              <p>Introduced: <FormattedDate date={bill.dateIntroduced} /></p>
            </div>
          );
        }
      `,
      note: 'Language switcher auto-detects user preference, formats dates by locale',
    },

    step5_lowBandwidth: {
      title: 'Adapt components for low-bandwidth',
      file: 'components/BillPreview.tsx',
      code: `
        import { useLowBandwidth, ConditionalBandwidth } from '@client/shared/design-system/contexts';
        
        export function BillPreview({ bill }) {
          return (
            <ConditionalBandwidth
              lowBandwidth={
                /* Text only, no images */
                <article>
                  <h2>{bill.title}</h2>
                  <p>{bill.summary}</p>
                </article>
              }
              normal={
                /* Full featured version */
                <article>
                  <img src={bill.coverImage} alt={bill.title} />
                  <h2>{bill.title}</h2>
                  <p>{bill.summary}</p>
                  <video src={bill.explainerVideo} />
                </article>
              }
            />
          );
        }
      `,
      note: 'Automatically shows simplified version on slow connections',
    },
  },

  byComponent: {
    Button: {
      before: `
        <button onClick={handleSearch}>
          Search Bills
        </button>
      `,
      after: `
        import { useBrandVoice } from '@client/shared/design-system/contexts';
        
        <button onClick={handleSearch}>
          {useBrandVoice().getMicrocopy('buttons.primary.search')}
        </button>
      `,
      standards: ['BrandPersonality.MicrocopyLibrary', 'DesignTokens.colors.primary'],
    },

    Form: {
      before: `
        <input placeholder="e.g., HB 1234 or SB 567" />
        <p>Find bills by their official reference number</p>
      `,
      after: `
        import { useBrandVoice } from '@client/shared/design-system/contexts';
        import { MultilingualTypographyScale } from '@client/shared/design-system/standards';
        
        <input
          placeholder={getMicrocopy('formLabels.billNumber.placeholder')}
          title={getMicrocopy('formLabels.billNumber.help')}
          className={MultilingualTypographyScale.base}
        />
      `,
      standards: ['BrandPersonality.MicrocopyLibrary', 'MultilingualSupport.MultilingualTypographyScale'],
    },

    ErrorMessage: {
      before: `
        <div>Error: Could not load bill</div>
      `,
      after: `
        import { useBrandVoice } from '@client/shared/design-system/contexts';
        
        const { getTone } = useBrandVoice();
        const errorTone = getTone('error');
        
        <div>
          <h3>{errorTone.examples.title}</h3>
          <p>{errorTone.examples.body}</p>
          <a href="/bills">{errorTone.examples.cta}</a>
        </div>
      `,
      standards: ['BrandPersonality.ToneMatrix.error'],
    },

    EmptyState: {
      before: `
        <div>No bills found</div>
      `,
      after: `
        import { useBrandVoice } from '@client/shared/design-system/contexts';
        
        const { getTone, getMicrocopy } = useBrandVoice();
        const emptyTone = getTone('empty');
        
        <div>
          <h2>{getMicrocopy('emptyStates.noResults.title')}</h2>
          <p>{getMicrocopy('emptyStates.noResults.subtitle')}</p>
          <button>{getMicrocopy('emptyStates.noResults.action')}</button>
        </div>
      `,
      standards: ['BrandPersonality.MicrocopyLibrary.emptyStates', 'BrandPersonality.ToneMatrix.empty'],
    },

    PerspectiveCard: {
      before: `
        <div>
          <h3>Pro</h3>
          <p>{perspectiveText}</p>
        </div>
      `,
      after: `
        import { PoliticalNeutralityPrinciples } from '@client/shared/design-system/standards';
        
        <article className="perspective-card" data-perspective="A">
          <header>
            <h3 style={{ color: '#3b82f6' }}>
              ● Perspective A
            </h3>
          </header>
          <main>{perspectiveText}</main>
          <footer>{sources}</footer>
        </article>
      `,
      standards: ['PoliticalNeutrality.components.perspectiveCard', 'PoliticalNeutrality.visualIndicators'],
    },

    ImageComponent: {
      before: `
        <img src={bill.coverImage} alt={bill.title} />
      `,
      after: `
        import { useLowBandwidth } from '@client/shared/design-system/contexts';
        
        const { isLowBandwidth } = useLowBandwidth();
        
        {!isLowBandwidth && (
          <picture>
            <source srcSet={bill.coverImageWebp} type="image/webp" />
            <source srcSet={bill.coverImage} type="image/jpeg" />
            <img
              src={bill.coverImage}
              alt={bill.title}
              loading="lazy"
              srcSet={\`
                \${bill.coverImage480} 480w,
                \${bill.coverImage768} 768w,
                \${bill.coverImage1200} 1200w
              \`}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </picture>
        )}
      `,
      standards: ['LowBandwidth.ImageOptimization', 'LowBandwidth.NetworkAdaptation'],
    },

    FormattedNumber: {
      before: `
        <span>{bill.sponsorCount}</span>
      `,
      after: `
        import { FormattedNumber } from '@client/shared/design-system/contexts';
        
        <span>
          Sponsors: <FormattedNumber value={bill.sponsorCount} />
        </span>
      `,
      standards: ['MultilingualSupport.LocalizationFormats'],
    },

    DateDisplay: {
      before: `
        <span>{bill.dateIntroduced.toLocaleDateString()}</span>
      `,
      after: `
        import { FormattedDate } from '@client/shared/design-system/contexts';
        
        <span>
          Introduced: <FormattedDate date={bill.dateIntroduced} />
        </span>
      `,
      standards: ['MultilingualSupport.LocalizationFormats'],
    },
  },

  testingChecklistByStandard: {
    politicalNeutrality: [
      '✓ Both perspectives have equal visual prominence',
      '✓ No colors associated with good/bad',
      '✓ Text size identical for all perspectives',
      '✓ Language neutral (no "pro/con", "support/oppose")',
      '✓ Color-blind users can distinguish perspectives',
      '✓ Tested with users from diverse political backgrounds',
    ],

    multilingual: [
      '✓ No text overflow in any language',
      '✓ Dates format correctly by locale',
      '✓ Numbers format correctly by locale',
      '✓ Language switcher works on all pages',
      '✓ Preference persists after page refresh',
      '✓ Swahili speaker reviewed translations',
    ],

    brandVoice: [
      '✓ Error messages are helpful, not blaming',
      '✓ Empty states are encouraging',
      '✓ Button labels from MicrocopyLibrary',
      '✓ Tone consistent across contexts',
      '✓ No corporate jargon, no forced casualness',
      '✓ Reads like a helpful expert',
    ],

    lowBandwidth: [
      '✓ Initial bundle < 75 KB (gzipped)',
      '✓ Core functions work without JavaScript',
      '✓ Images lazy-loaded with alt text',
      '✓ WebP with JPEG fallback',
      '✓ Works on Slow 3G throttling',
      '✓ Offline content accessible via service worker',
    ],
  },

  commonPatterns: {
    errorRecovery: `
      // Pattern: Error + Why + Solution
      import { useBrandVoice } from '@client/shared/design-system/contexts';
      
      const { getTone, getMicrocopy } = useBrandVoice();
      const errorTone = getTone('error');
      
      <div className="error-state">
        <h3>{errorTone.examples.title}</h3>
        <p>{errorTone.examples.body}</p>
        <button onClick={retry}>
          {errorTone.examples.cta}
        </button>
      </div>
    `,

    educationalContent: `
      // Pattern: Break complexity into digestible pieces
      import { useBrandVoice } from '@client/shared/design-system/contexts';
      
      const { getTone } = useBrandVoice();
      const educationalTone = getTone('educational');
      
      <div className="educational">
        <h3>{educationalTone.examples.title}</h3>
        <details>
          <summary>Learn more</summary>
          <p>{educationalTone.examples.body}</p>
        </details>
      </div>
    `,

    comparisonView: `
      // Pattern: Equal visual weight for two perspectives
      import { PoliticalNeutralityPrinciples } from '@client/shared/design-system/standards';
      
      <div className="flex gap-4">
        {/* Perspective A */}
        <article className="flex-1 border">
          <h3 style={{ color: '#3b82f6' }}>● {perspective1Title}</h3>
          <p>{perspective1Content}</p>
        </article>
        
        {/* Perspective B */}
        <article className="flex-1 border">
          <h3 style={{ color: '#a855f7' }}>● {perspective2Title}</h3>
          <p>{perspective2Content}</p>
        </article>
      </div>
    `,

    progressiveEnhancement: `
      // Pattern: HTML-first, JavaScript enhances
      // Low bandwidth: Form works without JS
      // Normal: JS adds live preview and instant updates
      
      <form method="get" action="/search">
        <input name="q" placeholder="Search..." />
        <button type="submit">Search</button>
      </form>
      
      {/* JS enhancement: Live preview appears below form */}
      {isJavaScriptLoaded && (
        <div id="preview">
          {/* Dynamic search preview */}
        </div>
      )}
    `,
  },

  fileStructure: {
    description: 'Files implementing design standards',
    standards: 'client/src/shared/design-system/standards/',
    providers: 'client/src/shared/design-system/contexts/',
    components: {
      note: 'Components using the standards are in:',
      paths: [
        'client/src/shared/design-system/interactive/',
        'client/src/shared/design-system/feedback/',
        'client/src/shared/design-system/typography/',
        'client/src/shared/design-system/media/',
      ],
    },
  },

  deploymentChecklist: [
    '☐ All providers imported at app root (ChanukaProviders)',
    '☐ All hardcoded UI text replaced with MicrocopyLibrary',
    '☐ Error messages use BrandPersonality.ToneMatrix.error',
    '☐ Empty states use BrandPersonality.ToneMatrix.empty',
    '☐ Perspective comparisons use PoliticalNeutrality layouts',
    '☐ Numbers/dates use FormattedNumber/FormattedDate',
    '☐ Images lazy-loaded with WebP fallback',
    '☐ Bundle size < 200 KB (gzipped)',
    '☐ Tested on Slow 3G throttling',
    '☐ Tested with screen readers',
    '☐ Tested with color blindness simulation',
    '☐ Tested with Swahili language',
    '☐ All tests passing',
  ],
};

export default IMPLEMENTATION_GUIDE;
