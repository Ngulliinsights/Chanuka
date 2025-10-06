import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import NavigationPreferencesComponent from './navigation-preferences';

interface NavigationPreferencesDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const NavigationPreferencesDialog: React.FC<NavigationPreferencesDialogProps> = ({
  trigger,
  open,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleClose = () => {
    handleOpenChange(false);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Settings className="h-4 w-4 mr-2" />
      Navigation Settings
    </Button>
  );

  return (
    <Dialog open={open ?? isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Navigation Preferences</DialogTitle>
          <DialogDescription>
            Customize your navigation experience and default behaviors
          </DialogDescription>
        </DialogHeader>
        <NavigationPreferencesComponent onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
};

export default NavigationPreferencesDialog;