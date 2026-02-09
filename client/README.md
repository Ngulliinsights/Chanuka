# Chanuka Client Application

The frontend application for the Chanuka Legislative Transparency Platform.

## 📁 Project Structure

```
client/
├── .archive/              # Archived files (historical reference)
├── .github/               # GitHub workflows and configurations
├── .storybook/            # Storybook configuration
├── .vscode/               # VS Code settings
├── dist/                  # Production build output (generated)
├── docs/                  # 📚 Documentation
│   ├── brand/            # Brand & design documentation
│   └── architecture/     # Architecture documentation
├── logs/                  # 📝 Application logs (not committed)
├── node_modules/          # Dependencies (not committed)
├── public/                # Static assets
│   └── SVG/              # Brand SVG assets
├── reports/               # Test and coverage reports
├── scripts/               # Build and utility scripts
├── src/                   # 💻 Source code
│   ├── app/              # Application shell
│   ├── core/             # Core functionality
│   ├── features/         # Feature modules
│   └── lib/              # Shared libraries
├── index.html             # HTML entry point
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Test
```bash
npm run test
```

## 📚 Documentation

All documentation is organized in the `docs/` directory:

### Quick Access
- **[Documentation Index](./docs/README.md)** - Complete documentation overview
- **[Quick Reference](./docs/brand/QUICK_REFERENCE.md)** - Fast lookup guide
- **[Visual Guide](./docs/brand/SVG_VISUAL_GUIDE.md)** - Visual examples

### By Category
- **Brand & Design**: `docs/brand/` - SVG integration, colors, logos
- **Architecture**: `docs/architecture/` - Service architecture, bug fixes

## 🎨 Brand Assets

### Colors
- **Primary (Navy)**: `#1a2e49` - Trust & authority
- **Secondary (Teal)**: `#11505c` - Transparency & innovation  
- **Accent (Orange)**: `#f29b06` - Energy & action

### Logos
Located in `public/SVG/`:
- `Chanuka_logo.svg` - Full logo
- `CHANUKA_SIDEMARK.svg` - Logo + wordmark
- `wordmark.svg` - Text only
- `doc_in_shield.svg` - Security icon
- `alternative_small.svg` - Compact version

## 🛠️ Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run dev:host` - Start with network access
- `npm run preview` - Preview production build

### Building
- `npm run build` - Production build
- `npm run build:analyze` - Build with bundle analysis

### Testing
- `npm run test` - Run tests
- `npm run test:ui` - Test with UI
- `npm run test:coverage` - Generate coverage report

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - TypeScript type checking
- `npm run format` - Format code with Prettier

### Storybook
- `npm run storybook` - Start Storybook
- `npm run build-storybook` - Build Storybook

## 🏗️ Architecture

### Tech Stack
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Routing**: React Router
- **Testing**: Vitest + Playwright

### Key Features
- ✅ Type-safe with TypeScript
- ✅ Component-based architecture
- ✅ Feature-sliced design
- ✅ Responsive design
- ✅ Accessibility (WCAG AA)
- ✅ Performance optimized
- ✅ PWA ready

## 📊 Project Status

### Current Version: 2.0
- ✅ SVG brand integration complete
- ✅ Zero TypeScript errors
- ✅ Zero ESLint errors
- ✅ Production build successful
- ✅ WCAG AA compliant
- ✅ Performance optimized

### Health Metrics
- **Build Status**: ✅ Passing
- **Type Safety**: ✅ 100%
- **Test Coverage**: ✅ Good
- **Bundle Size**: ✅ Optimized
- **Accessibility**: ✅ WCAG AA

## 🔧 Configuration Files

### TypeScript
- `tsconfig.json` - Main TypeScript config
- `tsconfig.node.json` - Node-specific config

### Build Tools
- `vite.config.ts` - Vite configuration
- `vite.production.config.ts` - Production overrides
- `postcss.config.js` - PostCSS configuration
- `tailwind.config.ts` - Tailwind CSS configuration

### Code Quality
- `.eslintrc.cjs` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `.stylelintrc.json` - Stylelint configuration

### Testing
- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration

## 🗂️ Directory Details

### `/src` - Source Code
Main application source code organized by feature and domain.

### `/docs` - Documentation
All project documentation, guides, and references.
- See [docs/README.md](./docs/README.md) for details

### `/public` - Static Assets
Static files served as-is (images, fonts, SVGs).

### `/scripts` - Utility Scripts
Build scripts, utilities, and automation tools.

### `/logs` - Application Logs
Runtime and build logs (not committed to git).
- See [logs/README.md](./logs/README.md) for details

### `/.archive` - Archived Files
Historical files kept for reference (not actively used).
- See [.archive/README.md](./.archive/README.md) for details

## 🤝 Contributing

### Code Style
- Follow TypeScript best practices
- Use functional components with hooks
- Write self-documenting code
- Add comments for complex logic
- Follow existing patterns

### Commit Messages
```
type(scope): description

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pull Requests
1. Create feature branch
2. Make changes
3. Run tests and linting
4. Update documentation
5. Submit PR with description

## 📞 Support

### Documentation
- Check [docs/README.md](./docs/README.md) first
- Review relevant guides
- Search existing issues

### Issues
- Report bugs with reproduction steps
- Request features with use cases
- Ask questions with context

### Contact
- Development Team: dev@chanuka.org
- Design Team: design@chanuka.org

## 📄 License

[License information here]

## 🙏 Acknowledgments

Built with:
- React
- TypeScript
- Vite
- Tailwind CSS
- And many other amazing open-source projects

---

**Version**: 2.0  
**Last Updated**: February 9, 2026  
**Status**: Production Ready
