import { type SuspiciousActivityContext, cibDetectionService } from '@server/features/safeguards/application/cib-detection-service';
import { type ModerationContext, moderationService } from '@server/features/safeguards/application/moderation-service';
import { type RateLimitContext, rateLimitService } from '@server/features/safeguards/application/rate-limit-service';
import { logger } from '@server/infrastructure/observability';
import { NextFunction, Request, Response } from 'express';

/**
 * Extended Request interface with safeguards metadata
 */
interface SafeguardsRequest extends Request {
  user?: { id: string };
  session?: { id: string };
  moderationQueueId?: string;
}

/**
 * Geo location data structure
 */
interface GeoLocation {
  country?: string;
  county?: string;
}

/**
 * Content analysis result
 */
interface ContentAnalysis {
  contentLength: number;
  hasUrls: boolean;
  hasEmail: boolean;
  wordCount: number;
}

/**
 * Comprehensive Safeguards Middleware
 * Integrates rate limiting, content moderation, and behavioral analytics
 */
export const safeguardsMiddleware = async (
  req: SafeguardsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || '';
    const sessionId = req.session?.id;

    // Extract geo location from headers if available
    const geoLocation = extractGeoLocation(req);

    // 1. ATOMIC RATE LIMITING CHECK
    const actionResource = extractActionResource(req);
    const actionType = determineActionType(req);

    // Build rate limit context with proper undefined handling
    const rateLimitContext: RateLimitContext = {
      userId: userId ?? 'anonymous',
      ipAddress: clientIp,
      deviceFingerprint: generateDeviceFingerprint(req),
      sessionId: sessionId ?? 'no-session',
      actionType,
      userAgent,
      ...(geoLocation && { geoLocation }),
      ...(actionResource && { actionResource })
    };

    // Use atomic rate limit check that prevents race conditions
    const rateLimitResult = await rateLimitService.checkAndRecordRateLimit(rateLimitContext);

    if (!rateLimitResult.allowed) {
      logger.warn({
        userId: userId ?? 'anonymous',
        ip: clientIp,
        action: actionType,
        blockReason: rateLimitResult.blockReason
      }, 'Rate limit exceeded');

      res.status(429).json({
        success: false,
        error: 'Rate Limit Exceeded',
        message: rateLimitResult.blockReason || 'Too many requests',
        retryAfter: rateLimitResult.resetTime
          ? Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000)
          : undefined,
        blockedUntil: rateLimitResult.blockedUntil
      });
      return;
    }

    // 2. ATOMIC CONTENT MODERATION CHECK (for content creation)
    if (shouldCheckModeration(req)) {
      const billId = extractBillId(req);
      const contentType = determineContentType(req);
      const contentId = generateContentId(req);
      const automatedSignals = await analyzeContent(req);

      const moderationContext = {
        contentType: contentType as ModerationContext['contentType'],
        contentId,
        authorId: userId ?? 'anonymous',
        triggerType: 'automated_flag' as const,
        triggerConfidence: 0.5,
        automatedSignals: automatedSignals as unknown as Readonly<Record<string, unknown>>,
        flagReasons: [] as string[],
        priority: 3 as const,
        ...(billId && { billId })
      } as unknown as ModerationContext;

      // Use atomic moderation queue operation to prevent duplicates
      const moderationResult = await moderationService.queueForModeration(moderationContext);

      if (!moderationResult.success) {
        logger.warn({
          userId: userId ?? 'anonymous',
          contentType,
          error: moderationResult.error
        }, 'Content moderation queue failed');
      } else if (moderationResult.queueItemId) {
        // Add moderation queue ID to request for tracking
        req.moderationQueueId = moderationResult.queueItemId;
      }
    }

    // 3. BEHAVIORAL ANALYTICS (CIB Detection)
    const isSuspicious = isSuspiciousBehavior(req, userId);

    if (isSuspicious) {
      const anomalyContext: SuspiciousActivityContext = {
        userId: userId ?? 'anonymous',
        ipAddress: clientIp,
        activityType: 'request_pattern',
        suspicionReason: `Suspicious request to ${req.path} from ${clientIp}`,
        severityLevel: 3,
        relatedEntities: {
          sessionId: sessionId ?? 'no-session',
          typicalLocation: geoLocation?.county,
          typicalDevice: extractDeviceType(req),
          observedLocation: geoLocation?.county,
          observedDevice: extractDeviceType(req),
          requestPath: req.path,
          requestMethod: req.method
        },
        requiresManualReview: true
      };

      await cibDetectionService.logSuspiciousActivity(anomalyContext);
    }

    // Continue to next middleware
    next();

  } catch (error) {
    logger.error({
      error,
      path: req.path,
      ip: req.ip
    }, 'Safeguards middleware error');
    // Fail open - allow request to continue
    next();
  }
};

/**
 * Determine the action type for rate limiting
 */
function determineActionType(req: Request): string {
  const path = req.path.toLowerCase();
  const method = req.method;

  // Authentication actions
  if (path.includes('/auth/login') || path.includes('/auth/verify')) {
    return 'login_attempt';
  }

  // Content creation actions
  if (path.includes('/comments') && method === 'POST') {
    return 'comment_post';
  }
  if (path.includes('/bills') && method === 'POST') {
    return 'bill_analysis_submit';
  }
  if (path.includes('/vote') && method === 'POST') {
    return 'vote_cast';
  }

  // Search actions
  if (path.includes('/search')) {
    return 'api_search';
  }

  // Generic API actions
  if (path.includes('/api/')) {
    return method === 'GET' ? 'api_read' : 'api_write';
  }

  return 'api_request';
}

