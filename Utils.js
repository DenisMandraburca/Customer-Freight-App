/**
 * Utility Functions
 * Helper functions used throughout the application
 */

/**
 * Formats a date value for display (YYYY-MM-DD)
 * @param {Date|string} dateValue - Date value to format
 * @returns {string} Formatted date string (YYYY-MM-DD) or empty string
 */
function formatDate(dateValue) {
  if (!dateValue) return '';
  
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // If it's already a string, try to parse it
  try {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // If parsing fails, return as string
  }
  
  return dateValue.toString();
}

/**
 * Parses a date string (YYYY-MM-DD) into a Date object
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date|null} Date object or null if invalid
 */
function parseDateString(dateString) {
  if (!dateString) return null;
  
  try {
    const dateParts = dateString.split('-');
    if (dateParts.length === 3) {
      const date = new Date(
        parseInt(dateParts[0]), 
        parseInt(dateParts[1]) - 1, 
        parseInt(dateParts[2])
      );
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  } catch (e) {
    Logger.log('Error parsing date: ' + e.toString());
  }
  
  return null;
}

/**
 * Calculates Rate Per Mile (RPM)
 * @param {number} rate - Load rate in dollars
 * @param {number} miles - Miles for the load
 * @returns {number} RPM value
 */
function calculateRPM(rate, miles) {
  if (!rate || !miles || miles <= 0) {
    return 0;
  }
  return parseFloat((rate / miles).toFixed(2));
}

/**
 * Generates a unique load ID
 * @returns {string} Load ID in format LD-{timestamp}
 */
function generateLoadId() {
  const timestamp = new Date().getTime();
  return 'LD-' + timestamp;
}

/**
 * Returns display name for an email. Uses System_Users sheet: matches Email column
 * and returns Name column. Fallback to part before @ only if not found in System_Users.
 * @param {string} email - Email address
 * @returns {string} User name from System_Users Name column, or part before @ if not found
 */
function getUserName(email) {
  if (!email) return 'User';
  if (typeof getUserNameFromSystem === 'function') {
    return getUserNameFromSystem(email);
  }
  return email.split('@')[0];
}

/**
 * Escapes HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Appends a reason to the reason log
 * @param {string} currentReason - Current reason log content
 * @param {string} status - Status that triggered the log entry
 * @param {string} reason - Reason text
 * @returns {string} Updated reason log
 */
function appendReasonLog(currentReason, status, reason) {
  const timestamp = new Date().toLocaleString();
  const newEntry = `[${timestamp}] ${status}: ${reason}`;
  
  if (currentReason && currentReason.trim()) {
    return currentReason + '\n' + newEntry;
  }
  
  return newEntry;
}
