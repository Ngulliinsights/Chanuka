/**
 * Kenyan Context Provider
 *
 * Provides Kenyan cultural and legal context adaptation throughout the application
 * Handles government structure, legal processes, and cultural considerations
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import React, { createContext, useContext, ReactNode, useMemo } from 'react';

import { useI18n } from '@client/shared/hooks/use-i18n';

/**
 * Kenyan government structure
 */
interface KenyanGovernmentStructure {
  levels: {
    national: {
      name: string;
      description: string;
      institutions: string[];
    };
    county: {
      name: string;
      description: string;
      institutions: string[];
    };
    ward: {
      name: string;
      description: string;
      institutions: string[];
    };
  };
  legislature: {
    nationalAssembly: {
      name: string;
      role: string;
      members: number;
    };
    senate: {
      name: string;
      role: string;
      members: number;
    };
    countyAssembly: {
      name: string;
      role: string;
    };
  };
}

/**
 * Kenyan legal processes
 */
interface KenyanLegalProcesses {
  billTypes: {
    ordinary: { name: string; description: string; process: string[] };
    money: { name: string; description: string; process: string[] };
    constitutional: { name: string; description: string; process: string[] };
    county: { name: string; description: string; process: string[] };
  };
  stages: {
    firstReading: { name: string; description: string };
    secondReading: { name: string; description: string };
    committeeStage: { name: string; description: string };
    thirdReading: { name: string; description: string };
    assent: { name: string; description: string };
  };
  publicParticipation: {
    requirements: string[];
    methods: string[];
    timeline: string;
  };
}

/**
 * Cultural considerations for Kenya
 */
interface KenyanCulturalContext {
  languages: {
    official: string[];
    national: string[];
    local: string[];
  };
  communication: {
    formalityLevel: 'high' | 'medium' | 'low';
    respectTerms: string[];
    commonGreetings: Record<string, string>;
  };
  civicEngagement: {
    traditionalMethods: string[];
    modernMethods: string[];
    barriers: string[];
    opportunities: string[];
  };
  timeAndScheduling: {
    workingHours: string;
    publicHolidays: string[];
    culturalEvents: string[];
  };
}

/**
 * Kenyan Context Type
 */
interface KenyanContextType {
  government: KenyanGovernmentStructure;
  legalProcesses: KenyanLegalProcesses;
  cultural: KenyanCulturalContext;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
  getGovernmentLevel: (billType: string) => 'national' | 'county' | 'ward';
  getPublicParticipationRequirements: (billType: string) => string[];
  isWorkingHours: () => boolean;
  getLocalizedTerms: (category: string) => Record<string, string>;
}

/**
 * Kenyan Context
 */
const KenyanContext = createContext<KenyanContextType | null>(null);

/**
 * Kenyan Context Provider
 */
