#!/usr/bin/env node

/**
 * Functional Validator v3.0 (Unified & Optimized)
 * End-to-End Client Testing & Crawler
 *
 * Validates: Routes (Status/Soft 404), Interactive Elements, A11y, Performance, Network Health
 *
 * Usage:
 *   node functional-validator.js
 *   BASE_URL=http://localhost:3000 node functional-validator.js
 *   PARALLEL=4 DEBUG=true node functional-validator.js
 */

import fs from "fs/promises";
import path from "path";
import { chromium } from "playwright";

// ============================================================================
// LOGGER & UTILITIES
// ============================================================================

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

const Logger = {
  timestamp: () => new Date().toLocaleTimeString(),
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[PASS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[FAIL]${colors.reset} ${msg}`),
  debug: (msg) =>
    process.env.DEBUG &&
    console.log(`${colors.gray}[DEBUG] ${msg}${colors.reset}`),
  header: (msg) =>
    console.log(
      `\n${colors.cyan}${colors.bright}=== ${msg} ===${colors.reset}\n`
    ),
};

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  baseUrl: (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, ""),
  outputDir: "docs",
  reportFile: "functional-validation.md",
  parallelism: Math.max(1, parseInt(process.env.PARALLEL || "2", 10)),
  timeout: 15000,

  // Routes to always test (will be merged with discovered routes)
  routes: ["/", "/about", "/contact", "/login", "/signup", "/dashboard"],

  // Filesystem paths to scan for route discovery
  scanPaths: [
    "src/pages",
    "src/routes",
    "app",
    "pages",
    "client/src/pages",
    "client/src/routes",
  ],

  // Performance and validation thresholds
  thresholds: {
    loadTime: 5000, // Maximum acceptable page load time in ms
    domNodes: 1500, // Maximum DOM nodes (not currently enforced but available)
  },

  // Limits to prevent timeouts on pages with many interactive elements
  limits: {
    buttonsPerPage: 50, // Maximum buttons to validate per page
    linksPerPage: 100, // Maximum links to validate per page
    formsPerPage: 20, // Maximum forms to validate per page
  },

  // Directories and file types to skip during route discovery
  ignoreDirs: [
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage",
    "__tests__",
    ".git",
  ],
  ignoreExtensions: [".css", ".json", ".test.js", ".spec.js", ".d.ts"],
};

// ============================================================================
// STATE & METRICS TRACKING
// ============================================================================

const metrics = {
  startTime: Date.now(),

  // Route statistics
  routesTested: 0,
  routesPassed: 0,
  routesFailed: 0,

  // Interactive element statistics with granularity
  buttons: { total: 0, functional: 0, questionable: 0 },
  links: { total: 0, valid: 0, broken: 0 },
  forms: { total: 0, functional: 0, questionable: 0 },

  // Warning counters
  performanceWarnings: 0,
  accessibilityWarnings: 0,

  // Issue tracking organized by category
  issues: {
    brokenRoutes: [],
    brokenLinks: [],
    nonFunctionalButtons: [],
    nonFunctionalForms: [],
    consoleErrors: [],
    networkErrors: [],
    performance: [],
    accessibility: [],
  },
};

// ============================================================================
// PHASE 1: INTELLIGENT ROUTE DISCOVERY
// ============================================================================

async function discoverRoutes() {
  Logger.header("Phase 1: Route Discovery");
  const foundRoutes = new Set(CONFIG.routes);

  // Recursively walk directory structure looking for route definitions
  async function walk(dir) {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
          // Skip common directories that won't contain route definitions
          if (!CONFIG.ignoreDirs.includes(file.name)) {
            await walk(fullPath);
          }
        } else if (isSourceFile(file.name)) {
          await scanFile(fullPath, foundRoutes);
        }
      }
    } catch (e) {
      Logger.debug(`Cannot access ${dir}: ${e.message}`);
    }
  }

  // Multi-strategy route extraction from source files
  async function scanFile(filePath, set) {
    try {
      const content = await fs.readFile(filePath, "utf8");

      // Strategy 1: React Router declarations like <Route path="/example" />
      const reactMatches = content.matchAll(/<Route\s+path=["']([^"']+)["']/g);
      for (const m of reactMatches) addRoute(m[1], set);

      // Strategy 2: Configuration objects with path properties { path: '/example' }
      const configMatches = content.matchAll(/path:\s*['"`]([^'"`]+)['"`]/g);
      for (const m of configMatches) addRoute(m[1], set);

      // Strategy 3: File-system based routing (Next.js, SvelteKit, etc.)
      if (filePath.match(/\/(pages|app|routes)\//)) {
        const routePart = filePath.split(/\/(pages|app|routes)\//)[1];
        if (!routePart) return;

        let route = routePart
          .replace(/\.(js|jsx|ts|tsx|svelte)$/, "")
          .replace(/index$/, "")
          .replace(/layout$/, "")
          .replace(/page$/, "");

        // Convert dynamic route segments to test values
        route = route
          .replace(/\[\.{3}[^\]]+\]/g, "catch-all") // [...slug] -> catch-all
          .replace(/\[([^\]]+)\]/g, "example"); // [id] -> example

        route = "/" + route;
        addRoute(route, set);
      }
    } catch (e) {
      Logger.debug(`Error reading ${filePath}: ${e.message}`);
    }
  }

  function addRoute(str, set) {
    // Filter out invalid or non-testable routes
    if (!str || str.includes("*") || str.startsWith("http")) return;
    if (str.includes("/api/") || str.includes("/_next/")) return;

    // Normalize route format
    const clean = str.startsWith("/") ? str : `/${str}`;
    const normalized = clean.replace(/\/$/, "") || "/";

    // Replace parameter placeholders with test values
    const testable = normalized
      .replace(/:id(\?)?/g, "1")
      .replace(/:slug(\?)?/g, "example")
      .replace(/:([a-zA-Z_]+)(\?)?/g, "test");

    set.add(testable);
  }

  function isSourceFile(name) {
    if (CONFIG.ignoreExtensions.some((ext) => name.endsWith(ext))) return false;
    return /\.(js|jsx|ts|tsx|svelte)$/.test(name);
  }

  // Execute discovery across all configured paths
  await Promise.all(CONFIG.scanPaths.map((p) => walk(p)));

  const finalRoutes = Array.from(foundRoutes).sort();
  Logger.info(`Discovered ${finalRoutes.length} unique routes to validate`);

  if (finalRoutes.length === 0) {
    Logger.warn("No routes found. Check your scanPaths configuration.");
  }

  return finalRoutes;
}

