/**
 * Language Switcher Component
 *
 * Provides language switching functionality for English and Kiswahili
 * with Kenyan cultural context adaptation
 *
 * Requirements: 10.1, 10.2, 10.3
 */

import { Globe, Check, ChevronDown } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/shared/design-system';
import { useI18n } from '@client/shared/hooks/use-i18n';

import type { SupportedLanguage } from '../../../utils/i18n';

/**
 * Language information with display names and flags
 */
const LANGUAGE_INFO: Record<
  SupportedLanguage,
  {
    name: string;
    nativeName: string;
    flag: string;
    region: string;
  }
> = {
  en: {
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    region: 'International',
  },
  sw: {
    name: 'Swahili',
    nativeName: 'Kiswahili',
    flag: '🇰🇪',
    region: 'Kenya',
  },
};

/**
 * Language Switcher Props
 */
interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'icon-only';
  showFlag?: boolean;
  showRegion?: boolean;
  className?: string;
}

/**
 * Language Switcher Component
 */
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'default',
  showFlag = true,
  showRegion = false,
  className = '',
}) => {
  const { language, changeLanguage, availableLanguages, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguageInfo = LANGUAGE_INFO[language];

  /**
   * Handle language change
   */
  const handleLanguageChange = (newLanguage: SupportedLanguage) => {
    changeLanguage(newLanguage);
    setIsOpen(false);

    // Announce language change for accessibility
    const announcement = t('common.changeLanguage', {
      current: LANGUAGE_INFO[newLanguage].nativeName,
    });

    // Create temporary announcement element for screen readers
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = announcement;
    document.body.appendChild(announcer);

    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  };

  /**
   * Render compact variant
   */
  if (variant === 'compact') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 ${className}`}
            aria-label={t('common.selectLanguage')}
          >
            {showFlag && <span className="mr-1">{currentLanguageInfo.flag}</span>}
            <span className="text-xs font-medium">{language.toUpperCase()}</span>
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {availableLanguages.map(lang => {
            const langInfo = LANGUAGE_INFO[lang];
            return (
              <DropdownMenuItem
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center">
                  {showFlag && <span className="mr-2">{langInfo.flag}</span>}
                  <span className="text-sm">{langInfo.nativeName}</span>
                </div>
                {language === lang && <Check className="h-4 w-4 text-green-600" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  /**
   * Render icon-only variant
   */
  if (variant === 'icon-only') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${className}`}
            aria-label={t('common.selectLanguage')}
          >
            <Globe className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {availableLanguages.map(lang => {
            const langInfo = LANGUAGE_INFO[lang];
            return (
              <DropdownMenuItem
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center">
                  <span className="mr-2">{langInfo.flag}</span>
                  <div>
                    <div className="text-sm font-medium">{langInfo.nativeName}</div>
                    <div className="text-xs text-gray-500">{langInfo.name}</div>
                  </div>
                </div>
                {language === lang && <Check className="h-4 w-4 text-green-600" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  /**
   * Render default variant
   */
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`flex items-center space-x-2 ${className}`}
          aria-label={t('common.selectLanguage')}
        >
          <Globe className="h-4 w-4" />
          {showFlag && <span>{currentLanguageInfo.flag}</span>}
          <span className="font-medium">{currentLanguageInfo.nativeName}</span>
          {showRegion && (
            <Badge variant="secondary" className="text-xs">
              {currentLanguageInfo.region}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900">{t('common.selectLanguage')}</h4>
        </div>
        {availableLanguages.map(lang => {
          const langInfo = LANGUAGE_INFO[lang];
          return (
            <DropdownMenuItem
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className="flex items-center justify-between cursor-pointer p-3"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{langInfo.flag}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{langInfo.nativeName}</div>
                  <div className="text-xs text-gray-500">
                    {langInfo.name} • {langInfo.region}
                  </div>
                </div>
              </div>
              {language === lang && (
                <div className="flex items-center space-x-1">
                  <Check className="h-4 w-4 text-green-600" />
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                </div>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Simple Language Toggle (for mobile or minimal UI)
 */
export const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, changeLanguage, availableLanguages } = useI18n();

  const toggleLanguage = () => {
    const currentIndex = availableLanguages.indexOf(language);
    const nextIndex = (currentIndex + 1) % availableLanguages.length;
    changeLanguage(availableLanguages[nextIndex]);
  };

  const currentLanguageInfo = LANGUAGE_INFO[language];

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className={`flex items-center space-x-1 ${className}`}
      aria-label={`Switch to ${availableLanguages.find(lang => lang !== language)}`}
    >
      <span>{currentLanguageInfo.flag}</span>
      <span className="text-xs font-medium">{language.toUpperCase()}</span>
    </Button>
  );
};

/**
 * Language Status Indicator (shows current language)
 */
export const LanguageStatus: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language } = useI18n();
  const currentLanguageInfo = LANGUAGE_INFO[language];

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm">{currentLanguageInfo.flag}</span>
      <span className="text-sm text-gray-600">{currentLanguageInfo.nativeName}</span>
    </div>
  );
};

export default LanguageSwitcher;