export const KenyanContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { language, kenyanContext, t } = useI18n();

  /**
   * Government structure information
   */
  const government: KenyanGovernmentStructure = useMemo(() => ({
    levels: {
      national: {
        name: t('legal.jurisdiction.national'),
        description: language === 'sw'
          ? 'Serikali ya kitaifa inayosimamia mambo ya nchi nzima'
          : 'National government responsible for country-wide matters',
        institutions: [
          t('civic.legislature.nationalAssembly'),
          t('civic.legislature.senate'),
          'Executive',
          'Judiciary'
        ]
      },
      county: {
        name: t('legal.jurisdiction.county'),
        description: language === 'sw'
          ? 'Serikali za kaunti zinazosimamia mambo ya kaunti'
          : 'County governments responsible for devolved functions',
        institutions: [
          t('civic.legislature.countyAssembly'),
          'County Executive',
          'County Public Service Board'
        ]
      },
      ward: {
        name: t('legal.jurisdiction.ward'),
        description: language === 'sw'
          ? 'Ngazi ya chini zaidi ya uongozi wa kisiasa'
          : 'Lowest level of political representation',
        institutions: [
          'Ward Representative',
          'Ward Development Committee',
          'Village Councils'
        ]
      }
    },
    legislature: {
      nationalAssembly: {
        name: t('civic.legislature.nationalAssembly'),
        role: language === 'sw'
          ? 'Kutunga sheria na kudhibiti bajeti ya kitaifa'
          : 'Law-making and national budget oversight',
        members: 349
      },
      senate: {
        name: t('civic.legislature.senate'),
        role: language === 'sw'
          ? 'Kulinda maslahi ya kaunti na kusimamia ugatuzi'
          : 'Protecting county interests and overseeing devolution',
        members: 68
      },
      countyAssembly: {
        name: t('civic.legislature.countyAssembly'),
        role: language === 'sw'
          ? 'Kutunga sheria za kaunti na kudhibiti bajeti za kaunti'
          : 'County law-making and budget oversight'
      }
    }
  }), [language, t]);

  /**
   * Legal processes information
   */
  const legalProcesses: KenyanLegalProcesses = useMemo(() => ({
    billTypes: {
      ordinary: {
        name: t('legal.billTypes.ordinary'),
        description: language === 'sw'
          ? 'Miswada ya kawaida inayohitaji idadi ya kawaida ya kura'
          : 'Regular bills requiring simple majority',
        process: [
          t('legal.stages.firstReading'),
          t('legal.stages.secondReading'),
          t('legal.stages.committeeStage'),
          t('legal.stages.thirdReading'),
          t('legal.stages.assent')
        ]
      },
      money: {
        name: t('legal.billTypes.money'),
        description: language === 'sw'
          ? 'Miswada inayohusisha matumizi ya fedha za umma'
          : 'Bills involving public expenditure',
        process: [
          'Budget Policy Statement',
          t('legal.stages.firstReading'),
          'Budget Committee Review',
          t('legal.stages.secondReading'),
          t('legal.stages.thirdReading'),
          t('legal.stages.assent')
        ]
      },
      constitutional: {
        name: t('legal.billTypes.constitutional'),
        description: language === 'sw'
          ? 'Miswada ya kubadilisha katiba'
          : 'Bills to amend the constitution',
        process: [
          'Constitutional Review',
          'Public Participation',
          'Parliamentary Approval (2/3 majority)',
          'Referendum (if required)',
          t('legal.stages.assent')
        ]
      },
      county: {
        name: t('legal.billTypes.county'),
        description: language === 'sw'
          ? 'Miswada ya sheria za kaunti'
          : 'County-level legislation',
        process: [
          'County Assembly Introduction',
          'Public Participation',
          'Committee Stage',
          'County Assembly Approval',
          'Governor Assent'
        ]
      }
    },
    stages: {
      firstReading: {
        name: t('legal.stages.firstReading'),
        description: language === 'sw'
          ? 'Utangulizi wa mswada bila mjadala'
          : 'Introduction of bill without debate'
      },
      secondReading: {
        name: t('legal.stages.secondReading'),
        description: language === 'sw'
          ? 'Mjadala wa jumla wa mswada'
          : 'General debate on the bill'
      },
      committeeStage: {
        name: t('legal.stages.committeeStage'),
        description: language === 'sw'
          ? 'Uchambuzi wa kina na marekebisho'
          : 'Detailed examination and amendments'
      },
      thirdReading: {
        name: t('legal.stages.thirdReading'),
        description: language === 'sw'
          ? 'Mjadala wa mwisho na kupiga kura'
          : 'Final debate and voting'
      },
      assent: {
        name: t('legal.stages.assent'),
        description: language === 'sw'
          ? 'Rais kutia saini mswada kuwa sheria'
          : 'Presidential signature to become law'
      }
    },
    publicParticipation: {
      requirements: language === 'sw' ? [
        'Ushiriki wa umma ni lazima kwa miswada yote',
        'Taarifa za awali za miswada',
        'Mikutano ya umma',
        'Maoni ya kielektroniki',
        'Ripoti za ushiriki wa umma'
      ] : [
        'Public participation mandatory for all bills',
        'Pre-publication of bills',
        'Public forums and hearings',
        'Electronic submissions',
        'Public participation reports'
      ],
      methods: language === 'sw' ? [
        'Mikutano ya umma',
        'Maoni ya mtandaoni',
        'Barua pepe na simu',
        'Vyombo vya habari',
        'Mashirika ya kiraia'
      ] : [
        'Public forums',
        'Online submissions',
        'Email and phone',
        'Media engagement',
        'Civil society organizations'
      ],
      timeline: language === 'sw'
        ? 'Angalau siku 21 kwa ushiriki wa umma'
        : 'Minimum 21 days for public participation'
    }
  }), [language, t]);

  /**
   * Cultural context information
   */
  const cultural: KenyanCulturalContext = useMemo(() => ({
    languages: {
      official: ['English', 'Kiswahili'],
      national: ['Kiswahili'],
      local: [
        'Kikuyu', 'Luhya', 'Luo', 'Kalenjin', 'Kamba',
        'Kisii', 'Meru', 'Mijikenda', 'Turkana', 'Maasai'
      ]
    },
    communication: {
      formalityLevel: 'high',
      respectTerms: language === 'sw' ? [
        'Mheshimiwa', 'Bwana', 'Bi', 'Daktari', 'Profesa'
      ] : [
        'Honorable', 'Mr.', 'Mrs.', 'Dr.', 'Professor'
      ],
      commonGreetings: language === 'sw' ? {
        morning: 'Habari za asubuhi',
        afternoon: 'Habari za mchana',
        evening: 'Habari za jioni',
        general: 'Hujambo'
      } : {
        morning: 'Good morning',
        afternoon: 'Good afternoon',
        evening: 'Good evening',
        general: 'Hello'
      }
    },
    civicEngagement: {
      traditionalMethods: language === 'sw' ? [
        'Baraza za wazee',
        'Mikutano ya jamii',
        'Mazungumzo ya kitamaduni',
        'Mchakato wa maamuzi ya pamoja'
      ] : [
        'Council of elders',
        'Community meetings',
        'Traditional dialogue',
        'Consensus decision-making'
      ],
      modernMethods: language === 'sw' ? [
        'Uchaguzi wa kidemokrasia',
        'Maombi ya kielektroniki',
        'Vyombo vya habari za kijamii',
        'Mashirika ya kiraia'
      ] : [
        'Democratic elections',
        'Electronic petitions',
        'Social media platforms',
        'Civil society organizations'
      ],
      barriers: language === 'sw' ? [
        'Ukosefu wa elimu ya kiraia',
        'Lugha na utamaduni',
        'Umbali wa kijiografia',
        'Rasilimali za kifedha'
      ] : [
        'Lack of civic education',
        'Language and cultural barriers',
        'Geographic distance',
        'Financial resources'
      ],
      opportunities: language === 'sw' ? [
        'Teknolojia ya simu za mkononi',
        'Mitandao ya kijamii',
        'Elimu ya kiraia',
        'Ushirikiano wa kimataifa'
      ] : [
        'Mobile technology',
        'Social networks',
        'Civic education',
        'International partnerships'
      ]
    },
    timeAndScheduling: {
      workingHours: '8:00 AM - 5:00 PM EAT',
      publicHolidays: [
        'New Year\'s Day', 'Good Friday', 'Easter Monday',
        'Labour Day', 'Madaraka Day', 'Mashujaa Day',
        'Jamhuri Day', 'Christmas Day', 'Boxing Day'
      ],
      culturalEvents: [
        'Eid celebrations', 'Diwali', 'Cultural festivals',
        'Harvest seasons', 'Traditional ceremonies'
      ]
    }
  }), [language]);

  /**
   * Format currency in Kenyan Shillings
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  /**
   * Format date in Kenyan format
   */
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(language === 'sw' ? 'sw-KE' : 'en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: kenyanContext.timezone
    }).format(date);
  };

  /**
   * Format time in Kenyan timezone
   */
  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat(language === 'sw' ? 'sw-KE' : 'en-KE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: kenyanContext.timezone,
      timeZoneName: 'short'
    }).format(date);
  };

  /**
   * Get government level for bill type
   */
  const getGovernmentLevel = (billType: string): 'national' | 'county' | 'ward' => {
    if (billType.includes('county') || billType.includes('kaunti')) {
      return 'county';
    }
    if (billType.includes('ward') || billType.includes('wodi')) {
      return 'ward';
    }
    return 'national';
  };

  /**
   * Get public participation requirements for bill type
   */
  const getPublicParticipationRequirements = (billType: string): string[] => {
    const level = getGovernmentLevel(billType);
    const baseRequirements = legalProcesses.publicParticipation.requirements;

    if (level === 'county') {
      return [
        ...baseRequirements,
        language === 'sw'
          ? 'Ushiriki wa kaunti mahususi'
          : 'County-specific participation requirements'
      ];
    }

    return baseRequirements;
  };

  /**
   * Check if current time is within working hours
   */
  const isWorkingHours = (): boolean => {
    const now = new Date();
    const kenyaTime = new Date(now.toLocaleString('en-US', { timeZone: kenyanContext.timezone }));
    const hour = kenyaTime.getHours();
    const day = kenyaTime.getDay();

    // Monday to Friday, 8 AM to 5 PM
    return day >= 1 && day <= 5 && hour >= 8 && hour < 17;
  };

  /**
   * Get localized terms for specific categories
   */
  const getLocalizedTerms = (category: string): Record<string, string> => {
    const terms: Record<string, Record<string, string>> = {
      government: language === 'sw' ? {
        president: 'Rais',
        parliament: 'Bunge',
        senate: 'Seneti',
        assembly: 'Bunge la Kitaifa',
        governor: 'Gavana',
        senator: 'Seneta',
        mp: 'Mbunge',
        mca: 'Mbunge wa Kaunti'
      } : {
        president: 'President',
        parliament: 'Parliament',
        senate: 'Senate',
        assembly: 'National Assembly',
        governor: 'Governor',
        senator: 'Senator',
        mp: 'Member of Parliament',
        mca: 'Member of County Assembly'
      },
      legal: language === 'sw' ? {
        bill: 'Mswada',
        law: 'Sheria',
        act: 'Sheria',
        constitution: 'Katiba',
        amendment: 'Marekebisho',
        petition: 'Ombi',
        hearing: 'Usikilizaji'
      } : {
        bill: 'Bill',
        law: 'Law',
        act: 'Act',
        constitution: 'Constitution',
        amendment: 'Amendment',
        petition: 'Petition',
        hearing: 'Hearing'
      }
    };

    return terms[category] || {};
  };

  const contextValue: KenyanContextType = useMemo(() => ({
    government,
    legalProcesses,
    cultural,
    formatCurrency,
    formatDate,
    formatTime,
    getGovernmentLevel,
    getPublicParticipationRequirements,
    isWorkingHours,
    getLocalizedTerms
  }), [
    government,
    legalProcesses,
    cultural,
    formatCurrency,
    formatDate,
    formatTime,
    getGovernmentLevel,
    getPublicParticipationRequirements,
    isWorkingHours,
    getLocalizedTerms
  ]);

  return (
    <KenyanContext.Provider value={contextValue}>
      {children}
    </KenyanContext.Provider>
  );
};

/**
 * Hook to use Kenyan context
 */
export const useKenyanContext = (): KenyanContextType => {
  const context = useContext(KenyanContext);
  if (!context) {
    throw new Error('useKenyanContext must be used within a KenyanContextProvider');
  }
  return context;
};

export default KenyanContextProvider;
