import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigationPreferences } from '@/hooks/use-navigation-preferences';

interface NavigationPreferencesDialogProps {
  trigger: React.ReactNode;
}

export const NavigationPreferencesDialog: React.FC<NavigationPreferencesDialogProps> = ({ trigger }) => {
  const [open, setOpen] = React.useState(false);
  const { preferences, updatePreferences } = useNavigationPreferences();

  const handlePreferenceChange = (key: string, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Navigation Preferences</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-breadcrumbs"
              checked={preferences.showBreadcrumbs}
              onCheckedChange={(checked) => handlePreferenceChange('showBreadcrumbs', checked)}
            />
            <Label htmlFor="show-breadcrumbs">Show breadcrumbs</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="compact-mode"
              checked={preferences.compactMode}
              onCheckedChange={(checked) => handlePreferenceChange('compactMode', checked)}
            />
            <Label htmlFor="compact-mode">Compact mode</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-expand"
              checked={preferences.autoExpand}
              onCheckedChange={(checked) => handlePreferenceChange('autoExpand', checked)}
            />
            <Label htmlFor="auto-expand">Auto-expand sections</Label>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setOpen(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NavigationPreferencesDialog;