/**
 * Error Handler
 * Standardized error handling and response formatting
 */

/**
 * Creates a standard success response
 * @param {*} data - Response data
 * @returns {Object} Success response object
 */
function createSuccessResponse(data) {
  return {
    success: true,
    data: data
  };
}

/**
 * Creates a standard error response
 * @param {string} message - Error message
 * @param {*} details - Optional error details
 * @returns {Object} Error response object
 */
function createErrorResponse(message, details) {
  const response = {
    success: false,
    error: message
  };
  
  if (details !== undefined) {
    response.details = details;
  }
  
  return response;
}

/**
 * Handles errors with logging
 * @param {Error|string} error - Error object or error message
 * @param {string} context - Context where error occurred
 * @returns {Object} Error response object
 */
function handleError(error, context) {
  const errorMessage = error instanceof Error ? error.toString() : error;
  Logger.log(`Error in ${context}: ${errorMessage}`);
  
  return createErrorResponse(
    errorMessage,
    { context: context }
  );
}
