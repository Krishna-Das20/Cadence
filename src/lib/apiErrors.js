export class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong", errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.success = false;
    this.errors = errors;
    this.data = null;
  }
}

export function handleApiError(error) {
  console.error("API Error:", error);
  const statusCode = error.statusCode || 500;
  return Response.json(
    {
      success: false,
      message: error.message || "Internal Server Error",
      errors: error.errors || [],
      data: null,
    },
    { status: statusCode }
  );
}

export function handleApiResponse(data, message = "Success", statusCode = 200) {
  return Response.json(
    {
      success: true,
      message,
      errors: [],
      data,
    },
    { status: statusCode }
  );
}
