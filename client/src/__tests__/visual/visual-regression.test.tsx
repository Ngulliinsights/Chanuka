/**
 * Visual Regression Tests
 * Tests UI consistency across different states and viewports
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  renderWithProviders, 
  MockDataFactory, 
  VisualTestUtils,
  screen,
  waitFor
} from '../../test-utils/comprehensive-test-setup';
import { BillCard } from '../../components/bills/BillCard';
import { BillsDashboard } from '../../components/bills/bills-dashboard';
import { IntelligentSearchPage } from '../../pages/IntelligentSearchPage';
import { ExpertBadge } from '../../components/verification/ExpertBadge';
import { DiscussionThread } from '../../components/community/DiscussionThread';

// Mock router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Visual Regression Tests', () => {
  let mockBills: any[];
  let mockUser: any;
  let mockExpert: any;
  let mockComments: any[];

  beforeEach(() => {
    mockBills = Array.from({ length: 5 }, () => MockDataFactory.createMockBill());
    mockUser = MockDataFactory.createMockUser();
    mockExpert = MockDataFactory.createMockExpert();
    mockComments = Array.from({ length: 3 }, () => MockDataFactory.createMockComment());
    
    // Mock API responses
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockBills }),
    });
  });

  // =============================================================================
  // COMPONENT VISUAL TESTS
  // =============================================================================

  describe('Component Visual Consistency', () => {
    it('should maintain BillCard visual consistency across states', async () => {
      const states = [
        { name: 'default', props: {} },
        { name: 'urgent', props: { bill: { ...mockBills[0], urgency_level: 'high' } } },
        { name: 'constitutional-flag', props: { 
          bill: { 
            ...mockBills[0], 
            constitutional_flags: [{ severity: 'high', category: 'Due Process' }] 
          } 
        }},
        { name: 'saved', props: { bill: { ...mockBills[0], is_saved: true } } },
        { name: 'loading', props: { bill: mockBills[0], loading: true } },
      ];

      for (const state of states) {
        const component = (
          <BillCard 
            bill={state.props.bill || mockBills[0]}
            onSave={vi.fn()}
            onShare={vi.fn()}
            onComment={vi.fn()}
            {...state.props}
          />
        );

        await VisualTestUtils.captureSnapshot(component, `bill-card-${state.name}`);
      }
    });

    it('should maintain ExpertBadge visual consistency across verification types', async () => {
      const verificationTypes = [
        { type: 'official', name: 'official-expert' },
        { type: 'domain', name: 'domain-expert' },
        { type: 'identity', name: 'identity-verified' },
      ];

      for (const verification of verificationTypes) {
        const expert = { ...mockExpert, verificationType: verification.type };
        const component = <ExpertBadge expert={expert} />;

        await VisualTestUtils.captureSnapshot(component, `expert-badge-${verification.name}`);
      }
    });

    it('should maintain DiscussionThread visual consistency', async () => {
      const threadStates = [
        { name: 'empty', comments: [] },
        { name: 'single-comment', comments: [mockComments[0]] },
        { name: 'nested-comments', comments: mockComments },
        { name: 'with-expert-comments', comments: mockComments.map(c => ({ 
          ...c, 
          author: { ...c.author, expert: mockExpert } 
        })) },
      ];

      for (const state of threadStates) {
        const component = (
          <DiscussionThread 
            billId="test-bill"
            comments={state.comments}
            onAddComment={vi.fn()}
            onVoteComment={vi.fn()}
          />
        );

        await VisualTestUtils.captureSnapshot(component, `discussion-thread-${state.name}`);
      }
    });
  });

  // =============================================================================
  // PAGE LAYOUT VISUAL TESTS
  // =============================================================================

  describe('Page Layout Visual Consistency', () => {
    it('should maintain Bills Dashboard layout across data states', async () => {
      const dataStates = [
        { name: 'loading', bills: [], loading: true },
        { name: 'empty', bills: [], loading: false },
        { name: 'few-bills', bills: mockBills.slice(0, 3), loading: false },
        { name: 'many-bills', bills: mockBills, loading: false },
        { name: 'error', bills: [], loading: false, error: 'Failed to load bills' },
      ];

      for (const state of dataStates) {
        const initialState = {
          bills: {
            items: state.bills,
            loading: state.loading,
            error: state.error || null,
          }
        };

        const component = <BillsDashboard />;
        
        await VisualTestUtils.captureSnapshot(
          component, 
          `bills-dashboard-${state.name}`
        );
      }
    });

    it('should maintain Search Page layout across interaction states', async () => {
      const searchStates = [
        { name: 'initial', hasQuery: false, hasResults: false },
        { name: 'with-query', hasQuery: true, hasResults: false },
        { name: 'with-results', hasQuery: true, hasResults: true },
        { name: 'advanced-search', hasQuery: true, hasResults: true, advancedOpen: true },
        { name: 'no-results', hasQuery: true, hasResults: false, noResults: true },
      ];

      for (const state of searchStates) {
        // Mock search results based on state
        if (state.hasResults) {
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ data: mockBills, total: mockBills.length }),
          });
        } else if (state.noResults) {
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ data: [], total: 0 }),
          });
        }

        const component = <IntelligentSearchPage />;
        
        await VisualTestUtils.captureSnapshot(
          component, 
          `search-page-${state.name}`
        );
      }
    });
  });

  // =============================================================================
  // RESPONSIVE DESIGN VISUAL TESTS
  // =============================================================================

  describe('Responsive Design Visual Consistency', () => {
    it('should maintain visual consistency across viewport sizes', async () => {
      const viewports = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1024, height: 768, name: 'desktop-small' },
        { width: 1920, height: 1080, name: 'desktop-large' },
      ];

      const components = [
        { component: <BillCard bill={mockBills[0]} onSave={vi.fn()} onShare={vi.fn()} onComment={vi.fn()} />, name: 'bill-card' },
        { component: <BillsDashboard />, name: 'bills-dashboard' },
        { component: <ExpertBadge expert={mockExpert} />, name: 'expert-badge' },
      ];

      for (const comp of components) {
        await VisualTestUtils.testResponsiveDesign(comp.component, viewports.map(v => ({
          ...v,
          name: `${comp.name}-${v.name}`
        })));
      }
    });

    it('should handle text scaling and zoom levels', async () => {
      const zoomLevels = [100, 125, 150, 200]; // Percentage zoom levels
      
      for (const zoom of zoomLevels) {
        // Mock zoom level
        Object.defineProperty(window, 'devicePixelRatio', { value: zoom / 100, writable: true });
        
        const component = (
          <div style={{ fontSize: `${zoom}%` }}>
            <BillCard 
              bill={mockBills[0]} 
              onSave={vi.fn()} 
              onShare={vi.fn()} 
              onComment={vi.fn()} 
            />
          </div>
        );

        await VisualTestUtils.captureSnapshot(component, `bill-card-zoom-${zoom}`);
      }
    });
  });

  // =============================================================================
  // THEME AND COLOR SCHEME TESTS
  // =============================================================================

  describe('Theme and Color Scheme Visual Tests', () => {
    it('should maintain visual consistency across color schemes', async () => {
      const colorSchemes = [
        { name: 'light', class: 'light-theme' },
        { name: 'dark', class: 'dark-theme' },
        { name: 'high-contrast', class: 'high-contrast-theme' },
      ];

      for (const scheme of colorSchemes) {
        const component = (
          <div className={scheme.class}>
            <BillCard 
              bill={mockBills[0]} 
              onSave={vi.fn()} 
              onShare={vi.fn()} 
              onComment={vi.fn()} 
            />
          </div>
        );

        await VisualTestUtils.captureSnapshot(component, `bill-card-${scheme.name}-theme`);
      }
    });

    it('should handle reduced motion preferences', async () => {
      const motionPreferences = [
        { name: 'normal', prefersReducedMotion: false },
        { name: 'reduced', prefersReducedMotion: true },
      ];

      for (const pref of motionPreferences) {
        // Mock prefers-reduced-motion
        Object.defineProperty(window, 'matchMedia', {
          value: vi.fn().mockImplementation(query => ({
            matches: query.includes('prefers-reduced-motion') ? pref.prefersReducedMotion : false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          })),
          writable: true,
        });

        const component = (
          <BillsDashboard />
        );

        await VisualTestUtils.captureSnapshot(component, `bills-dashboard-motion-${pref.name}`);
      }
    });
  });

  // =============================================================================
  // INTERACTION STATE VISUAL TESTS
  // =============================================================================

  describe('Interaction State Visual Tests', () => {
    it('should capture hover and focus states', async () => {
      const interactionStates = [
        { name: 'default', state: {} },
        { name: 'hover', state: { ':hover': true } },
        { name: 'focus', state: { ':focus': true } },
        { name: 'active', state: { ':active': true } },
        { name: 'disabled', state: { disabled: true } },
      ];

      for (const interaction of interactionStates) {
        const component = (
          <div className={`interaction-${interaction.name}`}>
            <BillCard 
              bill={mockBills[0]} 
              onSave={vi.fn()} 
              onShare={vi.fn()} 
              onComment={vi.fn()}
              disabled={interaction.state.disabled}
            />
          </div>
        );

        await VisualTestUtils.captureSnapshot(component, `bill-card-${interaction.name}`);
      }
    });

    it('should capture loading and error states', async () => {
      const asyncStates = [
        { name: 'loading', loading: true, error: null },
        { name: 'error', loading: false, error: 'Failed to load' },
        { name: 'success', loading: false, error: null },
        { name: 'empty', loading: false, error: null, empty: true },
      ];

      for (const state of asyncStates) {
        const initialState = {
          bills: {
            items: state.empty ? [] : mockBills,
            loading: state.loading,
            error: state.error,
          }
        };

        const component = <BillsDashboard />;
        
        await VisualTestUtils.captureSnapshot(
          component, 
          `bills-dashboard-${state.name}`
        );
      }
    });
  });

  // =============================================================================
  // ACCESSIBILITY VISUAL TESTS
  // =============================================================================

  describe('Accessibility Visual Tests', () => {
    it('should maintain visual consistency with accessibility features', async () => {
      const a11yFeatures = [
        { name: 'default', features: {} },
        { name: 'high-contrast', features: { highContrast: true } },
        { name: 'large-text', features: { largeText: true } },
        { name: 'focus-visible', features: { focusVisible: true } },
        { name: 'screen-reader', features: { screenReader: true } },
      ];

      for (const feature of a11yFeatures) {
        const className = Object.keys(feature.features).join(' ');
        
        const component = (
          <div className={className}>
            <BillCard 
              bill={mockBills[0]} 
              onSave={vi.fn()} 
              onShare={vi.fn()} 
              onComment={vi.fn()} 
            />
          </div>
        );

        await VisualTestUtils.captureSnapshot(component, `bill-card-a11y-${feature.name}`);
      }
    });

    it('should show proper focus indicators', async () => {
      const focusableElements = [
        { name: 'button', selector: 'button' },
        { name: 'link', selector: 'a' },
        { name: 'input', selector: 'input' },
        { name: 'card', selector: '[role="article"]' },
      ];

      for (const element of focusableElements) {
        const component = (
          <div>
            <BillCard 
              bill={mockBills[0]} 
              onSave={vi.fn()} 
              onShare={vi.fn()} 
              onComment={vi.fn()} 
            />
            <style>{`
              ${element.selector}:focus {
                outline: 2px solid #0066cc;
                outline-offset: 2px;
              }
            `}</style>
          </div>
        );

        await VisualTestUtils.captureSnapshot(component, `focus-indicator-${element.name}`);
      }
    });
  });

  // =============================================================================
  // ANIMATION AND TRANSITION TESTS
  // =============================================================================

  describe('Animation and Transition Visual Tests', () => {
    it('should capture animation keyframes', async () => {
      const animationStates = [
        { name: 'start', progress: 0 },
        { name: 'middle', progress: 0.5 },
        { name: 'end', progress: 1 },
      ];

      for (const state of animationStates) {
        const component = (
          <div style={{ 
            transform: `translateY(${(1 - state.progress) * 20}px)`,
            opacity: state.progress 
          }}>
            <BillCard 
              bill={mockBills[0]} 
              onSave={vi.fn()} 
              onShare={vi.fn()} 
              onComment={vi.fn()} 
            />
          </div>
        );

        await VisualTestUtils.captureSnapshot(component, `bill-card-animation-${state.name}`);
      }
    });

    it('should capture transition states', async () => {
      const transitionStates = [
        { name: 'collapsed', expanded: false },
        { name: 'expanding', expanded: true, transitioning: true },
        { name: 'expanded', expanded: true },
      ];

      for (const state of transitionStates) {
        const component = (
          <DiscussionThread 
            billId="test-bill"
            comments={state.expanded ? mockComments : []}
            onAddComment={vi.fn()}
            onVoteComment={vi.fn()}
            expanded={state.expanded}
            transitioning={state.transitioning}
          />
        );

        await VisualTestUtils.captureSnapshot(component, `discussion-thread-${state.name}`);
      }
    });
  });

  // =============================================================================
  // CROSS-BROWSER VISUAL TESTS
  // =============================================================================

  describe('Cross-Browser Visual Consistency', () => {
    it('should maintain consistency across different rendering engines', async () => {
      const browserStyles = [
        { name: 'webkit', prefix: '-webkit-' },
        { name: 'moz', prefix: '-moz-' },
        { name: 'ms', prefix: '-ms-' },
        { name: 'standard', prefix: '' },
      ];

      for (const browser of browserStyles) {
        const component = (
          <div>
            <BillCard 
              bill={mockBills[0]} 
              onSave={vi.fn()} 
              onShare={vi.fn()} 
              onComment={vi.fn()} 
            />
            <style>{`
              .chanuka-card {
                ${browser.prefix}box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                ${browser.prefix}border-radius: 8px;
                ${browser.prefix}transition: all 0.2s ease;
              }
            `}</style>
          </div>
        );

        await VisualTestUtils.captureSnapshot(component, `bill-card-${browser.name}-engine`);
      }
    });
  });

  // =============================================================================
  // REGRESSION DETECTION TESTS
  // =============================================================================

  describe('Visual Regression Detection', () => {
    it('should detect layout shifts in dynamic content', async () => {
      const contentStates = [
        { name: 'short-content', title: 'Short Title', summary: 'Brief summary.' },
        { name: 'long-content', title: 'Very Long Title That Might Wrap to Multiple Lines', summary: 'This is a much longer summary that contains significantly more text and might cause layout shifts if not handled properly.' },
        { name: 'mixed-content', title: 'Medium Title', summary: 'Medium length summary with some details.' },
      ];

      for (const content of contentStates) {
        const bill = { ...mockBills[0], title: content.title, summary: content.summary };
        
        const component = (
          <BillCard 
            bill={bill} 
            onSave={vi.fn()} 
            onShare={vi.fn()} 
            onComment={vi.fn()} 
          />
        );

        await VisualTestUtils.captureSnapshot(component, `bill-card-content-${content.name}`);
      }
    });

    it('should detect changes in component spacing and alignment', async () => {
      const layoutVariations = [
        { name: 'default', className: '' },
        { name: 'compact', className: 'compact-layout' },
        { name: 'spacious', className: 'spacious-layout' },
        { name: 'grid', className: 'grid-layout' },
      ];

      for (const layout of layoutVariations) {
        const component = (
          <div className={layout.className}>
            <BillCard 
              bill={mockBills[0]} 
              onSave={vi.fn()} 
              onShare={vi.fn()} 
              onComment={vi.fn()} 
            />
          </div>
        );

        await VisualTestUtils.captureSnapshot(component, `bill-card-layout-${layout.name}`);
      }
    });
  });
});