// ============================================================================
// PHASE 2: COMPREHENSIVE PAGE VALIDATION
// ============================================================================

async function validatePage(page, route) {
  const url = `${CONFIG.baseUrl}${route}`;

  // Collections for monitoring page health
  const pageErrors = [];
  const networkErrors = [];

  // Set up real-time monitoring before navigation
  const consoleListener = (msg) => {
    if (msg.type() === "error") {
      pageErrors.push(msg.text());
    }
  };

  const networkListener = (req) => {
    const failure = req.failure();
    if (failure) {
      networkErrors.push({
        url: req.url(),
        error: failure.errorText,
      });
    }
  };

  page.on("console", consoleListener);
  page.on("requestfailed", networkListener);

  const startTime = Date.now();
  let httpStatus = 0;

  try {
    // Navigate and wait for initial DOM to be ready
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: CONFIG.timeout,
    });
    httpStatus = response ? response.status() : 0;

    // Allow time for client-side hydration and async operations
    try {
      await page.waitForLoadState("networkidle", { timeout: 3000 });
    } catch (e) {
      Logger.debug(`Network idle timeout for ${route} (this is often normal)`);
    }

    const loadTime = Date.now() - startTime;

    // Validation Check 1: HTTP status code
    if (httpStatus >= 400) {
      throw new Error(`HTTP ${httpStatus} error`);
    }

    // Validation Check 2: Soft 404 detection (page renders but shows error content)
    const bodyText = await page.textContent("body");
    const lowerBody = bodyText.toLowerCase();
    if (
      lowerBody.includes("page not found") ||
      lowerBody.includes("404 error") ||
      lowerBody.includes("something went wrong")
    ) {
      throw new Error("Soft 404 detected (error content visible in UI)");
    }

    // Validation Check 3: Performance metrics
    if (loadTime > CONFIG.thresholds.loadTime) {
      metrics.performanceWarnings++;
      metrics.issues.performance.push({
        route,
        loadTime,
        threshold: CONFIG.thresholds.loadTime,
        message: `Slow load time: ${loadTime}ms exceeds ${CONFIG.thresholds.loadTime}ms threshold`,
      });
    }

    // Validation Check 4: Interactive elements (buttons, links, forms)
    await validateInteractiveElements(page, route);

    // Validation Check 5: Basic accessibility compliance
    await validateAccessibility(page, route);

    // Record non-critical issues without failing the route
    if (pageErrors.length > 0) {
      metrics.issues.consoleErrors.push({
        route,
        errors: pageErrors.slice(0, 5), // Limit to first 5 to avoid noise
      });
    }

    if (networkErrors.length > 0) {
      metrics.issues.networkErrors.push({
        route,
        errors: networkErrors.slice(0, 5),
      });
    }

    // Success: route is accessible and functional
    metrics.routesPassed++;
    Logger.success(
      `${route.padEnd(35)} ${colors.gray}(${loadTime}ms)${colors.reset}`
    );

    return true;
  } catch (error) {
    // Failure: route is broken or inaccessible
    metrics.routesFailed++;
    metrics.issues.brokenRoutes.push({
      route,
      status: httpStatus || "N/A",
      error: error.message,
    });
    Logger.error(`${route.padEnd(35)} ${error.message}`);

    return false;
  } finally {
    // Clean up event listeners to prevent memory leaks
    page.off("console", consoleListener);
    page.off("requestfailed", networkListener);
  }
}

