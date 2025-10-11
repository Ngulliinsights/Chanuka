import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Swagger/OpenAPI configuration for Analytics API documentation
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Analytics API',
      version: '1.0.0',
      description: 'Comprehensive analytics and reporting API for legislative transparency platform',
      contact: {
        name: 'API Support',
        email: 'api@legislative-transparency.org'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.legislative-transparency.org',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Error description' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        ApiSuccess: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { type: 'object' },
            metadata: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string' },
                duration: { type: 'number' }
              }
            }
          }
        },
        EngagementMetrics: {
          type: 'object',
          properties: {
            totalUsers: { type: 'number', example: 1250 },
            totalComments: { type: 'number', example: 5432 },
            totalVotes: { type: 'number', example: 8765 },
            topCategories: {
              type: 'array',
              items: { type: 'string' }
            },
            dateRange: {
              type: 'object',
              properties: {
                startDate: { type: 'string', format: 'date-time' },
                endDate: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        EngagementTrends: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', format: 'date' },
                  comments: { type: 'number' },
                  votes: { type: 'number' },
                  users: { type: 'number' }
                }
              }
            }
          }
        },
        UserEngagement: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            userName: { type: 'string' },
            totalEngagements: { type: 'number' },
            engagementScore: { type: 'number' },
            lastActive: { type: 'string', format: 'date-time' }
          }
        },
        Leaderboard: {
          type: 'object',
          properties: {
            leaderboard: {
              type: 'array',
              items: { $ref: '#/components/schemas/UserEngagement' }
            },
            count: { type: 'number' },
            generatedAt: { type: 'string', format: 'date-time' }
          }
        },
        ExportData: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['json', 'csv'] },
            data: { type: 'string' },
            filename: { type: 'string' },
            generatedAt: { type: 'string', format: 'date-time' }
          }
        },
        AnalyticsStats: {
          type: 'object',
          properties: {
            cacheHits: { type: 'number' },
            cacheMisses: { type: 'number' },
            totalRequests: { type: 'number' },
            averageResponseTime: { type: 'number' },
            uptime: { type: 'number' },
            lastRestart: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './server/features/analytics/controllers/*.ts',
    './server/features/analytics/analytics.ts',
    './server/features/analytics/financial-disclosure/index.ts'
  ]
};

/**
 * Generate OpenAPI specification
 */
export const specs = swaggerJsdoc(swaggerOptions);

/**
 * Swagger UI options
 */
export const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
    syntaxHighlight: {
      activate: true,
      theme: 'arta'
    },
    tryItOutEnabled: true,
    requestInterceptor: (req: any) => {
      // Add auth header if token exists in localStorage
      const token = localStorage.getItem('authToken');
      if (token) {
        req.headers.Authorization = `Bearer ${token}`;
      }
      return req;
    }
  }
};

/**
 * Middleware to serve Swagger UI
 */
export const serveSwagger = swaggerUi.serve;
export const setupSwagger = swaggerUi.setup(specs, swaggerUiOptions);