/**
 * CDN Configuration for Chanuka Client
 * Optimized for global distribution with aggressive caching
 */

const CDN_CONFIG = {
  // CloudFront distribution settings
  cloudfront: {
    // Cache behaviors for different asset types
    cacheBehaviors: [
      {
        pathPattern: '/static/js/*',
        targetOriginId: 'chanuka-client-origin',
        viewerProtocolPolicy: 'redirect-to-https',
        cachePolicyId: 'static-assets-policy',
        compress: true,
        ttl: {
          default: 31536000, // 1 year
          max: 31536000,
          min: 0,
        },
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
        },
      },
      {
        pathPattern: '/static/css/*',
        targetOriginId: 'chanuka-client-origin',
        viewerProtocolPolicy: 'redirect-to-https',
        cachePolicyId: 'static-assets-policy',
        compress: true,
        ttl: {
          default: 31536000, // 1 year
          max: 31536000,
          min: 0,
        },
      },
      {
        pathPattern: '/static/images/*',
        targetOriginId: 'chanuka-client-origin',
        viewerProtocolPolicy: 'redirect-to-https',
        cachePolicyId: 'images-policy',
        compress: true,
        ttl: {
          default: 2592000, // 30 days
          max: 31536000, // 1 year
          min: 86400, // 1 day
        },
      },
      {
        pathPattern: '/api/*',
        targetOriginId: 'chanuka-api-origin',
        viewerProtocolPolicy: 'redirect-to-https',
        cachePolicyId: 'api-policy',
        compress: false,
        ttl: {
          default: 0, // No caching for API
          max: 0,
          min: 0,
        },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      },
      {
        pathPattern: '/*',
        targetOriginId: 'chanuka-client-origin',
        viewerProtocolPolicy: 'redirect-to-https',
        cachePolicyId: 'spa-policy',
        compress: true,
        ttl: {
          default: 86400, // 1 day for HTML
          max: 86400,
          min: 0,
        },
      },
    ],

    // Origin configurations
    origins: [
      {
        id: 'chanuka-client-origin',
        domainName: 'chanuka-client-bucket.s3.amazonaws.com',
        originPath: '',
        customOriginConfig: {
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: 'https-only',
          originSslProtocols: ['TLSv1.2'],
        },
      },
      {
        id: 'chanuka-api-origin',
        domainName: 'api.chanuka.ke',
        originPath: '',
        customOriginConfig: {
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: 'https-only',
          originSslProtocols: ['TLSv1.2'],
        },
      },
    ],

    // Edge locations and performance
    priceClass: 'PriceClass_All', // Global distribution
    enabled: true,
    httpVersion: 'http2',
    ipv6Enabled: true,

    // Security settings
    webAclId: 'chanuka-web-acl',
    
    // Custom error pages
    customErrorResponses: [
      {
        errorCode: 404,
        responseCode: 200,
        responsePagePath: '/index.html',
        errorCachingMinTtl: 300,
      },
      {
        errorCode: 403,
        responseCode: 200,
        responsePagePath: '/index.html',
        errorCachingMinTtl: 300,
      },
    ],
  },

  // Cache policies
  cachePolicies: {
    'static-assets-policy': {
      name: 'ChanukaStat icAssets',
      comment: 'Optimized for static JS/CSS with long-term caching',
      defaultTtl: 31536000,
      maxTtl: 31536000,
      minTtl: 0,
      parametersInCacheKeyAndForwardedToOrigin: {
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
        queryStringsConfig: {
          queryStringBehavior: 'none',
        },
        headersConfig: {
          headerBehavior: 'whitelist',
          headers: ['Accept-Encoding', 'CloudFront-Viewer-Country'],
        },
        cookiesConfig: {
          cookieBehavior: 'none',
        },
      },
    },

    'images-policy': {
      name: 'ChanukaImages',
      comment: 'Optimized for images with moderate caching',
      defaultTtl: 2592000,
      maxTtl: 31536000,
      minTtl: 86400,
      parametersInCacheKeyAndForwardedToOrigin: {
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
        queryStringsConfig: {
          queryStringBehavior: 'whitelist',
          queryStrings: ['w', 'h', 'q', 'format'], // Image optimization params
        },
        headersConfig: {
          headerBehavior: 'whitelist',
          headers: ['Accept', 'Accept-Encoding'],
        },
        cookiesConfig: {
          cookieBehavior: 'none',
        },
      },
    },

    'spa-policy': {
      name: 'ChanukaSPA',
      comment: 'Optimized for SPA with HTML caching',
      defaultTtl: 86400,
      maxTtl: 86400,
      minTtl: 0,
      parametersInCacheKeyAndForwardedToOrigin: {
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
        queryStringsConfig: {
          queryStringBehavior: 'all',
        },
        headersConfig: {
          headerBehavior: 'whitelist',
          headers: [
            'Accept-Encoding',
            'CloudFront-Viewer-Country',
            'CloudFront-Is-Mobile-Viewer',
            'CloudFront-Is-Tablet-Viewer',
          ],
        },
        cookiesConfig: {
          cookieBehavior: 'whitelist',
          cookies: ['session-id', 'csrf-token'],
        },
      },
    },

    'api-policy': {
      name: 'ChanukaAPI',
      comment: 'No caching for API endpoints',
      defaultTtl: 0,
      maxTtl: 0,
      minTtl: 0,
      parametersInCacheKeyAndForwardedToOrigin: {
        enableAcceptEncodingGzip: false,
        enableAcceptEncodingBrotli: false,
        queryStringsConfig: {
          queryStringBehavior: 'all',
        },
        headersConfig: {
          headerBehavior: 'whitelist',
          headers: [
            'Authorization',
            'Content-Type',
            'X-Requested-With',
            'X-CSRF-Token',
          ],
        },
        cookiesConfig: {
          cookieBehavior: 'all',
        },
      },
    },
  },

  // Edge functions for optimization
  edgeFunctions: {
    // Image optimization at edge
    imageOptimization: {
      name: 'chanuka-image-optimizer',
      code: `
        function handler(event) {
          const request = event.request;
          const uri = request.uri;
          
          // Check if it's an image request
          if (uri.match(/\\.(jpg|jpeg|png|gif|webp)$/i)) {
            const querystring = request.querystring;
            
            // Add WebP support for compatible browsers
            const headers = request.headers;
            const accept = headers.accept && headers.accept.value;
            
            if (accept && accept.includes('image/webp')) {
              // Modify URI to serve WebP version if available
              request.uri = uri.replace(/\\.(jpg|jpeg|png)$/i, '.webp');
            }
            
            // Add responsive image parameters
            if (querystring.w) {
              request.querystring.w = Math.min(parseInt(querystring.w.value), 2048);
            }
          }
          
          return request;
        }
      `,
    },

    // Security headers
    securityHeaders: {
      name: 'chanuka-security-headers',
      code: `
        function handler(event) {
          const response = event.response;
          const headers = response.headers;
          
          // Add security headers
          headers['strict-transport-security'] = {
            value: 'max-age=31536000; includeSubDomains; preload'
          };
          headers['x-content-type-options'] = { value: 'nosniff' };
          headers['x-frame-options'] = { value: 'DENY' };
          headers['x-xss-protection'] = { value: '1; mode=block' };
          headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
          headers['content-security-policy'] = {
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.chanuka.ke; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.chanuka.ke wss://ws.chanuka.ke;"
          };
          
          return response;
        }
      `,
    },
  },

  // Performance monitoring
  monitoring: {
    realUserMonitoring: {
      enabled: true,
      sampleRate: 0.1, // 10% sampling
      metrics: [
        'LargestContentfulPaint',
        'FirstInputDelay',
        'CumulativeLayoutShift',
        'FirstContentfulPaint',
        'TimeToFirstByte',
      ],
    },

    syntheticMonitoring: {
      enabled: true,
      frequency: 300, // 5 minutes
      locations: [
        'us-east-1',
        'eu-west-1',
        'ap-southeast-1',
        'af-south-1', // Kenya region
      ],
    },
  },
};

