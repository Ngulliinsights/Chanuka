/* eslint-disable react-refresh/only-export-components */

/**
 * Design System Contexts
 * ======================
 *
 * Context providers for design system standards integration:
 * - BrandVoiceProvider: Microcopy, tone, and voice consistency
 * - LowBandwidthProvider: Network adaptation and offline support
 * - MultilingualProvider: Localization and language support
 */

import { ReactNode } from 'react';

import { BrandVoiceProvider } from './BrandVoiceProvider';
import { LowBandwidthProvider } from './LowBandwidthProvider';
import { MultilingualProvider } from './MultilingualProvider';
import React from 'react';

export { BrandVoiceProvider, useBrandVoice, BrandText, type BrandTextProps } from './BrandVoiceProvider';
export {
  LowBandwidthProvider,
  useLowBandwidth,
  ConditionalBandwidth,
  useBandwidthAware,
  type ConditionalLowBandwidthProps,
} from './LowBandwidthProvider';
export {
  MultilingualProvider,
  useLanguage,
  LanguageSwitcher,
  FormattedNumber,
  FormattedCurrency,
  FormattedDate,
  type LanguageSwitcherProps,
  type FormattedNumberProps,
  type FormattedCurrencyProps,
  type FormattedDateProps,
} from './MultilingualProvider';

/**
 * Combined Provider Wrapper
 * Apply all design system contexts at once
 */

export interface ChanukaProvidersProps {
  children: ReactNode;
  defaultLanguage?: 'en' | 'sw';
}

/**
 * Wrapper component that applies all Chanuka design system contexts
 *
 * Usage:
 *   <ChanukaProviders defaultLanguage="en">
 *     <App />
 *   </ChanukaProviders>
 */
export const ChanukaProviders = ({ children, defaultLanguage = 'en' }: ChanukaProvidersProps) => (
  <MultilingualProvider defaultLanguage={defaultLanguage}>
    <LowBandwidthProvider>
      <BrandVoiceProvider>{children}</BrandVoiceProvider>
    </LowBandwidthProvider>
  </MultilingualProvider>
);

ChanukaProviders.displayName = 'ChanukaProviders';
