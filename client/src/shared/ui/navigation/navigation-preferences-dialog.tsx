import React from "react";

import { useNavigationPreferences } from "@client/core/navigation/hooks";

import { Button } from "@client/shared/design-system/interactive/Button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../design-system/interactive/dialog";
import { Label } from "@client/shared/design-system/typography/Label.tsx";
import { Switch } from "@client/shared/design-system/interactive/Switch.tsx";


interface NavigationPreferencesDialogProps {
  trigger: React.ReactNode;
}

export const NavigationPreferencesDialog = React.memo<
  NavigationPreferencesDialogProps
>(({ trigger }) => {
  const [open, setOpen] = React.useState(false);
  const { preferences, updatePreferences } = useNavigationPreferences();

  const handlePreferenceChange = (key: string, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Navigation Preferences</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-breadcrumbs"
              checked={preferences.showBreadcrumbs}
              onCheckedChange={(checked: boolean) =>
                handlePreferenceChange("showBreadcrumbs", checked)
              }
            />
            <Label htmlFor="show-breadcrumbs">Show breadcrumbs</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="compact-mode"
              checked={preferences.compactMode}
              onCheckedChange={(checked: boolean) =>
                handlePreferenceChange("compactMode", checked)
              }
            />
            <Label htmlFor="compact-mode">Compact mode</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-expand"
              checked={preferences.autoExpand}
              onCheckedChange={(checked: boolean) =>
                handlePreferenceChange("autoExpand", checked)
              }
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
});

export default NavigationPreferencesDialog;

