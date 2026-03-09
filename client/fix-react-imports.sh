#!/bin/bash

# Script to add React imports to files that use React.memo, React.FC, etc. but don't import React

echo "Fixing React imports in client files..."

# List of files that need React import added
files=(
  "src/features/home/pages/core-home.tsx"
  "src/features/pretext-detection/ui/CivicActionToolbox.tsx"
  "src/features/pretext-detection/ui/PretextDetectionPanel.tsx"
  "src/infrastructure/browser/FeatureFallbacks.tsx"
  "src/infrastructure/browser/useBrowserStatus.tsx"
  "src/infrastructure/error/components/CommunityErrorBoundary.tsx"
  "src/infrastructure/error/messages/use-error-messages.ts"
  "src/infrastructure/security/ui/privacy/DataUsageReportDashboard.tsx"
  "src/infrastructure/storage/asset-loading/AssetLoadingProvider.tsx"
  "src/lib/ui/loading/GlobalLoadingIndicator.tsx"
  "src/lib/ui/loading/ScriptFallback.tsx"
  "src/lib/ui/mobile/BottomSheet.tsx"
  "src/lib/ui/mobile/interaction/MobileBottomSheet.tsx"
  "src/lib/ui/mobile/layout/MobileHeader.tsx"
  "src/lib/ui/mobile/interaction/SwipeGestures.tsx"
  "src/lib/ui/privacy/FullInterface.tsx"
  "src/lib/ui/navigation/ProgressiveDisclosureNavigation.tsx"
  "src/lib/ui/navigation/ui/DesktopSidebar.tsx"
  "src/lib/ui/virtual-list/VirtualList.tsx"
  "src/lib/utils/react-helpers.ts"
  "src/lib/ui/utils/error-handling.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Check if React is already imported
    if ! grep -q "^import React" "$file"; then
      echo "Adding React import to $file"
      # Add React import after the first comment block or at the top
      sed -i '1s/^/import React from '\''react'\'';\n/' "$file"
    else
      echo "React already imported in $file"
    fi
  else
    echo "File not found: $file"
  fi
done

echo "Done!"
