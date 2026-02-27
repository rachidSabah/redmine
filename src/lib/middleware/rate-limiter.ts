/**
 * Rate Limiter for Synchro PM
 * In-memory rate limiting with sliding window algorithm
 * For production with multiple instances, use Redis-backed solution
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Max requests per window
  message?: string;        // Custom error message
  keyGenerator?: (req: Request) => string;  // Custom key generator
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// In-memory store (use Redis in production)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  store.forEach((value, key) => {
    if (value.resetTime < now) {
      store.delete(key);
    }
  });
}, 60000);

/**
 * Default key generator - uses IP + User-Agent + optional user ID
 */
function defaultKeyGenerator(req: Request, userId?: string): string {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const base = `${ip}:${userAgent.slice(0, 50)}`;
  return userId ? `${base}:${userId}` : base;
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    keyGenerator,
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
  } = config;

  return async function rateLimit(
    req: Request, 
    userId?: string
  ): Promise<RateLimitResult> {
    const key = keyGenerator 
      ? keyGenerator(req) 
      : defaultKeyGenerator(req, userId);
    
    const now = Date.now();
    const resetTime = now + windowMs;
    
    const entry = store.get(key);
    
    if (!entry || entry.resetTime < now) {
      // New window
      store.set(key, {
        count: 1,
        resetTime,
        blocked: false,
      });
      
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: new Date(resetTime),
      };
    }
    
    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: new Date(entry.resetTime),
        retryAfter,
      };
    }
    
    // Increment counter
    entry.count++;
    store.set(key, entry);
    
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - entry.count,
      reset: new Date(entry.resetTime),
    };
  };
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // General API rate limit: 100 requests per minute
  api: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: 'API rate limit exceeded. Please slow down.',
  }),
  
  // Authentication: 5 attempts per 15 minutes
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many authentication attempts. Please try again later.',
  }),
  
  // Password reset: 3 per hour
  passwordReset: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    message: 'Too many password reset requests. Please try again later.',
  }),
  
  // File upload: 20 per minute
  upload: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: 'Upload rate limit exceeded.',
  }),
  
  // Search: 30 per minute
  search: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: 'Search rate limit exceeded.',
  }),
  
  // Email sending: 10 per minute
  email: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: 'Email sending rate limit exceeded.',
  }),
  
  // Webhooks: 100 per minute
  webhook: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
  
  // Admin operations: 50 per minute
  admin: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 50,
    message: 'Admin operation rate limit exceeded.',
  }),
};

/**
 * Rate limit middleware wrapper for API routes
 */
export function withRateLimit(
  limiter: ReturnType<typeof createRateLimit>,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const result = await limiter(req);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: result.retryAfter 
            ? `Rate limit exceeded. Retry after ${result.retryAfter} seconds.`
            : 'Rate limit exceeded.',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': result.reset.toISOString(),
            ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
          },
        }
      );
    }
    
    const response = await handler(req);
    
    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', String(result.limit));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', result.reset.toISOString());
    
    return response;
  };
}

/**
 * Higher-order function to apply rate limiting to API handlers
 */
export function rateLimited(
  limiterType: keyof typeof rateLimiters
): (handler: (req: Request) => Promise<Response>) => (req: Request) => Promise<Response> {
  return (handler) => withRateLimit(rateLimiters[limiterType], handler);
}

// Export types
export type { RateLimitConfig, RateLimitResult };