// Deployment script
const deployToCDN = async (environment = 'production') => {
  console.log(`🚀 Deploying to CDN (${environment})...`);
  
  try {
    // 1. Build the application
    console.log('📦 Building application...');
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'inherit' });
    
    // 2. Upload to S3 with optimized headers
    console.log('📤 Uploading to S3...');
    await uploadToS3(environment);
    
    // 3. Invalidate CloudFront cache
    console.log('🔄 Invalidating CloudFront cache...');
    await invalidateCloudFront(environment);
    
    // 4. Update monitoring
    console.log('📊 Updating monitoring configuration...');
    await updateMonitoring(environment);
    
    console.log('✅ CDN deployment complete!');
    
  } catch (error) {
    console.error('❌ CDN deployment failed:', error);
    process.exit(1);
  }
};

const uploadToS3 = async (environment) => {
  const AWS = require('aws-sdk');
  const fs = require('fs');
  const path = require('path');
  const mime = require('mime-types');
  
  const s3 = new AWS.S3();
  const bucketName = `chanuka-client-${environment}`;
  const distPath = path.resolve(__dirname, '../client/dist');
  
  const uploadFile = async (filePath, key) => {
    const fileContent = fs.readFileSync(filePath);
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    
    // Determine cache control based on file type
    let cacheControl = 'public, max-age=86400'; // Default: 1 day
    
    if (key.match(/\.(js|css)$/)) {
      cacheControl = 'public, max-age=31536000, immutable'; // 1 year for hashed assets
    } else if (key.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
      cacheControl = 'public, max-age=2592000'; // 30 days for images
    } else if (key === 'index.html') {
      cacheControl = 'public, max-age=0, must-revalidate'; // No cache for HTML
    }
    
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
      CacheControl: cacheControl,
      ContentEncoding: filePath.endsWith('.gz') ? 'gzip' : 
                      filePath.endsWith('.br') ? 'br' : undefined,
    };
    
    return s3.upload(params).promise();
  };
  
  // Upload all files recursively
  const uploadDirectory = async (dirPath, prefix = '') => {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const key = prefix ? `${prefix}/${file}` : file;
      
      if (fs.statSync(filePath).isDirectory()) {
        await uploadDirectory(filePath, key);
      } else {
        console.log(`Uploading ${key}...`);
        await uploadFile(filePath, key);
      }
    }
  };
  
  await uploadDirectory(distPath);
};

