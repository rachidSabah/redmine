import { NextResponse } from "next/server";

/**
 * Standard API response types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
}

/**
 * Success response helper
 */
export function apiSuccess<T>(
  data: T,
  options?: {
    status?: number;
    meta?: ApiResponse<T>["meta"];
  }
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: options?.meta,
    },
    { status: options?.status || 200 }
  );
}

/**
 * Paginated response helper
 */
export function apiPaginated<T>(
  data: T[],
  options: {
    page: number;
    limit: number;
    total: number;
  }
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      page: options.page,
      limit: options.limit,
      total: options.total,
      totalPages: Math.ceil(options.total / options.limit),
    },
  });
}

/**
 * Error response helpers
 */
export const ApiErrors = {
  unauthorized: (message = "Unauthorized"): NextResponse<ApiResponse> =>
    NextResponse.json({ success: false, error: message }, { status: 401 }),

  forbidden: (message = "Forbidden"): NextResponse<ApiResponse> =>
    NextResponse.json({ success: false, error: message }, { status: 403 }),

  notFound: (message = "Not found"): NextResponse<ApiResponse> =>
    NextResponse.json({ success: false, error: message }, { status: 404 }),

  badRequest: (message = "Bad request"): NextResponse<ApiResponse> =>
    NextResponse.json({ success: false, error: message }, { status: 400 }),

  conflict: (message = "Conflict"): NextResponse<ApiResponse> =>
    NextResponse.json({ success: false, error: message }, { status: 409 }),

  internal: (message = "Internal server error", error?: unknown): NextResponse<ApiResponse> => {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  },

  validationError: (errors: Record<string, string[]>): NextResponse<ApiResponse> =>
    NextResponse.json(
      { success: false, error: "Validation error", errors },
      { status: 422 }
    ),

  notImplemented: (message = "Not implemented"): NextResponse<ApiResponse> =>
    NextResponse.json({ success: false, error: message }, { status: 501 }),

  serviceUnavailable: (message = "Service unavailable"): NextResponse<ApiResponse> =>
    NextResponse.json({ success: false, error: message }, { status: 503 }),

  tooManyRequests: (message = "Too many requests"): NextResponse<ApiResponse> =>
    NextResponse.json({ success: false, error: message }, { status: 429 }),

  unprocessableEntity: (message = "Unprocessable entity", errors?: unknown): NextResponse<ApiResponse> =>
    NextResponse.json(
      { success: false, error: message, errors },
      { status: 422 }
    ),
};

/**
 * Async handler wrapper with error catching
 */
export function asyncHandler<T>(
  handler: () => Promise<NextResponse<ApiResponse<T>>>
): Promise<NextResponse<ApiResponse<T>>> {
  return handler().catch((error) => {
    console.error("Unhandled error in API handler:", error);

    if (error instanceof Error) {
      if (error.message.includes("Prisma") || error.message.includes("prisma")) {
        return ApiErrors.internal("Database error", error.message);
      }

      if (error.name === "ValidationError") {
        return ApiErrors.badRequest(error.message);
      }

      if ("statusCode" in error) {
        const statusCode = (error as any).statusCode;
        if (statusCode === 401) return ApiErrors.unauthorized(error.message);
        if (statusCode === 403) return ApiErrors.forbidden(error.message);
        if (statusCode === 404) return ApiErrors.notFound(error.message);
      }
    }

    return ApiErrors.internal("An unexpected error occurred", error);
  });
}

/**
 * Pagination params parser
 */
export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const sortBy = searchParams.get("sortBy") || undefined;
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";
  const search = searchParams.get("search") || undefined;

  return { page, limit, sortBy, sortOrder, search };
}

/**
 * Check if user has required role
 */
export function requireRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}
