/**
 * Unified Privacy Manager Component
 * Accepts a mode prop to render different interfaces
 */

import { PrivacySettings } from '@client/core/auth';

import { CompactInterface } from './CompactInterface';
import { FullInterface } from './FullInterface';
import { ModalInterface } from './ModalInterface';

export type PrivacyMode = 'full' | 'modal' | 'compact';

interface PrivacyManagerProps {
  mode: PrivacyMode;
  settings: PrivacySettings | null;
  onSettingsChange: (settings: PrivacySettings) => void;
  // Modal-specific props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Compact-specific props
  onOpenFullSettings?: () => void;
  className?: string;
}

export function PrivacyManager({
  mode,
  settings,
  onSettingsChange,
  open = false,
  onOpenChange,
  onOpenFullSettings,
  className = ''
}: PrivacyManagerProps) {
  switch (mode) {
    case 'full':
      return (
        <FullInterface
          settings={settings}
          onSettingsChange={onSettingsChange}
          className={className}
        />
      );

    case 'modal':
      if (!onOpenChange) {
        throw new Error('PrivacyManager in modal mode requires onOpenChange prop');
      }
      return (
        <ModalInterface
          open={open}
          onOpenChange={onOpenChange}
          settings={settings}
          onSettingsChange={onSettingsChange}
        />
      );

    case 'compact':
      return (
        <CompactInterface
          settings={settings}
          onSettingsChange={onSettingsChange}
          onOpenFullSettings={onOpenFullSettings}
          className={className}
        />
      );

    default:
      throw new Error(`Invalid privacy mode: ${mode}`);
  }
}