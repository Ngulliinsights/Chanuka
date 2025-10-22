/**
 * Vite Plugin for Automated Bundle Analysis
 * Integrates bundle analysis into the build process
 */

const fs = require('fs');
const path = require('path');

function bundleAnalysisPlugin(options = {}) {
  const opts = {
    outputDir: options.outputDir || 'bundle-reports',
    failOnScore: options.failOnScore || 0,
    failOnSize: options.failOnSize || 0,
    compareBaseline: options.compareBaseline || false,
    baselineFile: options.baselineFile || 'bundle-baseline.json',
    generateReports: options.generateReports || ['html', 'json'],
    verbose: options.verbose || false,
    ...options
  };

  let analysisResults = null;
  let buildStartTime = 0;

  return {
    name: 'bundle-analysis',

    buildStart() {
      buildStartTime = Date.now();
      if (opts.verbose) {
        console.log('📦 Bundle analysis plugin initialized');
      }
    },

    generateBundle(options, bundle) {
      // Analyze the generated bundle
      const analysis = analyzeGeneratedBundle(bundle, opts);

      // Store results for later use
      analysisResults = {
        ...analysis,
        buildTime: Date.now() - buildStartTime,
        timestamp: new Date().toISOString()
      };

      if (opts.verbose) {
        console.log(`📊 Bundle analysis completed in ${analysisResults.buildTime}ms`);
        console.log(`   Efficiency Score: ${analysis.performanceMetrics.efficiencyScore}/100`);
        console.log(`   Total Size: ${formatBytes(analysis.performanceMetrics.totalSize)}`);
      }
    },

    buildEnd() {
      if (!analysisResults) return;

      // Generate reports
      generateAnalysisReports(analysisResults, opts);

      // Check thresholds
      const passed = checkAnalysisThresholds(analysisResults, opts);

      if (!passed) {
        const message = 'Bundle analysis failed: thresholds exceeded';
        if (opts.failOnError !== false) {
          throw new Error(message);
        } else {
          console.warn(`⚠️  ${message}`);
        }
      }

      // Compare with baseline if enabled
      if (opts.compareBaseline) {
        compareWithBaselineAnalysis(analysisResults, opts);
      }
    }
  };
}

function analyzeGeneratedBundle(bundle, options) {
  const files = [];
  let totalSize = 0;
  let gzippedSize = 0;

  // Analyze each chunk in the bundle
  Object.entries(bundle).forEach(([fileName, chunk]) => {
    if (chunk.type === 'chunk') {
      const size = chunk.code.length;
      const gzippedSizeEstimate = Math.floor(size * 0.3); // Rough estimate

      files.push({
        path: fileName,
        size,
        gzippedSize: gzippedSizeEstimate,
        compressionRatio: gzippedSizeEstimate / size,
        type: 'javascript',
        isChunk: true,
        modules: Object.keys(chunk.modules).length
      });

      totalSize += size;
      gzippedSize += gzippedSizeEstimate;
    } else if (chunk.type === 'asset') {
      const size = chunk.source.length;
      const gzippedSizeEstimate = Math.floor(size * 0.3);

      files.push({
        path: fileName,
        size,
        gzippedSize: gzippedSizeEstimate,
        compressionRatio: gzippedSizeEstimate / size,
        type: getAssetType(fileName)
      });

      totalSize += size;
      gzippedSize += gzippedSizeEstimate;
    }
  });

  // Sort files by size
  files.sort((a, b) => b.size - a.size);

  // Calculate metrics
  const chunks = files.filter(f => f.isChunk);
  const performanceMetrics = {
    totalSize,
    gzippedSize,
    compressionRatio: gzippedSize / totalSize,
    fileCount: files.length,
    chunkCount: chunks.length,
    largestFile: files[0]?.size || 0,
    averageFileSize: totalSize / files.length,
    efficiencyScore: calculateEfficiencyScore({ totalSize, chunks: chunks.length, compressionRatio: gzippedSize / totalSize })
  };

  // Generate recommendations
  const recommendations = generateBundleRecommendations(files, performanceMetrics);

  return {
    totalSize,
    gzippedSize,
    files,
    chunks,
    performanceMetrics,
    recommendations,
    timestamp: new Date().toISOString()
  };
}