// ============================================================================
// INTERACTIVE ELEMENT VALIDATION
// ============================================================================

async function validateInteractiveElements(page, route) {
  // Validate buttons with handler detection
  await validateButtons(page, route);

  // Validate links for broken hrefs
  await validateLinks(page, route);

  // Validate forms for submit handlers
  await validateForms(page, route);
}

async function validateButtons(page, route) {
  try {
    const buttons = await page
      .locator(
        'button:visible, [role="button"]:visible, input[type="submit"]:visible'
      )
      .all();
    const limit = Math.min(buttons.length, CONFIG.limits.buttonsPerPage);

    metrics.buttons.total += buttons.length;
    Logger.debug(
      `Validating ${limit} of ${buttons.length} buttons on ${route}`
    );

    for (let i = 0; i < limit; i++) {
      try {
        const button = buttons[i];

        // Skip disabled buttons as they're intentionally non-interactive
        if (await button.isDisabled()) continue;

        // Extract identifying information for reporting
        const buttonText = await button.textContent().catch(() => "");
        const ariaLabel = await button
          .getAttribute("aria-label")
          .catch(() => "");
        const identifier = (buttonText || ariaLabel || `Button ${i}`)
          .trim()
          .substring(0, 50);

        // Check for presence of click handlers using multiple detection strategies
        const hasHandler = await button.evaluate((el) => {
          // Direct onclick property
          if (el.onclick !== null) return true;

          // HTML onclick attribute
          if (el.hasAttribute("onclick")) return true;

          // Framework-specific event bindings
          const frameworks = ["ng-click", "@click", "v-on:click", "x-on:click"];
          if (frameworks.some((attr) => el.hasAttribute(attr))) return true;

          // Button inside a form (submit buttons)
          if (el.closest("form") !== null) return true;

          // Data attributes often used for JS event binding
          const dataKeys = Object.keys(el.dataset || {});
          if (dataKeys.some((key) => key.toLowerCase().includes("click")))
            return true;

          return false;
        });

        if (hasHandler) {
          metrics.buttons.functional++;
          Logger.debug(`Button "${identifier}" has click handler`);
        } else {
          metrics.buttons.questionable++;
          metrics.issues.nonFunctionalButtons.push({
            route,
            button: identifier,
            reason:
              "No click handler detected (may be handled by parent or framework)",
          });
          Logger.debug(`Button "${identifier}" has no detectable handler`);
        }
      } catch (error) {
        Logger.debug(`Error validating button ${i}: ${error.message}`);
      }
    }
  } catch (error) {
    Logger.debug(
      `Error during button validation on ${route}: ${error.message}`
    );
  }
}

