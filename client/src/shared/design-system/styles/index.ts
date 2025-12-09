// Chanuka Design System Styles Export
// This file exports all CSS files for the design system

// Import all CSS files to ensure they're included in the build
import './chanuka-design-system.css';
import './accessibility.css';
import './design-tokens.css';
import './fallbacks.css';
import './fix-build-errors.css';
import './generated-tokens.css';
import './globals.css';

// Import subdirectories
import './base/base.css';
import './components/buttons.css';
import './components/forms.css';
import './components/layout.css';
import './components/ui.css';
import './components/progressive-disclosure.css';

import './responsive/desktop.css';
import './responsive/mobile.css';
import './responsive/special.css';
import './responsive/tablet.css';


import './utilities/accessibility.css';
import './utilities/animations.css';

// Re-export for programmatic access if needed
export const STYLES_LOADED = true;