/**
 * Extract action resource (e.g., bill ID, user ID)
 */
function extractActionResource(req: Request): string | undefined {
  const path = req.path;

  // Extract bill ID from paths like /api/bills/123/vote
  const billMatch = path.match(/\/bills\/([^/]+)/);
  if (billMatch?.[1]) return `bill:${billMatch[1]}`;

  // Extract user ID from paths like /api/users/123/comments
  const userMatch = path.match(/\/users\/([^/]+)/);
  if (userMatch?.[1]) return `user:${userMatch[1]}`;

  return undefined;
}

/**
 * Extract geo location from request headers
 */
function extractGeoLocation(req: Request): GeoLocation | undefined {
  const country = req.get('x-country') || req.get('cf-ipcountry');
  const county = req.get('x-county');

  if (!country && !county) {
    return undefined;
  }

  const location: GeoLocation = {};
  if (country) location.country = country;
  if (county) location.county = county;

  return location;
}

/**
 * Generate device fingerprint from request
 */
function generateDeviceFingerprint(req: Request): string {
  const userAgent = req.get('User-Agent') || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  const screenResolution = req.get('x-screen-resolution') || '';

  // Simple hash of key identifiers
  const fingerprint = `${userAgent}|${acceptLanguage}|${screenResolution}`;
  return Buffer.from(fingerprint).toString('base64').substring(0, 64);
}

/**
 * Check if this request should be checked for moderation
 */
function shouldCheckModeration(req: Request): boolean {
  const method = req.method;
  const path = req.path.toLowerCase();

  // Only check POST/PUT requests with content
  if (!['POST', 'PUT'].includes(method)) {
    return false;
  }

  // Check specific content creation endpoints
  const contentEndpoints = ['/comments', '/bills', '/testimony', '/discussion'];
  return contentEndpoints.some(endpoint => path.includes(endpoint));
}

/**
 * Determine content type for moderation
 */
function determineContentType(req: Request): string {
  const path = req.path.toLowerCase();

  if (path.includes('/comments')) return 'comment';
  if (path.includes('/bills')) return 'bill_analysis';
  if (path.includes('/testimony')) return 'testimony';
  if (path.includes('/discussion')) return 'discussion_post';

  return 'content';
}

/**
 * Generate temporary content ID
 */
function generateContentId(_req: Request): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract bill ID from request
 */
function extractBillId(req: Request): string | undefined {
  const billMatch = req.path.match(/\/bills\/([^/]+)/);
  return billMatch?.[1];
}

/**
 * Type guard to check if value is a record
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Basic content analysis for moderation signals
 */
async function analyzeContent(req: Request): Promise<ContentAnalysis> {
  try {
    const { body } = req;

    if (!isRecord(body)) {
      return {
        contentLength: 0,
        hasUrls: false,
        hasEmail: false,
        wordCount: 0
      };
    }

    // Extract text content
    const textContent = extractTextContent(body);
    const urlRegex = /https?:\/\/[^\s]+/g;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

    return {
      contentLength: textContent.length,
      hasUrls: urlRegex.test(textContent),
      hasEmail: emailRegex.test(textContent),
      wordCount: textContent.split(/\s+/).filter(word => word.length > 0).length
    };
  } catch (error) {
    logger.error({ error }, 'Content analysis error');
    return {
      contentLength: 0,
      hasUrls: false,
      hasEmail: false,
      wordCount: 0
    };
  }
}

/**
 * Extract text content from request body
 */
function extractTextContent(body: Record<string, unknown>): string {
  // Check common content fields
  const contentFields = ['content', 'text', 'message', 'comment', 'body'];

  for (const field of contentFields) {
    if (field in body && typeof body[field] === 'string') {
      return body[field] as string;
    }
  }

  // Fallback: stringify the entire body
  return JSON.stringify(body);
}

/**
 * Extract device type from request
 */
function extractDeviceType(req: Request): string {
  const userAgent = (req.get('User-Agent') || '').toLowerCase();

  if (/iphone|ipod/.test(userAgent)) return 'mobile-ios';
  if (/android/.test(userAgent) && /mobile/.test(userAgent)) return 'mobile-android';
  if (/ipad/.test(userAgent) || (/android/.test(userAgent) && /tablet/.test(userAgent))) {
    return 'tablet';
  }
  if (/mobile/.test(userAgent)) return 'mobile';

  return 'desktop';
}

/**
 * Check if request behavior is suspicious
 */
function isSuspiciousBehavior(req: Request, _userId?: string): boolean {
  const userAgent = req.get('User-Agent') || '';
  const method = req.method;

  // Check for missing or suspiciously short user agent
  if (!userAgent || userAgent.length < 10) {
    return true;
  }

  // Check for common bot indicators (excluding legitimate crawlers)
  const suspiciousBotPatterns = /malicious|scraper|harvester|collector/i;
  if (suspiciousBotPatterns.test(userAgent)) {
    return true;
  }

  // Check for unusual HTTP methods
  const unusualMethods = ['TRACE', 'TRACK', 'CONNECT'];
  if (unusualMethods.includes(method)) {
    return true;
  }

  // Check for SQL injection patterns in path
  const sqlInjectionPatterns = /(\bunion\b.*\bselect\b|;\s*drop\s+table|'\s*or\s*'1'\s*=\s*'1)/i;
  if (sqlInjectionPatterns.test(req.path)) {
    return true;
  }

  // Check for path traversal attempts
  if (/\.\.\/|\.\.\\/.test(req.path)) {
    return true;
  }

  return false;
}