async function validateLinks(page, route) {
  try {
    const links = await page.locator("a[href]:visible").all();
    const limit = Math.min(links.length, CONFIG.limits.linksPerPage);

    metrics.links.total += links.length;
    Logger.debug(`Validating ${limit} of ${links.length} links on ${route}`);

    for (let i = 0; i < limit; i++) {
      try {
        const link = links[i];
        const href = await link.getAttribute("href");

        // Skip anchor links and special protocols
        if (
          !href ||
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:")
        ) {
          continue;
        }

        // Check for obviously malformed URLs
        const malformedPatterns = [
          "undefined",
          "null",
          "[object Object]",
          "NaN",
        ];
        if (malformedPatterns.some((pattern) => href.includes(pattern))) {
          const linkText = await link.textContent();
          metrics.links.broken++;
          metrics.issues.brokenLinks.push({
            route,
            link: linkText.trim().substring(0, 50),
            href,
            reason: "Malformed URL contains invalid value",
          });
          Logger.debug(`Broken link found: "${linkText.trim()}" -> ${href}`);
        } else {
          metrics.links.valid++;
        }
      } catch (error) {
        Logger.debug(`Error validating link ${i}: ${error.message}`);
      }
    }
  } catch (error) {
    Logger.debug(`Error during link validation on ${route}: ${error.message}`);
  }
}

async function validateForms(page, route) {
  try {
    const forms = await page.locator("form").all();
    const limit = Math.min(forms.length, CONFIG.limits.formsPerPage);

    metrics.forms.total += forms.length;
    Logger.debug(`Validating ${limit} of ${forms.length} forms on ${route}`);

    for (let i = 0; i < limit; i++) {
      try {
        const form = forms[i];

        // Check for submit handling through multiple strategies
        const hasSubmitHandler = await form.evaluate((el) => {
          // HTML action attribute
          if (el.hasAttribute("action")) return true;

          // JavaScript onsubmit
          if (el.onsubmit !== null) return true;

          // Framework-specific submit bindings
          const frameworks = [
            "onsubmit",
            "ng-submit",
            "@submit",
            "v-on:submit",
            "x-on:submit",
          ];
          if (frameworks.some((attr) => el.hasAttribute(attr))) return true;

          return false;
        });

        if (hasSubmitHandler) {
          metrics.forms.functional++;
          Logger.debug(`Form ${i} has submit handler`);
        } else {
          metrics.forms.questionable++;
          metrics.issues.nonFunctionalForms.push({
            route,
            form: `Form ${i}`,
            reason: "No submit handler detected (may use custom JavaScript)",
          });
          Logger.debug(`Form ${i} has no detectable submit handler`);
        }
      } catch (error) {
        Logger.debug(`Error validating form ${i}: ${error.message}`);
      }
    }
  } catch (error) {
    Logger.debug(`Error during form validation on ${route}: ${error.message}`);
  }
}

// ============================================================================
// ACCESSIBILITY VALIDATION
// ============================================================================

async function validateAccessibility(page, route) {
  try {
    // Check 1: Images without alt text
    const imagesWithoutAlt = await page.locator("img:not([alt])").count();
    if (imagesWithoutAlt > 0) {
      metrics.accessibilityWarnings++;
      metrics.issues.accessibility.push({
        route,
        severity: "medium",
        issue: `${imagesWithoutAlt} images missing alt text`,
      });
    }

    // Check 2: Buttons without accessible labels
    const unlabeledButtons = await page
      .locator("button:not([aria-label]):not([title])")
      .evaluateAll(
        (buttons) => buttons.filter((btn) => !btn.textContent?.trim()).length
      );

    if (unlabeledButtons > 0) {
      metrics.accessibilityWarnings++;
      metrics.issues.accessibility.push({
        route,
        severity: "high",
        issue: `${unlabeledButtons} buttons without accessible labels`,
      });
    }

    // Check 3: Form inputs without labels
    const unlabeledInputs = await page.evaluate(() => {
      const inputs = document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"])'
      );
      return Array.from(inputs).filter((input) => {
        const hasLabel =
          input.hasAttribute("aria-label") ||
          input.hasAttribute("aria-labelledby") ||
          document.querySelector(`label[for="${input.id}"]`) !== null;
        return !hasLabel;
      }).length;
    });

    if (unlabeledInputs > 0) {
      metrics.accessibilityWarnings++;
      metrics.issues.accessibility.push({
        route,
        severity: "high",
        issue: `${unlabeledInputs} form inputs without labels`,
      });
    }
  } catch (error) {
    Logger.debug(`Error checking accessibility for ${route}: ${error.message}`);
  }
}

