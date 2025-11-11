#!/usr/bin/env node

/**
 * Asset Optimization Script
 * Optimizes images and other assets for better performance
 */

const fs = require('fs');
const path = require('path');

// Asset directories to optimize
const assetDirs = [
  path.join(__dirname, '../public'),
  path.join(__dirname, '../src/assets'),
  path.join(__dirname, '../dist/assets')
];

/**
 * Get all image files recursively
 */
function getImageFiles(dir, imageList = []) {
  if (!fs.existsSync(dir)) {
    return imageList;
  }

  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getImageFiles(filePath, imageList);
    } else if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file)) {
      imageList.push(filePath);
    }
  });
  
  return imageList;
}

/**
 * Analyze image optimization opportunities
 */
function analyzeImages() {
  console.log('🖼️  Analyzing image optimization opportunities...\n');

  let totalImages = 0;
  let totalSize = 0;
  const recommendations = [];

  assetDirs.forEach(dir => {
    const images = getImageFiles(dir);
    totalImages += images.length;

    images.forEach(imagePath => {
      try {
        const stats = fs.statSync(imagePath);
        const size = stats.size;
        totalSize += size;

        const ext = path.extname(imagePath).toLowerCase();
        const basename = path.basename(imagePath);

        // Check for optimization opportunities
        if (size > 500 * 1024) { // > 500KB
          recommendations.push({
            type: 'large-file',
            file: basename,
            size: size,
            suggestion: 'Consider compressing or resizing this large image'
          });
        }

        if (ext === '.png' && size > 100 * 1024) { // PNG > 100KB
          recommendations.push({
            type: 'format-optimization',
            file: basename,
            size: size,
            suggestion: 'Consider converting to WebP or AVIF format'
          });
        }

        if (ext === '.jpg' || ext === '.jpeg') {
          // Check if we can suggest WebP conversion
          recommendations.push({
            type: 'format-optimization',
            file: basename,
            size: size,
            suggestion: 'Consider providing WebP alternative for better compression'
          });
        }

        if (basename.includes('@2x') || basename.includes('@3x')) {
          recommendations.push({
            type: 'responsive-images',
            file: basename,
            size: size,
            suggestion: 'Ensure responsive image loading is implemented'
          });
        }

      } catch (error) {
        console.warn(`⚠️  Could not analyze ${imagePath}: ${error.message}`);
      }
    });
  });

  return {
    totalImages,
    totalSize,
    recommendations: recommendations.slice(0, 20) // Limit to top 20 recommendations
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate optimization recommendations
 */
function generateOptimizationTips() {
  return [
    '🎯 Use WebP format for better compression (20-35% smaller than JPEG)',
    '🎯 Implement lazy loading for images below the fold',
    '🎯 Use responsive images with srcset for different screen sizes',
    '🎯 Compress images before deployment (tools: ImageOptim, TinyPNG)',
    '🎯 Consider using AVIF format for even better compression',
    '🎯 Use SVG for simple graphics and icons',
    '🎯 Implement progressive JPEG for better perceived performance',
    '🎯 Set explicit width/height to prevent layout shifts'
  ];
}

/**
 * Check for modern image format support
 */
function checkModernFormatSupport() {
  const tips = [];
  
  // Check if there are any WebP files
  const allImages = [];
  assetDirs.forEach(dir => {
    allImages.push(...getImageFiles(dir));
  });

  const hasWebP = allImages.some(img => img.endsWith('.webp'));
  const hasAVIF = allImages.some(img => img.endsWith('.avif'));

  if (!hasWebP) {
    tips.push('💡 No WebP images found - consider converting some images to WebP');
  }

  if (!hasAVIF) {
    tips.push('💡 No AVIF images found - consider using AVIF for even better compression');
  }

  return tips;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Asset Optimization Analysis\n');

  const analysis = analyzeImages();
  const optimizationTips = generateOptimizationTips();
  const modernFormatTips = checkModernFormatSupport();

  // Display results
  console.log('📊 Asset Analysis Results:');
  console.log('─'.repeat(50));
  console.log(`Total Images:      ${analysis.totalImages}`);
  console.log(`Total Size:        ${formatBytes(analysis.totalSize)}`);
  console.log(`Average Size:      ${analysis.totalImages > 0 ? formatBytes(analysis.totalSize / analysis.totalImages) : '0 B'}`);
  console.log();

  // Display specific recommendations
  if (analysis.recommendations.length > 0) {
    console.log('🎯 Specific Optimization Opportunities:');
    console.log('─'.repeat(50));
    
    const groupedRecs = analysis.recommendations.reduce((groups, rec) => {
      if (!groups[rec.type]) groups[rec.type] = [];
      groups[rec.type].push(rec);
      return groups;
    }, {});

    Object.entries(groupedRecs).forEach(([type, recs]) => {
      console.log(`\n${type.replace('-', ' ').toUpperCase()}:`);
      recs.slice(0, 5).forEach(rec => {
        console.log(`  • ${rec.file} (${formatBytes(rec.size)}) - ${rec.suggestion}`);
      });
      if (recs.length > 5) {
        console.log(`  ... and ${recs.length - 5} more files`);
      }
    });
    console.log();
  }

  // Display modern format tips
  if (modernFormatTips.length > 0) {
    console.log('🔧 Modern Format Recommendations:');
    console.log('─'.repeat(50));
    modernFormatTips.forEach(tip => console.log(tip));
    console.log();
  }

  // Display general optimization tips
  console.log('💡 General Optimization Tips:');
  console.log('─'.repeat(50));
  optimizationTips.forEach(tip => console.log(tip));
  console.log();

  // Calculate potential savings
  const potentialSavings = analysis.totalSize * 0.3; // Estimate 30% savings
  console.log('💰 Estimated Potential Savings:');
  console.log('─'.repeat(50));
  console.log(`With WebP conversion:     ~${formatBytes(potentialSavings)}`);
  console.log(`With proper compression:  ~${formatBytes(analysis.totalSize * 0.2)}`);
  console.log(`With lazy loading:        Improved LCP by 20-40%`);
  console.log();

  // Final recommendations
  if (analysis.recommendations.length > 0) {
    console.log('🎯 Next Steps:');
    console.log('─'.repeat(50));
    console.log('1. Install image optimization tools (imagemin, sharp, etc.)');
    console.log('2. Set up automated image optimization in your build process');
    console.log('3. Implement responsive images with srcset');
    console.log('4. Add lazy loading for images below the fold');
    console.log('5. Consider using a CDN with automatic image optimization');
    console.log();
  } else {
    console.log('✅ Your images are already well optimized!');
    console.log('🎉 Consider implementing the general tips above for even better performance.');
  }
}

// Run the analyzer
if (require.main === module) {
  main();
}

module.exports = {
  analyzeImages,
  formatBytes,
  getImageFiles
};