const invalidateCloudFront = async (environment) => {
  const AWS = require('aws-sdk');
  const cloudfront = new AWS.CloudFront();
  
  const distributionId = process.env[`CLOUDFRONT_DISTRIBUTION_ID_${environment.toUpperCase()}`];
  
  if (!distributionId) {
    console.warn('⚠️  CloudFront distribution ID not found, skipping invalidation');
    return;
  }
  
  const params = {
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `chanuka-${Date.now()}`,
      Paths: {
        Quantity: 2,
        Items: ['/*', '/index.html'],
      },
    },
  };
  
  return cloudfront.createInvalidation(params).promise();
};

const updateMonitoring = async (environment) => {
  // Update CloudWatch dashboards and alarms
  const AWS = require('aws-sdk');
  const cloudwatch = new AWS.CloudWatch();
  
  // Create performance alarms
  const alarms = [
    {
      AlarmName: `chanuka-${environment}-high-error-rate`,
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 2,
      MetricName: '4xxErrorRate',
      Namespace: 'AWS/CloudFront',
      Period: 300,
      Statistic: 'Average',
      Threshold: 5.0,
      ActionsEnabled: true,
      AlarmActions: [process.env.SNS_ALERT_TOPIC],
      AlarmDescription: 'High 4xx error rate detected',
    },
    {
      AlarmName: `chanuka-${environment}-slow-response`,
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 3,
      MetricName: 'ResponseTime',
      Namespace: 'AWS/CloudFront',
      Period: 300,
      Statistic: 'Average',
      Threshold: 2000,
      ActionsEnabled: true,
      AlarmActions: [process.env.SNS_ALERT_TOPIC],
      AlarmDescription: 'Slow response time detected',
    },
  ];
  
  for (const alarm of alarms) {
    await cloudwatch.putMetricAlarm(alarm).promise();
  }
};

module.exports = {
  CDN_CONFIG,
  deployToCDN,
  uploadToS3,
  invalidateCloudFront,
  updateMonitoring,
};