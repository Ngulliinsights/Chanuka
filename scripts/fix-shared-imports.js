#!/usr/bin/env node

/**
 * Script to fix @shared/core imports in client code
 * Replaces problematic imports with local alternatives
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!file.includes("node_modules") && !file.includes("dist")) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// Define replacement mappings
const replacements = [
  {
    from: "import { logger } from '@shared/core';",
    to: "import { logger } from '../utils/logger';",
  },
  {
    from: "import { logger } from '@shared/core';",
    to: "import { logger } from '../../utils/logger';",
  },
  {
    from: "import { logger } from '@shared/core';",
    to: "import { logger } from '../../../utils/logger';",
  },
  {
    from: "from '@shared/core/validation'",
    to: "from '../utils/logger'",
  },
  {
    from: "from '@shared/i18n/en'",
    to: "from '../utils/i18n'",
  },
  {
    from: "from '@shared/core/testing'",
    to: "from '../shared/testing'",
  },
];

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let modified = false;

    // Determine the correct relative path based on file location
    const relativePath = path.relative("client/src", filePath);
    const depth = relativePath.split("/").length - 1;
    const relativePrefix = "../".repeat(depth);

    // Replace @shared/core logger imports with correct relative path
    const loggerImportRegex =
      /import\s*{\s*logger\s*}\s*from\s*['"]@shared\/core['"];?/g;
    if (loggerImportRegex.test(content)) {
      content = content.replace(
        loggerImportRegex,
        `import { logger } from '${relativePrefix}utils/logger';`
      );
      modified = true;
    }

    // Also fix the incorrect paths we just created
    const incorrectLoggerRegex =
      /import\s*{\s*logger\s*}\s*from\s*['"]utils\/logger['"];?/g;
    if (incorrectLoggerRegex.test(content)) {
      content = content.replace(
        incorrectLoggerRegex,
        `import { logger } from '${relativePrefix}utils/logger';`
      );
      modified = true;
    }

    // Replace other @shared imports
    if (content.includes("from '@shared/core/validation'")) {
      content = content.replace(
        /from\s*['"]@shared\/core\/validation['"]/g,
        `from '${relativePrefix}utils/logger'`
      );
      modified = true;
    }

    if (content.includes("from '@shared/i18n/en'")) {
      content = content.replace(
        /from\s*['"]@shared\/i18n\/en['"]/g,
        `from '${relativePrefix}utils/i18n'`
      );
      modified = true;
    }

    // Also fix incorrect i18n paths
    const incorrectI18nRegex = /from\s*['"]utils\/i18n['"]/g;
    if (incorrectI18nRegex.test(content)) {
      content = content.replace(
        incorrectI18nRegex,
        `from '${relativePrefix}utils/i18n'`
      );
      modified = true;
    }

    if (content.includes("from '@shared/core/testing'")) {
      content = content.replace(
        /from\s*['"]@shared\/core\/testing['"]/g,
        `from '${relativePrefix}shared/testing'`
      );
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Fixed imports in: ${filePath}`);
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function main() {
  console.log("🔧 Fixing @shared/core imports in client code...\n");

  // Find all TypeScript/TSX files in client/src
  const clientSrcPath = path.join(__dirname, "..", "client", "src");
  const files = getAllFiles(clientSrcPath);

  let totalFixed = 0;

  files.forEach((file) => {
    totalFixed += fixImportsInFile(file);
  });

  console.log(`\n✅ Fixed imports in ${totalFixed} files`);
  console.log("🚀 Run TypeScript check to verify fixes");
}

main();