function getAssetType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.js': return 'javascript';
    case '.css': return 'stylesheet';
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.svg':
    case '.webp':
      return 'image';
    case '.woff':
    case '.woff2':
    case '.ttf':
    case '.otf':
      return 'font';
    default: return 'other';
  }
}

function calculateEfficiencyScore(metrics) {
  let score = 100;

  // Penalize large bundles
  const totalSizeMB = metrics.totalSize / (1024 * 1024);
  if (totalSizeMB > 2) score -= 30;
  else if (totalSizeMB > 1) score -= 15;

  // Penalize poor compression
  if (metrics.compressionRatio > 0.8) score -= 20;
  else if (metrics.compressionRatio > 0.6) score -= 10;

  // Penalize lack of code splitting
  if (metrics.chunks < 3) score -= 15;

  return Math.max(0, score);
}

function generateBundleRecommendations(files, metrics) {
  const recommendations = [];

  // Bundle size recommendations
  const totalSizeMB = metrics.totalSize / (1024 * 1024);
  if (totalSizeMB > 2) {
    recommendations.push({
      type: 'bundle-size',
      priority: 'high',
      message: `Bundle size (${totalSizeMB.toFixed(2)}MB) exceeds recommended 2MB limit`,
      suggestion: 'Consider code splitting, tree shaking, or removing unused dependencies',
      impact: 'High',
      effort: 'Medium'
    });
  }

  // Chunk recommendations
  if (metrics.chunkCount < 3) {
    recommendations.push({
      type: 'code-splitting',
      priority: 'medium',
      message: `Only ${metrics.chunkCount} chunks detected`,
      suggestion: 'Implement more aggressive code splitting for better caching',
      impact: 'Medium',
      effort: 'Low'
    });
  }

  // Large file recommendations
  const largeFiles = files.filter(f => f.size > 500 * 1024);
  if (largeFiles.length > 0) {
    recommendations.push({
      type: 'large-files',
      priority: 'medium',
      message: `${largeFiles.length} files exceed 500KB`,
      suggestion: 'Consider splitting large files or lazy loading them',
      impact: 'Medium',
      effort: 'High',
      files: largeFiles.map(f => ({ path: f.path, size: formatBytes(f.size) }))
    });
  }

  return recommendations;
}

function generateAnalysisReports(analysis, options) {
  const outputDir = path.resolve(options.outputDir);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate requested report formats
  options.generateReports.forEach(format => {
    switch (format) {
      case 'json':
        generateJSONReport(analysis, outputDir);
        break;
      case 'html':
        generateHTMLReport(analysis, outputDir);
        break;
      case 'markdown':
        generateMarkdownReport(analysis, outputDir);
        break;
    }
  });
}

