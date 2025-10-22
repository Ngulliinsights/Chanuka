#!/usr/bin/env node

/**
 * Bundle Report Generator
 * Creates visual HTML reports for bundle analysis
 */

const fs = require('fs');
const path = require('path');

class BundleReportGenerator {
  constructor(analysisData) {
    this.analysis = analysisData;
    this.outputDir = path.join(process.cwd(), 'bundle-reports');
  }

  generateHTMLReport() {
    const html = this.createHTMLTemplate();
    const outputPath = path.join(this.outputDir, 'bundle-analysis.html');

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, html);
    console.log(`📊 HTML report generated: ${outputPath}`);

    return outputPath;
  }

  createHTMLTemplate() {
    const metrics = this.analysis.performanceMetrics;
    const scoreColor = this.getScoreColor(metrics.efficiencyScore);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bundle Analysis Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        .score-card {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .score-number {
            font-size: 4em;
            font-weight: bold;
            color: ${scoreColor};
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .recommendations {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .recommendation-item {
            border-left: 4px solid #667eea;
            padding: 15px;
            margin-bottom: 15px;
            background: #f8f9fa;
        }
        .priority-high { border-left-color: #dc3545; }
        .priority-medium { border-left-color: #ffc107; }
        .priority-low { border-left-color: #28a745; }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .table th, .table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .table th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 500;
        }
        .badge-high { background: #dc3545; color: white; }
        .badge-medium { background: #ffc107; color: black; }
        .badge-low { background: #28a745; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 Bundle Analysis Report</h1>
            <p>Generated on ${new Date(this.analysis.timestamp).toLocaleString()}</p>
        </div>

        <div class="score-card">
            <h2>Bundle Efficiency Score</h2>
            <div class="score-number">${metrics.efficiencyScore}/100</div>
            <p>${this.getScoreDescription(metrics.efficiencyScore)}</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <h3>Total Size</h3>
                <div class="metric-value">${this.formatBytes(metrics.totalSize)}</div>
                <p>Gzipped: ${this.formatBytes(metrics.gzippedSize)}</p>
            </div>
            <div class="metric-card">
                <h3>Compression Ratio</h3>
                <div class="metric-value">${(metrics.compressionRatio * 100).toFixed(1)}%</div>
                <p>Efficiency: ${metrics.compressionRatio < 0.3 ? 'Excellent' : metrics.compressionRatio < 0.5 ? 'Good' : 'Needs Improvement'}</p>
            </div>
            <div class="metric-card">
                <h3>File Count</h3>
                <div class="metric-value">${metrics.fileCount}</div>
                <p>Chunks: ${metrics.chunkCount}</p>
            </div>
            <div class="metric-card">
                <h3>Average File Size</h3>
                <div class="metric-value">${this.formatBytes(metrics.averageFileSize)}</div>
                <p>Largest: ${this.formatBytes(metrics.largestFile)}</p>
            </div>
        </div>

        <div class="chart-container">
            <h3>📊 File Type Distribution</h3>
            <canvas id="fileTypeChart" width="400" height="200"></canvas>
        </div>

        <div class="chart-container">
            <h3>📦 Dependency Size Breakdown</h3>
            <canvas id="dependencyChart" width="400" height="200"></canvas>
        </div>

        <div class="recommendations">
            <h3>💡 Optimization Recommendations</h3>
            ${this.analysis.recommendations.map(rec => `
                <div class="recommendation-item priority-${rec.priority}">
                    <h4>${rec.message}</h4>
                    <p><strong>Suggestion:</strong> ${rec.suggestion}</p>
                    <p><span class="badge badge-${rec.priority}">${rec.priority.toUpperCase()}</span>
                       <strong>Impact:</strong> ${rec.impact} |
                       <strong>Effort:</strong> ${rec.effort}</p>
                    ${rec.files ? `<p><strong>Files:</strong> ${rec.files.map(f => f.path).join(', ')}</p>` : ''}
                    ${rec.dependencies ? `<p><strong>Dependencies:</strong> ${rec.dependencies.map(d => d.name).join(', ')}</p>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="chart-container">
            <h3>📁 Largest Files</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Size</th>
                        <th>Gzipped</th>
                        <th>Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.analysis.files.slice(0, 20).map(file => `
                        <tr>
                            <td>${file.path}</td>
                            <td>${this.formatBytes(file.size)}</td>
                            <td>${this.formatBytes(file.gzippedSize)}</td>
                            <td>${file.type}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // File Type Distribution Chart
        const fileTypeData = ${JSON.stringify(this.getFileTypeData())};
        const fileTypeCtx = document.getElementById('fileTypeChart').getContext('2d');
        new Chart(fileTypeCtx, {
            type: 'doughnut',
            data: {
                labels: fileTypeData.labels,
                datasets: [{
                    data: fileTypeData.data,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // Dependency Size Chart
        const depData = ${JSON.stringify(this.getDependencyData())};
        const depCtx = document.getElementById('dependencyChart').getContext('2d');
        new Chart(depCtx, {
            type: 'bar',
            data: {
                labels: depData.labels,
                datasets: [{
                    label: 'Size (KB)',
                    data: depData.data,
                    backgroundColor: '#667eea'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return (value / 1024).toFixed(1) + ' KB';
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  }

  getFileTypeData() {
    const typeMap = {};
    this.analysis.files.forEach(file => {
      typeMap[file.type] = (typeMap[file.type] || 0) + file.size;
    });

    return {
      labels: Object.keys(typeMap),
      data: Object.values(typeMap).map(size => Math.round(size / 1024)) // Convert to KB
    };
  }

  getDependencyData() {
    const topDeps = this.analysis.dependencies.slice(0, 10);
    return {
      labels: topDeps.map(d => d.name),
      data: topDeps.map(d => d.size)
    };
  }

  getScoreColor(score) {
    if (score >= 90) return '#28a745';
    if (score >= 70) return '#ffc107';
    return '#dc3545';
  }

  getScoreDescription(score) {
    if (score >= 90) return 'Excellent bundle optimization!';
    if (score >= 80) return 'Good performance, minor improvements possible.';
    if (score >= 70) return 'Decent performance, optimization recommended.';
    if (score >= 60) return 'Needs significant optimization.';
    return 'Critical optimization required.';
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = BundleReportGenerator;