/**
 * Modal Privacy Interface Component
 * Modal wrapper for dashboard integration
 */

import React from 'react';

import { PrivacySettings } from '@client/infrastructure/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/lib/design-system/interactive/Dialog';

import { FullInterface } from './FullInterface';

interface ModalInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PrivacySettings | null;
  onSettingsChange: (settings: PrivacySettings) => void;
}

export function ModalInterface({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: ModalInterfaceProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Privacy Settings</DialogTitle>
          <DialogDescription>
            Manage your privacy preferences and data protection settings.
          </DialogDescription>
        </DialogHeader>

        <FullInterface settings={settings} onSettingsChange={onSettingsChange} />
      </DialogContent>
    </Dialog>
  );
}
