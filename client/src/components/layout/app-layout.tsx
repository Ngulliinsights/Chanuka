import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { MobileHeader } from './mobile-header';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Menu, HelpCircle, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AppLayoutProps {
  children: ReactNode;
}

// Interface for help content with both English and Swahili translations
interface HelpContent {
  title: {
    en: string;
    sw: string;
  };
  description: {
    en: string;
    sw: string;
  };
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  // Track if sidebar is open (only relevant for mobile/tablet views)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track if sidebar is collapsed (only relevant for desktop views)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Initialize from localStorage if available, otherwise default to false (expanded)
    const savedState = localStorage.getItem('sidebarCollapsed');
    return savedState ? JSON.parse(savedState) : false;
  });

  // Track user language preference
  const [language, setLanguage] = useState<'en' | 'sw'>(() => {
    const savedLang = localStorage.getItem('preferredLanguage');
    return (savedLang === 'sw' ? 'sw' : 'en') as 'en' | 'sw';
  });

  // Toggle language preference
  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'sw' : 'en';
    setLanguage(newLang);
    localStorage.setItem('preferredLanguage', newLang);
  };

  const [location] = useLocation();

  // Save collapsed state in localStorage to persist user preference
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Close mobile sidebar when location changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // Fix for nested anchor tag issue in some routes
  useEffect(() => {
    // Add class to body based on route to handle specific styling needs
    document.body.dataset.route = location;

    return () => {
      delete document.body.dataset.route;
    };
  }, [location]);

  // Track first-time visitor to show help popover
  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
    if (!hasVisitedBefore) {
      // Here we would set a state variable to show an onboarding modal
      localStorage.setItem('hasVisitedBefore', 'true');
    }
  }, []);

  // Toggle sidebar handler for desktop view
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // Toggle sidebar handler for mobile view
  const toggleMobileSidebar = () => setSidebarOpen(!sidebarOpen);

  // Get page-specific help content
  const helpContent = getPageSpecificHelp(location, language);

  const currentPageTitle = getPageTitleFromLocation(location, language);

  // Tagline for the current page
  const pageTagline = getPageTagline(location, language);

  return (
    <div className="min-h-screen flex bg-slate-50 relative">
      {/* Mobile sidebar backdrop overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Responsive Sidebar */}
      <div className={cn(
        "h-screen z-50 transition-all duration-300 ease-in-out",
        // Mobile: off-canvas when closed, visible when open 
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: adjust width when collapsed/expanded, always visible 
        "md:translate-x-0",
        sidebarCollapsed ? "md:w-16" : "md:w-64"
      )}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          language={language}
        />
      </div>

      {/* Main Content - expands to fill available space */}
      <main className={cn(
        "flex-1 min-h-screen overflow-x-hidden transition-all duration-300 ease-in-out",
        // Responsive width based on sidebar state
        sidebarCollapsed ? "md:w-[calc(100%-4rem)]" : "md:w-[calc(100%-16rem)]"
      )}>
        <MobileHeader
          pageTitle={currentPageTitle}
          onMenuClick={toggleMobileSidebar}
          language={language}
          onToggleLanguage={toggleLanguage}
        />

        {/* Chanuka Desktop Header */}
        <header className="chanuka-header hidden md:block">
          <div className="chanuka-nav">
            <div>
              <h1 className="text-xl font-semibold text-white">{currentPageTitle}</h1>
              {pageTagline && (
                <p className="text-sm text-white/80 mt-1">{pageTagline}</p>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="chanuka-btn chanuka-btn-outline text-xs text-white border-white/30 hover:bg-white/10"
              >
                {language === 'en' ? 'Badilisha Lugha: Kiswahili' : 'Change Language: English'}
              </button>

              {/* Help Button with Page Context */}
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <TooltipTrigger asChild>
                        <button className="chanuka-btn chanuka-btn-outline text-white border-white/30 hover:bg-white/10 rounded-full w-10 h-10 p-0">
                          <HelpCircle className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                    </PopoverTrigger>
                    <TooltipContent>
                      <p>{language === 'en' ? 'Get help for this page' : 'Pata usaidizi kwa ukurasa huu'}</p>
                    </TooltipContent>

                    <PopoverContent className="w-80">
                      <div className="space-y-2">
                        <h3 className="font-semibold" style={{color: 'var(--primary)'}}>{helpContent.title[language]}</h3>
                        <p className="text-sm" style={{color: 'var(--text-light)'}}>
                          {helpContent.description[language]}
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </header>

        {/* Desktop-only toggle button that appears when collapsed */}
        {sidebarCollapsed && (
          <Button
            variant="outline"
            size="icon"
            className="hidden md:flex absolute left-16 top-4 z-50 h-8 w-8 rounded-full shadow-md border border-gray-200"
            onClick={toggleSidebar}
            aria-label={language === 'en' ? 'Expand sidebar' : 'Panua upau wa kando'}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Page Content with padding for readability */}
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

// Helper function to extract readable page titles from URL paths
function getPageTitleFromLocation(location: string, language: 'en' | 'sw' = 'en'): string {
  if (language === 'en') {
    if (location === '/') return 'Dashboard';
    if (location.startsWith('/bills/')) {
      const parts = location.split('/');
      return parts.length > 2 && parts[2] ? 'Bill Details' : 'Bills';
    }
    if (location.startsWith('/analysis/')) return 'Bill Analysis';
    if (location === '/profile') return 'Profile';
    if (location === '/verification') return 'Expert Verification';
    if (location === '/onboarding') return 'Onboarding';

    // Convert path to title case for other routes
    return location
      .replace(/^\//, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'LegalEase';
  } else {
    // Swahili titles
    if (location === '/') return 'Dashbodi';
    if (location.startsWith('/bills/')) {
      const parts = location.split('/');
      return parts.length > 2 && parts[2] ? 'Maelezo ya Mswada' : 'Miswada';
    }
    if (location.startsWith('/analysis/')) return 'Uchambuzi wa Mswada';
    if (location === '/profile') return 'Wasifu';
    if (location === '/verification') return 'Uthibitisho wa Mtaalamu';
    if (location === '/onboarding') return 'Maelekezo ya Kuanza';

    // Convert path to title case for other routes
    return location
      .replace(/^\//, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'LegalEase';
  }
}

// Helper function to get page taglines
function getPageTagline(location: string, language: 'en' | 'sw'): string {
  const taglines = {
    '/': {
      en: "Your silence fills spaces others are eager to occupy.",
      sw: "Ukimya wako hujaza nafasi ambazo wengine wako tayari kuchukua."
    },
    bills: {
      en: "Decisions are made by those present, consequences shared by all.",
      sw: "Maamuzi hufanywa na waliopo, matokeo hushirikishwa na wote."
    },
    analysis: {
      en: "What you choose not to know shapes your world as much as what you learn.",
      sw: "Kile unachochagua kutojua huumba ulimwengu wako sawa na kile unachojifunza."
    },
    profile: {
      en: "Communities reflect their most engaged members, not their most numerous.",
      sw: "Jamii huakisi wanachama wake walioshiriki zaidi, sio wengi zaidi."
    },
    verification: {
      en: "Your perspective matters precisely because no one else has it.",
      sw: "Mtazamo wako una umuhimu hasa kwa sababu hakuna mtu mwingine anaye."
    },
    onboarding: {
      en: "Civic education turns subjects into citizens.",
      sw: "Elimu ya uraia hubadilisha raia kuwa wananchi kamili."
    }
  };

  if (location === '/') return taglines['/'][language];
  if (location.startsWith('/bills/')) return taglines.bills[language];
  if (location.startsWith('/analysis/')) return taglines.analysis[language];
  if (location === '/profile') return taglines.profile[language];
  if (location === '/verification') return taglines.verification[language];
  if (location === '/onboarding') return taglines.onboarding[language];

  return language === 'en'
    ? "Democracy functions in proportion to participation."
    : "Demokrasia hufanya kazi kwa uwiano wa ushiriki.";
}

// Helper function to get page-specific help content
function getPageSpecificHelp(location: string, language: 'en' | 'sw'): HelpContent {
  // Default help content
  const defaultHelp: HelpContent = {
    title: {
      en: "Welcome to LegalEase",
      sw: "Karibu kwenye LegalEase"
    },
    description: {
      en: "This platform helps you understand and engage with legislative processes. Navigate using the sidebar to explore bills, analyses, and more.",
      sw: "Jukwaa hili linakusaidia kuelewa na kushiriki katika michakato ya kisheria. Tembea ukitumia upau wa pembeni kuchunguza miswada, uchambuzi, na zaidi."
    }
  };

  // Page-specific help content
  const helpContent: Record<string, HelpContent> = {
    "/": {
      title: {
        en: "Your Civic Dashboard",
        sw: "Dashbodi Yako ya Kiraia"
      },
      description: {
        en: "Track legislation that affects you, stay informed about parliamentary activity, and engage with your representatives. This is your gateway to informed civic participation.",
        sw: "Fuatilia sheria zinazokuhusi, jipe habari kuhusu shughuli za kibunge, na shirikiana na wawakilishi wako. Hii ni lango lako la ushiriki wa kiraia wenye taarifa."
      }
    },
    "bills": {
      title: {
        en: "Legislative Tracking",
        sw: "Kufuatilia Sheria"
      },
      description: {
        en: "Follow bills from introduction to final vote. Understand their real-world impact and get personalized alerts for legislation that matters to you.",
        sw: "Fuata miswada kutoka utangulizi hadi kura ya mwisho. Elewa athari zake za ulimwengu halisi na pata tahadhari za kibinafsi kwa sheria zinazokuhusi."
      }
    },
    "analysis": {
      title: {
        en: "Impact Analysis",
        sw: "Uchambuzi wa Athari"
      },
      description: {
        en: "Get clear explanations of complex legislation, understand who benefits and who might be affected, and see the broader implications for society.",
        sw: "Pata maelezo wazi ya sheria ngumu, elewa nani atanufaika na nani ataweza kuathiriwa, na uone madhara makuu kwa jamii."
      }
    },
    "sponsorship": {
      title: {
        en: "Transparency Network",
        sw: "Mtandao wa Uwazi"
      },
      description: {
        en: "Explore the connections between legislators, their sponsors, and potential conflicts of interest. Knowledge is power in democracy.",
        sw: "Chunguza uhusiano kati ya wabunge, wadhamini wao, na migongano inayoweza kutokea. Maarifa ni nguvu katika demokrasia."
      }
    }
  };

  // Determine which help content to return based on location
  if (location === '/') return helpContent["/"];
  if (location.startsWith('/bills/')) return helpContent["bills"];
  if (location.startsWith('/analysis/')) return helpContent["analysis"];

  // Fall back to default help content
  return defaultHelp;
}