// ============================================================================
// PARALLEL EXECUTION ENGINE
// ============================================================================

async function worker(browser, queue) {
  // Each worker gets its own browser context for isolation
  const context = await browser.newContext({
    userAgent: "FunctionalValidator/3.0",
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  // Process routes from the shared queue until empty
  while (queue.length > 0) {
    const route = queue.shift();
    if (route) {
      metrics.routesTested++;
      await validatePage(page, route);

      // Brief pause between pages to avoid overwhelming the server
      await page.waitForTimeout(200);
    }
  }

  await context.close();
}

async function executeValidation(browser, routes) {
  Logger.header(
    `Phase 2: Validation (${routes.length} routes, ${CONFIG.parallelism} workers)`
  );

  // Create a shared work queue
  const queue = [...routes];

  // Spin up worker pool
  const workers = Array(CONFIG.parallelism)
    .fill(null)
    .map(() => worker(browser, queue));

  // Wait for all workers to complete
  await Promise.all(workers);
}

// ============================================================================
// COMPREHENSIVE REPORT GENERATION
// ============================================================================

async function generateReport() {
  Logger.info("Generating validation report...");

  const reportPath = path.join(CONFIG.outputDir, CONFIG.reportFile);
  await fs.mkdir(CONFIG.outputDir, { recursive: true });

  const duration = Date.now() - metrics.startTime;
  const successRate =
    metrics.routesTested > 0 ?
      ((metrics.routesPassed / metrics.routesTested) * 100).toFixed(1)
    : 0;

  // Build comprehensive markdown report
  const sections = [];

  // Header and metadata
  sections.push(
    `# Functional Validation Report`,
    ``,
    `**Generated:** ${new Date().toLocaleString()}  `,
    `**Target:** ${CONFIG.baseUrl}  `,
    `**Duration:** ${formatDuration(duration)}  `,
    `**Validator:** v3.0`,
    ``
  );

  // Executive summary table
  sections.push(
    `## 📊 Executive Summary`,
    ``,
    `| Metric | Value |`,
    `| :--- | :---: |`,
    `| **Routes Tested** | ${metrics.routesTested} |`,
    `| **Success Rate** | ${successRate}% |`,
    `| **Routes Passed** | ${metrics.routesPassed} |`,
    `| **Routes Failed** | ${metrics.routesFailed} |`,
    `| **Buttons Validated** | ${metrics.buttons.total} (${metrics.buttons.functional} functional, ${metrics.buttons.questionable} questionable) |`,
    `| **Links Validated** | ${metrics.links.total} (${metrics.links.valid} valid, ${metrics.links.broken} broken) |`,
    `| **Forms Validated** | ${metrics.forms.total} (${metrics.forms.functional} functional, ${metrics.forms.questionable} questionable) |`,
    `| **Performance Warnings** | ${metrics.performanceWarnings} |`,
    `| **Accessibility Warnings** | ${metrics.accessibilityWarnings} |`,
    ``
  );

  // Status indicator
  if (metrics.routesFailed === 0 && metrics.links.broken === 0) {
    sections.push(`✅ **All validation checks passed!**`, ``);
  } else {
    sections.push(`⚠️ **Issues detected - review sections below**`, ``);
  }

  // Broken routes section
  if (metrics.issues.brokenRoutes.length > 0) {
    sections.push(
      `## 🔴 Broken Routes`,
      ``,
      `The following routes failed to load or displayed error content:`,
      ``
    );
    metrics.issues.brokenRoutes.forEach((issue) => {
      sections.push(
        `### ${issue.route}`,
        `- **Status:** ${issue.status}`,
        `- **Error:** ${issue.error}`,
        ``
      );
    });
  }

  // Link issues section
  if (metrics.issues.brokenLinks.length > 0) {
    sections.push(
      `## 🔗 Broken Links`,
      ``,
      `Links with malformed or invalid URLs:`,
      ``
    );
    metrics.issues.brokenLinks.forEach((issue) => {
      sections.push(
        `- **[${issue.route}]** "${issue.link}"`,
        `  - URL: \`${issue.href}\``,
        `  - Issue: ${issue.reason}`,
        ``
      );
    });
  }

  // Non-functional buttons section
  if (metrics.issues.nonFunctionalButtons.length > 0) {
    const displayCount = Math.min(
      metrics.issues.nonFunctionalButtons.length,
      25
    );
    sections.push(
      `## 🔘 Questionable Buttons`,
      ``,
      `Buttons without detected click handlers (showing first ${displayCount}):`,
      ``,
      `*Note: Some buttons may be functional via parent handlers or framework magic not detected by static analysis.*`,
      ``
    );
    metrics.issues.nonFunctionalButtons
      .slice(0, displayCount)
      .forEach((issue) => {
        sections.push(
          `- **[${issue.route}]** "${issue.button}"`,
          `  - ${issue.reason}`,
          ``
        );
      });
    if (metrics.issues.nonFunctionalButtons.length > displayCount) {
      sections.push(
        `*...and ${metrics.issues.nonFunctionalButtons.length - displayCount} more*`,
        ``
      );
    }
  }

  // Non-functional forms section
  if (metrics.issues.nonFunctionalForms.length > 0) {
    sections.push(
      `## 📝 Questionable Forms`,
      ``,
      `Forms without detected submit handlers:`,
      ``
    );
    metrics.issues.nonFunctionalForms.forEach((issue) => {
      sections.push(
        `- **[${issue.route}]** ${issue.form}`,
        `  - ${issue.reason}`,
        ``
      );
    });
  }

  // Performance issues section
  if (metrics.issues.performance.length > 0) {
    sections.push(
      `## ⚡ Performance Issues`,
      ``,
      `Routes exceeding performance thresholds:`,
      ``
    );
    metrics.issues.performance.forEach((issue) => {
      sections.push(
        `- **${issue.route}**`,
        `  - Load time: ${issue.loadTime}ms (threshold: ${issue.threshold}ms)`,
        ``
      );
    });
  }

  // Accessibility warnings section
  if (metrics.issues.accessibility.length > 0) {
    const displayCount = Math.min(metrics.issues.accessibility.length, 20);
    sections.push(
      `## ♿ Accessibility Warnings`,
      ``,
      `Accessibility issues detected (showing first ${displayCount}):`,
      ``
    );
    metrics.issues.accessibility.slice(0, displayCount).forEach((issue) => {
      sections.push(
        `- **[${issue.route}]** [${issue.severity.toUpperCase()}]`,
        `  - ${issue.issue}`,
        ``
      );
    });
    if (metrics.issues.accessibility.length > displayCount) {
      sections.push(
        `*...and ${metrics.issues.accessibility.length - displayCount} more*`,
        ``
      );
    }
  }

  // Console errors section
  if (metrics.issues.consoleErrors.length > 0) {
    const displayCount = Math.min(metrics.issues.consoleErrors.length, 15);
    sections.push(
      `## 🖥️ Console Errors`,
      ``,
      `JavaScript errors logged to console (showing first ${displayCount}):`,
      ``
    );
    metrics.issues.consoleErrors.slice(0, displayCount).forEach((issue) => {
      sections.push(`### ${issue.route}`, ``);
      issue.errors.forEach((error) => {
        const truncated = error.substring(0, 300);
        sections.push(`\`\`\``, truncated, `\`\`\``, ``);
      });
    });
    if (metrics.issues.consoleErrors.length > displayCount) {
      sections.push(
        `*...and ${metrics.issues.consoleErrors.length - displayCount} more routes with errors*`,
        ``
      );
    }
  }

  // Network errors section
  if (metrics.issues.networkErrors.length > 0) {
    const displayCount = Math.min(metrics.issues.networkErrors.length, 15);
    sections.push(
      `## 🌐 Network Errors`,
      ``,
      `Failed network requests (showing first ${displayCount}):`,
      ``
    );
    metrics.issues.networkErrors.slice(0, displayCount).forEach((issue) => {
      sections.push(`### ${issue.route}`, ``);
      issue.errors.forEach((error) => {
        sections.push(`- **${error.url}**`, `  - Error: ${error.error}`, ``);
      });
    });
    if (metrics.issues.networkErrors.length > displayCount) {
      sections.push(
        `*...and ${metrics.issues.networkErrors.length - displayCount} more routes with network issues*`,
        ``
      );
    }
  }

  // Write report to disk
  const markdown = sections.join("\n");
  await fs.writeFile(reportPath, markdown);

  Logger.success(`Report saved to: ${reportPath}`);
  return reportPath;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  // Display startup banner
  console.log(colors.cyan + colors.bright);
  console.log(
    "╔═══════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║         Functional Validator v3.0 - Unified Edition          ║"
  );
  console.log(
    "║              End-to-End Client Testing Suite                  ║"
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════╝"
  );
  console.log(colors.reset);

  Logger.info(`Target: ${CONFIG.baseUrl}`);
  Logger.info(`Output: ${path.join(CONFIG.outputDir, CONFIG.reportFile)}`);
  Logger.info(`Workers: ${CONFIG.parallelism}`);
  Logger.info(`Debug: ${process.env.DEBUG ? "enabled" : "disabled"}`);

  // Phase 1: Discover all routes
  const routes = await discoverRoutes();
  if (routes.length === 0) {
    Logger.error(
      "No routes found to test. Check your configuration and source paths."
    );
    process.exit(1);
  }

  // Phase 2: Validate discovered routes
  Logger.info("Launching browser...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // Helps in CI environments
  });

  try {
    await executeValidation(browser, routes);
    await generateReport();

    // Display summary
    Logger.header("Validation Complete");

    console.log(colors.bright + "Results:" + colors.reset);
    console.log(
      `  Routes:     ${colors.green}${metrics.routesPassed} passed${colors.reset}, ${metrics.routesFailed > 0 ? colors.red : colors.gray}${metrics.routesFailed} failed${colors.reset}`
    );
    console.log(
      `  Buttons:    ${colors.green}${metrics.buttons.functional} functional${colors.reset}, ${metrics.buttons.questionable > 0 ? colors.yellow : colors.gray}${metrics.buttons.questionable} questionable${colors.reset}`
    );
    console.log(
      `  Links:      ${colors.green}${metrics.links.valid} valid${colors.reset}, ${metrics.links.broken > 0 ? colors.red : colors.gray}${metrics.links.broken} broken${colors.reset}`
    );
    console.log(
      `  Forms:      ${colors.green}${metrics.forms.functional} functional${colors.reset}, ${metrics.forms.questionable > 0 ? colors.yellow : colors.gray}${metrics.forms.questionable} questionable${colors.reset}`
    );

    if (metrics.performanceWarnings > 0) {
      console.log(
        `  Performance: ${colors.yellow}${metrics.performanceWarnings} warnings${colors.reset}`
      );
    }
    if (metrics.accessibilityWarnings > 0) {
      console.log(
        `  A11y:       ${colors.yellow}${metrics.accessibilityWarnings} warnings${colors.reset}`
      );
    }

    console.log(
      `\n  Duration: ${colors.cyan}${formatDuration(Date.now() - metrics.startTime)}${colors.reset}\n`
    );

    // Exit with appropriate code for CI/CD pipelines
    const hasFailures = metrics.routesFailed > 0 || metrics.links.broken > 0;
    process.exit(hasFailures ? 1 : 0);
  } finally {
    await browser.close();
  }
}

// Execute with error handling
main().catch((error) => {
  Logger.error(`Fatal error: ${error.message}`);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