function generateJSONReport(analysis, outputDir) {
  const outputPath = path.join(outputDir, 'bundle-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
}

function generateHTMLReport(analysis, outputDir) {
  const outputPath = path.join(outputDir, 'bundle-analysis.html');
  const html = createSimpleHTMLReport(analysis);
  fs.writeFileSync(outputPath, html);
}

function generateMarkdownReport(analysis, outputDir) {
  const outputPath = path.join(outputDir, 'bundle-analysis.md');
  const markdown = createMarkdownReport(analysis);
  fs.writeFileSync(outputPath, markdown);
}

function createSimpleHTMLReport(analysis) {
  const metrics = analysis.performanceMetrics;
  const scoreColor = metrics.efficiencyScore >= 90 ? '#28a745' :
                    metrics.efficiencyScore >= 70 ? '#ffc107' : '#dc3545';

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Bundle Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .score { font-size: 2em; color: ${scoreColor}; }
        .metric { margin: 10px 0; }
        .recommendations { margin-top: 30px; }
        .recommendation { border-left: 4px solid #007bff; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>📦 Bundle Analysis Report</h1>
    <p>Generated on ${new Date(analysis.timestamp).toLocaleString()}</p>

    <h2>Efficiency Score: <span class="score">${metrics.efficiencyScore}/100</span></h2>

    <div class="metrics">
        <div class="metric">Total Size: ${formatBytes(metrics.totalSize)}</div>
        <div class="metric">Gzipped Size: ${formatBytes(metrics.gzippedSize)}</div>
        <div class="metric">Compression Ratio: ${(metrics.compressionRatio * 100).toFixed(1)}%</div>
        <div class="metric">Files: ${metrics.fileCount}</div>
        <div class="metric">Chunks: ${metrics.chunkCount}</div>
        <div class="metric">Build Time: ${analysis.buildTime}ms</div>
    </div>

    ${analysis.recommendations.length > 0 ? `
    <div class="recommendations">
        <h3>💡 Recommendations</h3>
        ${analysis.recommendations.map(rec => `
            <div class="recommendation">
                <strong>${rec.priority.toUpperCase()}: ${rec.message}</strong>
                <p>${rec.suggestion}</p>
                <small>Impact: ${rec.impact} | Effort: ${rec.effort}</small>
            </div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>`;
}

function createMarkdownReport(analysis) {
  const metrics = analysis.performanceMetrics;

  return `# 📦 Bundle Analysis Report

Generated on ${new Date(analysis.timestamp).toLocaleString()}

## 🎯 Efficiency Score: ${metrics.efficiencyScore}/100

## 📊 Metrics

- **Total Size**: ${formatBytes(metrics.totalSize)}
- **Gzipped Size**: ${formatBytes(metrics.gzippedSize)}
- **Compression Ratio**: ${(metrics.compressionRatio * 100).toFixed(1)}%
- **Files**: ${metrics.fileCount}
- **Chunks**: ${metrics.chunkCount}
- **Build Time**: ${analysis.buildTime}ms

${analysis.recommendations.length > 0 ? `
## 💡 Recommendations

${analysis.recommendations.map(rec => `
### ${rec.priority.toUpperCase()}: ${rec.message}

${rec.suggestion}

*Impact: ${rec.impact} | Effort: ${rec.effort}*
`).join('')}

` : ''}
`;
}

function checkAnalysisThresholds(analysis, options) {
  const metrics = analysis.performanceMetrics;
  let passed = true;

  if (options.failOnScore > 0 && metrics.efficiencyScore < options.failOnScore) {
    console.error(`❌ Bundle efficiency score too low: ${metrics.efficiencyScore} < ${options.failOnScore}`);
    passed = false;
  }

  const sizeMB = metrics.totalSize / (1024 * 1024);
  if (options.failOnSize > 0 && sizeMB > options.failOnSize) {
    console.error(`❌ Bundle size too large: ${sizeMB.toFixed(2)}MB > ${options.failOnSize}MB`);
    passed = false;
  }

  return passed;
}

function compareWithBaselineAnalysis(analysis, options) {
  const baselinePath = path.resolve(options.baselineFile);

  if (!fs.existsSync(baselinePath)) {
    console.log(`⚠️  Baseline file not found: ${baselinePath}`);
    return;
  }

  try {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const current = analysis.performanceMetrics;
    const base = baseline.performanceMetrics;

    const scoreChange = current.efficiencyScore - base.efficiencyScore;
    const sizeChange = current.totalSize - base.totalSize;

    console.log('📈 Baseline Comparison:');
    console.log(`   Score: ${scoreChange >= 0 ? '+' : ''}${scoreChange} points`);
    console.log(`   Size: ${sizeChange >= 0 ? '+' : ''}${formatBytes(Math.abs(sizeChange))}`);

  } catch (error) {
    console.warn(`⚠️  Could not compare with baseline: ${error.message}`);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default bundleAnalysisPlugin;