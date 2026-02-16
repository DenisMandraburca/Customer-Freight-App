/**
 * Customer Freight App - Backend Code
 * Main entry point for Google Apps Script web app
 */

/**
 * Sets up the database by creating required sheets with headers if they don't exist
 * NOTE: This function should only be run manually, not during page loads
 */
function setupDatabase() {
  let dbId;
  try {
    dbId = getDBId();
  } catch (e) {
    // DB_ID not set in properties, create a new Spreadsheet
    const newSS = SpreadsheetApp.create('Customer Freight Database');
    const newSSId = newSS.getId();
    const newSSUrl = newSS.getUrl();
    
    // Log the information
    Logger.log('New Spreadsheet Created!');
    Logger.log('URL: ' + newSSUrl);
    Logger.log('ID: ' + newSSId);
    Logger.log('Please set DB_ID in Script Properties: ' + newSSId);
    
    // Don't create tabs yet - user needs to set DB_ID first
    return;
  }
  
  // DB_ID is set, open the spreadsheet
  const ss = SpreadsheetApp.openById(dbId);
  
  // Define sheet configurations
  const sheetsConfig = {
    'Loads': [
      'ID', 'Created_Timestamp', 'Status', 'SA_Name', 'Customer_Name', 
      'Customer_Type', 'Load_Ref_Number', 'PU_City', 'PU_State', 'PU_Zip', 
      'PU_Date', 'PU_Appt_Time', 'Del_City', 'Del_State', 'Del_Zip', 
      'Del_Date', 'Del_Appt_Time', 'Rate', 'Miles', 'RPM', 'Notes', 
      'Assigned_Dispatcher', 'Driver_Name', 'Truck_Number', 'McLeod_Order_ID', 
      'Reason_Log', 'Delay_Reson', 'Cancel_Reason', 'Deny_Quote_Reason', 'Other_Notes'
    ],
    'Customers': [
      'Customer_Name', 'Type'
    ],
    'System_Users': [
      'Email', 'Name', 'Role'
    ],
    'Greenbush_Loads': [
      'ID', 'Pickup_Location', 'Destination', 'Receiving_Hours', 'Price', 'Tarp', 'Amount', 'Special_Notes', 'Created_Timestamp'
    ]
  };
  
  // Check and create each sheet
  for (const [sheetName, headers] of Object.entries(sheetsConfig)) {
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      // Create the sheet if it doesn't exist
      sheet = ss.insertSheet(sheetName);
      
      // Set headers in row 1
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format header row (bold, background color)
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');
      
      // Freeze header row
      sheet.setFrozenRows(1);
    } else {
      // Sheet exists, check if headers are correct
      const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const headersMatch = existingHeaders.length === headers.length && 
                          existingHeaders.every((val, idx) => val === headers[idx]);
      
      if (!headersMatch) {
        // Headers don't match, update them
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
  }
}


/**
 * Helper function to include HTML/CSS/JS files in templates
 * @param {string} filename - Name of the file to include (without extension)
 * @returns {string} HTML content of the included file
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


/**
 * Handles GET requests for the web app
 * @param {Object} e - Event object from Google Apps Script
 * @returns {HtmlOutput} HTML template
 */
function doGet(e) {
  try {
    // Get the active user's email
    const userEmail = Session.getActiveUser().getEmail();
    
    if (!userEmail) {
      // No user email, return access denied
      return HtmlService.createTemplateFromFile('AccessDenied')
        .evaluate()
        .setTitle('Access Denied');
    }
    
    // Check if database is configured
    try {
      getDBId();
    } catch (e) {
      // Database not configured, return access denied
      return HtmlService.createTemplateFromFile('AccessDenied')
        .evaluate()
        .setTitle('Access Denied');
    }
    
    // Ensure user exists in System_Users (auto-register with VIEWER role if first time)
    let user;
    try {
      user = ensureUserExists(userEmail);
    } catch (error) {
      Logger.log('Error ensuring user exists in doGet: ' + error.toString());
      // Continue anyway - user might still be able to access; use minimal user object
      user = {
        Email: userEmail,
        Name: getUserNameFromSystem(userEmail),
        Role: 'VIEWER'
      };
    }
    
    // Single unified view for all users
    const template = HtmlService.createTemplateFromFile('UnifiedView');
    template.userEmail = user.Email;
    template.userName = user.Name || getUserNameFromSystem(userEmail);
    template.userRole = user.Role || 'VIEWER';
    template.banned = (user.Role && user.Role.trim().toUpperCase() === 'BANNED');
    
    return template.evaluate()
      .setTitle('Customer Freight App')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return HtmlService.createTemplateFromFile('AccessDenied')
      .evaluate()
      .setTitle('Access Denied');
  }
}

// Note: getInitialData() is defined in LoadService.js and available globally

/**
 * Gets current user (email, name, role) from Session and System_Users.
 * Ensures user exists; returns { email, name, role } for frontend.
 * @returns {Object} { email: string, name: string, role: string }
 */
function getCurrentUser() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) {
      return { email: '', name: 'Unknown User', role: 'VIEWER' };
    }
    const user = ensureUserExists(email);
    return {
      email: user.Email || email,
      name: user.Name || email.split('@')[0],
      role: user.Role || 'VIEWER'
    };
  } catch (error) {
    Logger.log('Error in getCurrentUser: ' + error.toString());
    const email = Session.getActiveUser().getEmail() || '';
    return { email: email, name: email ? email.split('@')[0] : 'Unknown User', role: 'VIEWER' };
  }
}

/**
 * Gets user name from System_Users by email (exposed for frontend)
 * @param {string} email - User email
 * @returns {string} User name or email prefix if not found
 */
function getUserNameFromEmail(email) {
  try {
    return getUserNameFromSystem(email);
  } catch (error) {
    Logger.log('Error getting user name: ' + error.toString());
    return email ? email.split('@')[0] : 'Unknown User';
  }
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use getInitialData() instead
 */
function getSalesInitialData() {
  const result = getInitialData();
  if (!result.success) {
    return {
      customers: [],
      loads: [],
      error: result.error
    };
  }
  return result.data;
}

// Note: createLoad() is defined in LoadService.js and available globally

// Note: handleSalesDecision() is defined in LoadService.js and available globally

/**
 * Legacy function name for backward compatibility
 * @deprecated Use getInitialData() instead
 */
function getDispatchInitialData() {
  const result = getInitialData();
  if (!result.success) {
    return {
      availableLoads: [],
      myLoads: [],
      error: result.error
    };
  }
  
  const loads = result.data.loads || [];
  const availableLoads = loads.filter(l => l.Status === STATUS.AVAILABLE);
  const myLoads = loads.filter(l => 
    l.Status && 
    !EXCLUDED_STATUSES.includes(l.Status)
  );
  
  return {
    availableLoads: availableLoads,
    myLoads: myLoads
  };
}

/**
 * Gets initial data for the Dispatcher view in UnifiedView.
 * Returns availableLoads (same as getDispatchInitialData) and myLoads filtered
 * to only loads where Assigned_Dispatcher matches the current user's display name.
 * @returns {Object} { availableLoads, myLoads }
 */
function getDispatcherInitialData() {
  const result = getInitialData();
  if (!result.success) {
    return {
      availableLoads: [],
      myLoads: [],
      error: result.error
    };
  }
  const userEmail = Session.getActiveUser().getEmail();
  const userName = getUserNameFromSystem(userEmail);
  const loads = result.data.loads || [];
  const availableLoads = loads.filter(l => l.Status === STATUS.AVAILABLE);
  const myLoads = loads.filter(l =>
    l.Status &&
    !EXCLUDED_STATUSES.includes(l.Status) &&
    (l.Assigned_Dispatcher || '').trim() === (userName || '').trim()
  );
  return {
    availableLoads: availableLoads,
    myLoads: myLoads
  };
}

// Note: submitBookingRequest() is defined in LoadService.js and available globally

// Note: submitQuote() is defined in LoadService.js and available globally

// Note: updateLoadStatus() is defined in LoadService.js and available globally

// Note: updateLoad() is defined in LoadService.js and available globally

/**
 * Gets all customer data for the Customers view
 * @returns {Object} Result object with customers array
 */
function getAllCustomers() {
  try {
    const customers = getAllCustomersData();
    return createSuccessResponse({
      customers: customers
    });
  } catch (error) {
    return handleError(error, 'getAllCustomers');
  }
}

/**
 * Gets customer type by customer name (exposed for frontend)
 * Note: getCustomerType() is defined in DataAccess.js and available globally
 * This is just an alias to expose it to the frontend
 * @param {string} customerName - Customer name
 * @returns {string} Customer type or empty string
 */
function getCustomerTypeForLoad(customerName) {
  try {
    // Call the DataAccess function
    const sheet = getSheet(SHEET_NAMES.CUSTOMERS);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() === customerName.trim()) {
        return data[i][1] ? data[i][1].toString() : '';
      }
    }
    
    return '';
  } catch (error) {
    Logger.log('Error getting customer type: ' + error.toString());
    return '';
  }
}

/**
 * Creates a new customer
 * @param {Object} customerData - Customer data object with customerName and customerType
 * @returns {Object} Result object with success status
 */
function createCustomer(customerData) {
  try {
    // Validate input
    if (!customerData.customerName || !customerData.customerName.trim()) {
      return createErrorResponse('Customer Name is required');
    }
    
    if (!customerData.customerType || !customerData.customerType.trim()) {
      return createErrorResponse('Customer Type is required');
    }
    
    // Validate customer type
    const validTypes = ['Direct Customer', 'Broker'];
    if (!validTypes.includes(customerData.customerType.trim())) {
      return createErrorResponse('Invalid Customer Type. Must be "Direct Customer" or "Broker"');
    }
    
    // Sanitize inputs
    const customerName = sanitizeString(customerData.customerName.trim());
    const customerType = sanitizeString(customerData.customerType.trim());
    // Handle quoteAccept - it can be boolean true/false or string 'true'/'false'
    // When passed through google.script.run, booleans may be serialized as strings
    let quoteAccept = false;
    if (customerData.quoteAccept !== undefined && customerData.quoteAccept !== null) {
      if (customerData.quoteAccept === true || customerData.quoteAccept === 'true' || customerData.quoteAccept === 'TRUE' || customerData.quoteAccept === 1 || customerData.quoteAccept === '1') {
        quoteAccept = true;
      } else {
        quoteAccept = false;
      }
    }
    
    // Insert customer record
    insertCustomerRecord(customerName, customerType, quoteAccept);
    
    return createSuccessResponse({
      message: 'Customer created successfully'
    });
  } catch (error) {
    return handleError(error, 'createCustomer');
  }
}

/**
 * Updates an existing customer
 * @param {Object} customerData - Customer data object with originalName, customerName and customerType
 * @returns {Object} Result object with success status
 */
function updateCustomer(customerData) {
  try {
    // Validate input
    if (!customerData.originalName || !customerData.originalName.trim()) {
      return createErrorResponse('Original customer name is required');
    }
    
    if (!customerData.customerName || !customerData.customerName.trim()) {
      return createErrorResponse('Customer Name is required');
    }
    
    if (!customerData.customerType || !customerData.customerType.trim()) {
      return createErrorResponse('Customer Type is required');
    }
    
    // Validate customer type
    const validTypes = ['Direct Customer', 'Broker'];
    if (!validTypes.includes(customerData.customerType.trim())) {
      return createErrorResponse('Invalid Customer Type. Must be "Direct Customer" or "Broker"');
    }
    
    // Sanitize inputs
    const originalName = sanitizeString(customerData.originalName.trim());
    const customerName = sanitizeString(customerData.customerName.trim());
    const customerType = sanitizeString(customerData.customerType.trim());
    // Handle quoteAccept - it can be boolean true/false or string 'true'/'false'
    // When passed through google.script.run, booleans may be serialized as strings
    let quoteAccept = false;
    if (customerData.quoteAccept !== undefined && customerData.quoteAccept !== null) {
      if (customerData.quoteAccept === true || customerData.quoteAccept === 'true' || customerData.quoteAccept === 'TRUE' || customerData.quoteAccept === 1 || customerData.quoteAccept === '1') {
        quoteAccept = true;
      } else {
        quoteAccept = false;
      }
    }
    
    // Update customer record
    updateCustomerRecord(originalName, customerName, customerType, quoteAccept);
    
    return createSuccessResponse({
      message: 'Customer updated successfully'
    });
  } catch (error) {
    return handleError(error, 'updateCustomer');
  }
}

/**
 * Deletes a customer
 * @param {string} customerName - Customer name to delete
 * @returns {Object} Result object with success status
 */
function deleteCustomer(customerName) {
  try {
    // Validate input
    if (!customerName || !customerName.trim()) {
      return createErrorResponse('Customer name is required');
    }
    
    // Sanitize input
    const name = sanitizeString(customerName.trim());
    
    // Delete customer record
    deleteCustomerRecord(name);
    
    return createSuccessResponse({
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    return handleError(error, 'deleteCustomer');
  }
}

/**
 * Gets all users data for the Users view
 * @returns {Object} Result object with users array
 */
function getAllUsers() {
  try {
    const users = getAllUsersData();
    return createSuccessResponse({
      users: users
    });
  } catch (error) {
    return handleError(error, 'getAllUsers');
  }
}

/**
 * Validates email domain against allowed company domains
 * @param {string} email - Email address to validate
 * @returns {Object} Validation result with valid flag and error message
 */
function validateEmailDomain(email) {
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      error: 'Email is required'
    };
  }
  
  // Extract domain from email
  const emailParts = email.trim().split('@');
  if (emailParts.length !== 2) {
    return {
      valid: false,
      error: 'Invalid email format'
    };
  }
  
  const domain = emailParts[1].toLowerCase();
  const allowedDomains = getCompanyDomains();
  
  if (allowedDomains.length === 0) {
    // No domains configured, allow all
    return {
      valid: true
    };
  }
  
  // Check if domain matches any allowed domain
  const isValid = allowedDomains.some(allowedDomain => domain === allowedDomain);
  
  if (!isValid) {
    return {
      valid: false,
      error: 'Email must be from an allowed company domain. Allowed domains: ' + allowedDomains.join(', ')
    };
  }
  
  return {
    valid: true
  };
}

/**
 * Creates a new user
 * @param {Object} userData - User data object with email, name, and role
 * @returns {Object} Result object with success status
 */
function createUser(userData) {
  try {
    // Validate input
    if (!userData.email || !userData.email.trim()) {
      return createErrorResponse('Email is required');
    }
    
    if (!userData.name || !userData.name.trim()) {
      return createErrorResponse('Name is required');
    }
    
    if (!userData.role || !userData.role.trim()) {
      return createErrorResponse('Role is required');
    }
    
    // Validate role
    const validRoles = ['ADMIN', 'MANAGER', 'ACCOUNT MANAGER', 'DISPATCHER', 'VIEWER', 'BANNED'];
    if (!validRoles.includes(userData.role.trim())) {
      return createErrorResponse('Invalid Role. Must be one of: ADMIN, MANAGER, ACCOUNT MANAGER, DISPATCHER, VIEWER, BANNED');
    }
    
    // Validate email domain
    const domainValidation = validateEmailDomain(userData.email);
    if (!domainValidation.valid) {
      return createErrorResponse(domainValidation.error);
    }
    
    // Sanitize inputs
    const email = sanitizeString(userData.email.trim());
    const name = sanitizeString(userData.name.trim());
    const role = sanitizeString(userData.role.trim());
    
    // Insert user record
    insertUserRecord(email, name, role);
    
    return createSuccessResponse({
      message: 'User created successfully'
    });
  } catch (error) {
    return handleError(error, 'createUser');
  }
}

/**
 * Updates an existing user
 * @param {Object} userData - User data object with originalEmail, email, name, and role
 * @returns {Object} Result object with success status
 */
function updateUser(userData) {
  try {
    // Validate input
    if (!userData.originalEmail || !userData.originalEmail.trim()) {
      return createErrorResponse('Original email is required');
    }
    
    if (!userData.email || !userData.email.trim()) {
      return createErrorResponse('Email is required');
    }
    
    if (!userData.name || !userData.name.trim()) {
      return createErrorResponse('Name is required');
    }
    
    if (!userData.role || !userData.role.trim()) {
      return createErrorResponse('Role is required');
    }
    
    // Validate role
    const validRoles = ['ADMIN', 'MANAGER', 'ACCOUNT MANAGER', 'DISPATCHER', 'VIEWER', 'BANNED'];
    if (!validRoles.includes(userData.role.trim())) {
      return createErrorResponse('Invalid Role. Must be one of: ADMIN, MANAGER, ACCOUNT MANAGER, DISPATCHER, VIEWER, BANNED');
    }
    
    // Validate email domain
    const domainValidation = validateEmailDomain(userData.email);
    if (!domainValidation.valid) {
      return createErrorResponse(domainValidation.error);
    }
    
    // Sanitize inputs
    const originalEmail = sanitizeString(userData.originalEmail.trim());
    const email = sanitizeString(userData.email.trim());
    const name = sanitizeString(userData.name.trim());
    const role = sanitizeString(userData.role.trim());
    
    // Update user record
    updateUserRecord(originalEmail, email, name, role);
    
    return createSuccessResponse({
      message: 'User updated successfully'
    });
  } catch (error) {
    return handleError(error, 'updateUser');
  }
}

/**
 * Deletes a user
 * @param {string} email - User email to delete
 * @returns {Object} Result object with success status
 */
function deleteUser(email) {
  try {
    // Validate input
    if (!email || !email.trim()) {
      return createErrorResponse('User email is required');
    }
    
    // Sanitize input
    const userEmail = sanitizeString(email.trim());
    
    // Delete user record
    deleteUserRecord(userEmail);
    
    return createSuccessResponse({
      message: 'User deleted successfully'
    });
  } catch (error) {
    return handleError(error, 'deleteUser');
  }
}

/**
 * Bans a user by setting their role to BANNED
 * @param {string} email - User email to ban
 * @returns {Object} Result object with success status
 */
function banUser(email) {
  try {
    // Validate input
    if (!email || !email.trim()) {
      return createErrorResponse('User email is required');
    }
    
    // Sanitize input
    const userEmail = sanitizeString(email.trim());
    
    // Get current user data
    const users = getAllUsersData();
    const user = users.find(u => u.Email && u.Email.trim().toLowerCase() === userEmail.toLowerCase());
    
    if (!user) {
      return createErrorResponse('User not found');
    }
    
    // Update user role to BANNED
    updateUserRecord(userEmail, user.Email, user.Name || '', 'BANNED');
    
    return createSuccessResponse({
      message: 'User banned successfully'
    });
  } catch (error) {
    return handleError(error, 'banUser');
  }
}

// ---------------------------------------------------------------------------
// Greenbush Loads (flexible loads, no PU/Del dates)
// ---------------------------------------------------------------------------

/**
 * Gets column indices for Greenbush_Loads sheet from header row (sheet read)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Greenbush_Loads sheet
 * @returns {Object} Map of column name to 0-based index
 */
function _getGreenbushColumnIndices(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return _getGreenbushColumnIndicesFromHeaders(headers);
}

/**
 * Gets column indices from header row array (no sheet read). Use when header row is already in memory.
 * @param {Array} headers - Header row as array of values (e.g. data[0] from getDataRange().getValues())
 * @returns {Object} Map of column name to 0-based index
 */
function _getGreenbushColumnIndicesFromHeaders(headers) {
  const indices = {};
  Object.values(GREENBUSH_COLUMNS).forEach(function (colName) {
    indices[colName] = headers.indexOf(colName);
  });
  return indices;
}

/**
 * Maps a Greenbush sheet row to an object (row is 0-based array; row[0] = first column)
 * @param {Array} row - Row data array
 * @param {Object} indices - Column indices from _getGreenbushColumnIndices
 * @returns {Object} Greenbush load object
 */
function _mapRowToGreenbushLoad(row, indices) {
  return {
    ID: row[indices[GREENBUSH_COLUMNS.ID]] != null ? String(row[indices[GREENBUSH_COLUMNS.ID]]).trim() : '',
    Pickup_Location: row[indices[GREENBUSH_COLUMNS.PICKUP_LOCATION]] != null ? String(row[indices[GREENBUSH_COLUMNS.PICKUP_LOCATION]]).trim() : '',
    Destination: row[indices[GREENBUSH_COLUMNS.DESTINATION]] != null ? String(row[indices[GREENBUSH_COLUMNS.DESTINATION]]).trim() : '',
    Receiving_Hours: row[indices[GREENBUSH_COLUMNS.RECEIVING_HOURS]] != null ? String(row[indices[GREENBUSH_COLUMNS.RECEIVING_HOURS]]).trim() : '',
    Price: row[indices[GREENBUSH_COLUMNS.PRICE]] != null ? Number(row[indices[GREENBUSH_COLUMNS.PRICE]]) : 0,
    Tarp: row[indices[GREENBUSH_COLUMNS.TARP]] != null ? String(row[indices[GREENBUSH_COLUMNS.TARP]]).trim() : '',
    Amount: row[indices[GREENBUSH_COLUMNS.AMOUNT]] != null ? Number(row[indices[GREENBUSH_COLUMNS.AMOUNT]]) : 0,
    Special_Notes: row[indices[GREENBUSH_COLUMNS.SPECIAL_NOTES]] != null ? String(row[indices[GREENBUSH_COLUMNS.SPECIAL_NOTES]]).trim() : ''
  };
}

/**
 * Gets all Greenbush loads from the sheet (for Greenbush tab)
 * @returns {Object} Result with success and data (array of Greenbush load objects) or error
 */
function getGreenbushLoads() {
  try {
    const sheet = getSheet(SHEET_NAMES.GREENBUSH_LOADS);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createSuccessResponse([]);
    }
    const indices = _getGreenbushColumnIndicesFromHeaders(data[0]);
    const loads = [];
    for (let i = 1; i < data.length; i++) {
      loads.push(_mapRowToGreenbushLoad(data[i], indices));
    }
    return createSuccessResponse(loads);
  } catch (error) {
    return handleError(error, 'getGreenbushLoads');
  }
}

/**
 * Saves one or more Greenbush loads (appends rows, generates IDs)
 * @param {Array<Object>} rows - Array of objects with Pickup_Location, Destination, Receiving_Hours, Price, Tarp, Amount, Special_Notes (ID and Created_Timestamp are generated)
 * @returns {Object} Result with success and data (saved count or message) or error
 */
function saveGreenbushLoads(rows) {
  try {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return createErrorResponse('No rows to save');
    }
    const sheet = getSheet(SHEET_NAMES.GREENBUSH_LOADS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const now = new Date();
    const startRow = sheet.getLastRow() + 1;
    const values = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const id = 'GB-' + Date.now() + '-' + i;
      values.push([
        id,
        (r.Pickup_Location != null ? String(r.Pickup_Location).trim() : ''),
        (r.Destination != null ? String(r.Destination).trim() : ''),
        (r.Receiving_Hours != null ? String(r.Receiving_Hours).trim() : ''),
        (r.Price != null ? Number(r.Price) : 0),
        (r.Tarp != null ? String(r.Tarp).trim() : ''),
        (r.Amount != null ? Number(r.Amount) : 0),
        (r.Special_Notes != null ? String(r.Special_Notes).trim() : ''),
        now
      ]);
    }
    if (values.length > 0) {
      // getRange(row, column, numRows, numColumns) - 3rd/4th params are count, not end row/column
      sheet.getRange(startRow, 1, values.length, headers.length).setValues(values);
    }
    return createSuccessResponse({ saved: values.length });
  } catch (error) {
    return handleError(error, 'saveGreenbushLoads');
  }
}

/**
 * Replaces all data in Greenbush_Loads with the given rows (used by Bulk Add). Keeps header row; clears existing data rows then writes new rows. Quoted records in Loads tab are unaffected.
 * @param {Array<Object>} rows - Array of objects with Pickup_Location, Destination, Receiving_Hours, Price, Tarp, Amount, Special_Notes (ID and Created_Timestamp are generated)
 * @returns {Object} Result with success and data (saved count) or error
 */
function replaceGreenbushLoads(rows) {
  try {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return createErrorResponse('No rows to save');
    }
    const sheet = getSheet(SHEET_NAMES.GREENBUSH_LOADS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow, sheet.getLastColumn()).clearContent();
    }
    const now = new Date();
    const values = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const id = 'GB-' + Date.now() + '-' + i;
      values.push([
        id,
        (r.Pickup_Location != null ? String(r.Pickup_Location).trim() : ''),
        (r.Destination != null ? String(r.Destination).trim() : ''),
        (r.Receiving_Hours != null ? String(r.Receiving_Hours).trim() : ''),
        (r.Price != null ? Number(r.Price) : 0),
        (r.Tarp != null ? String(r.Tarp).trim() : ''),
        (r.Amount != null ? Number(r.Amount) : 0),
        (r.Special_Notes != null ? String(r.Special_Notes).trim() : ''),
        now
      ]);
    }
    if (values.length > 0) {
      sheet.getRange(2, 1, values.length, headers.length).setValues(values);
    }
    return createSuccessResponse({ saved: values.length });
  } catch (error) {
    return handleError(error, 'replaceGreenbushLoads');
  }
}

/**
 * Updates an existing Greenbush load by ID
 * @param {string} id - Greenbush load ID
 * @param {Object} row - Object with Pickup_Location, Destination, Receiving_Hours, Price, Tarp, Amount, Special_Notes
 * @returns {Object} Result with success and data or error
 */
function updateGreenbushLoad(id, row) {
  try {
    if (!id || !String(id).trim()) {
      return createErrorResponse('Load ID is required');
    }
    const sheet = getSheet(SHEET_NAMES.GREENBUSH_LOADS);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createErrorResponse('Greenbush load not found');
    }
    const headers = data[0];
    const idIdx = headers.indexOf(GREENBUSH_COLUMNS.ID);
    const pickupIdx = headers.indexOf(GREENBUSH_COLUMNS.PICKUP_LOCATION);
    const destIdx = headers.indexOf(GREENBUSH_COLUMNS.DESTINATION);
    const hoursIdx = headers.indexOf(GREENBUSH_COLUMNS.RECEIVING_HOURS);
    const priceIdx = headers.indexOf(GREENBUSH_COLUMNS.PRICE);
    const tarpIdx = headers.indexOf(GREENBUSH_COLUMNS.TARP);
    const amountIdx = headers.indexOf(GREENBUSH_COLUMNS.AMOUNT);
    const notesIdx = headers.indexOf(GREENBUSH_COLUMNS.SPECIAL_NOTES);
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]).trim() === String(id).trim()) {
        const r = data[i];
        r[pickupIdx] = row.Pickup_Location != null ? String(row.Pickup_Location).trim() : '';
        r[destIdx] = row.Destination != null ? String(row.Destination).trim() : '';
        r[hoursIdx] = row.Receiving_Hours != null ? String(row.Receiving_Hours).trim() : '';
        r[priceIdx] = row.Price != null ? Number(row.Price) : 0;
        r[tarpIdx] = row.Tarp != null ? String(row.Tarp).trim() : '';
        r[amountIdx] = row.Amount != null ? Number(row.Amount) : 0;
        r[notesIdx] = row.Special_Notes != null ? String(row.Special_Notes).trim() : '';
        sheet.getRange(i + 1, 1, i + 1, headers.length).setValues([r]);
        return createSuccessResponse({ updated: true });
      }
    }
    return createErrorResponse('Greenbush load not found');
  } catch (error) {
    return handleError(error, 'updateGreenbushLoad');
  }
}

/**
 * Gets a single Greenbush load by ID from Greenbush_Loads sheet
 * @param {string} greenbushLoadId - Greenbush load ID
 * @returns {Object|null} Greenbush load object or null if not found
 */
function getGreenbushLoadById(greenbushLoadId) {
  if (!greenbushLoadId || !String(greenbushLoadId).trim()) {
    return null;
  }
  const sheet = getSheet(SHEET_NAMES.GREENBUSH_LOADS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return null;
  }
  const indices = _getGreenbushColumnIndices(sheet);
  const idCol = indices[GREENBUSH_COLUMNS.ID];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === String(greenbushLoadId).trim()) {
      return _mapRowToGreenbushLoad(data[i], indices);
    }
  }
  return null;
}

/**
 * Creates a Greenbush quote (Load row) from an Available Greenbush load. Used when dispatcher clicks Quote.
 * @param {string} greenbushLoadId - Greenbush_Loads row ID
 * @param {string} pickupDate - Pickup date YYYY-MM-DD
 * @param {string} truck - Truck number
 * @param {string} driver - Driver name (optional)
 * @returns {Object} Result with success and loadId or error
 */
function createGreenbushQuote(greenbushLoadId, pickupDate, truck, driver) {
  try {
    if (!greenbushLoadId || !String(greenbushLoadId).trim()) {
      return createErrorResponse('Greenbush load ID is required');
    }
    if (!pickupDate || !String(pickupDate).trim()) {
      return createErrorResponse('Pickup date is required');
    }
    if (!truck || !String(truck).trim()) {
      return createErrorResponse('Truck is required');
    }
    const gbLoad = getGreenbushLoadById(greenbushLoadId);
    if (!gbLoad) {
      return createErrorResponse('Greenbush load not found');
    }
    const userEmail = Session.getActiveUser().getEmail();
    ensureUserExists(userEmail);
    const userName = getUserNameFromSystem(userEmail);
    const loadId = generateLoadId();
    const puDate = parseDateString(pickupDate);
    if (!puDate) {
      return createErrorResponse('Invalid pickup date');
    }
    // Route: use Pickup_Location as PU_City, Destination as Del_City (state/zip empty or placeholder)
    const puCity = (gbLoad.Pickup_Location || '').trim();
    const delCity = (gbLoad.Destination || '').trim();
    const rate = gbLoad.Price != null ? Number(gbLoad.Price) : 0;
    const reasonLog = 'Greenbush_Load_ID: ' + String(greenbushLoadId).trim();
    const loadData = {};
    loadData[LOAD_COLUMNS.ID] = loadId;
    loadData[LOAD_COLUMNS.CREATED_TIMESTAMP] = new Date();
    loadData[LOAD_COLUMNS.STATUS] = STATUS.QUOTE_SUBMITTED;
    loadData[LOAD_COLUMNS.SA_NAME] = sanitizeString(userName);
    loadData[LOAD_COLUMNS.CUSTOMER_NAME] = 'Greenbush';
    loadData[LOAD_COLUMNS.CUSTOMER_TYPE] = '';
    loadData[LOAD_COLUMNS.LOAD_REF_NUMBER] = 'GB-Q';
    loadData[LOAD_COLUMNS.MCLEOD_ORDER_ID] = '';
    loadData[LOAD_COLUMNS.PU_CITY] = sanitizeString(puCity);
    loadData[LOAD_COLUMNS.PU_STATE] = '';
    loadData[LOAD_COLUMNS.PU_ZIP] = '';
    loadData[LOAD_COLUMNS.PU_DATE] = puDate;
    loadData[LOAD_COLUMNS.PU_APPT_TIME] = (gbLoad.Receiving_Hours || '').trim();
    loadData[LOAD_COLUMNS.PU_APPT] = false;
    loadData[LOAD_COLUMNS.DEL_CITY] = sanitizeString(delCity);
    loadData[LOAD_COLUMNS.DEL_STATE] = '';
    loadData[LOAD_COLUMNS.DEL_ZIP] = '';
    loadData[LOAD_COLUMNS.DEL_DATE] = '';
    loadData[LOAD_COLUMNS.DEL_APPT_TIME] = '';
    loadData[LOAD_COLUMNS.DEL_APPT] = false;
    loadData[LOAD_COLUMNS.RATE] = rate;
    loadData[LOAD_COLUMNS.MILES] = 0;
    loadData[LOAD_COLUMNS.RPM] = 0;
    loadData[LOAD_COLUMNS.NOTES] = sanitizeString(gbLoad.Special_Notes || '');
    loadData[LOAD_COLUMNS.ASSIGNED_DISPATCHER] = sanitizeString(userName);
    loadData[LOAD_COLUMNS.DRIVER_NAME] = (driver != null && String(driver).trim()) ? sanitizeString(String(driver).trim()) : '';
    loadData[LOAD_COLUMNS.TRUCK_NUMBER] = sanitizeString(String(truck).trim());
    loadData[LOAD_COLUMNS.REASON_LOG] = reasonLog;
    insertLoadRecord(loadData);
    // Decrement Greenbush Amount when quote is submitted (order is quoted)
    decrementGreenbushLoadAmount(greenbushLoadId);
    // Do not fail quote creation if decrement fails; amount can be corrected manually
    return createSuccessResponse({
      loadId: loadId,
      message: 'Greenbush quote created successfully'
    });
  } catch (error) {
    return handleError(error, 'createGreenbushQuote');
  }
}

/**
 * Increments Amount by 1 for a Greenbush_Loads row by ID. Called when Greenbush request/quote is canceled or denied.
 * @param {string} greenbushLoadId - Greenbush_Loads row ID
 * @returns {Object} Result with success and newAmount or error
 */
function incrementGreenbushLoadAmount(greenbushLoadId) {
  try {
    if (!greenbushLoadId || !String(greenbushLoadId).trim()) {
      return createErrorResponse('Greenbush load ID is required');
    }
    const sheet = getSheet(SHEET_NAMES.GREENBUSH_LOADS);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createErrorResponse('Greenbush load not found');
    }
    const headers = data[0];
    const idIdx = headers.indexOf(GREENBUSH_COLUMNS.ID);
    const amountIdx = headers.indexOf(GREENBUSH_COLUMNS.AMOUNT);
    if (idIdx < 0 || amountIdx < 0) {
      return createErrorResponse('Greenbush_Loads sheet missing ID or Amount column');
    }
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]).trim() === String(greenbushLoadId).trim()) {
        const currentAmount = Number(data[i][amountIdx]) || 0;
        const newAmount = currentAmount + 1;
        sheet.getRange(i + 1, amountIdx + 1).setValue(newAmount);
        return createSuccessResponse({ newAmount: newAmount });
      }
    }
    return createErrorResponse('Greenbush load not found');
  } catch (error) {
    return handleError(error, 'incrementGreenbushLoadAmount');
  }
}

/**
 * Decrements Amount by 1 for a Greenbush_Loads row by ID. Called when quote is submitted (order is quoted).
 * @param {string} greenbushLoadId - Greenbush_Loads row ID
 * @returns {Object} Result with success and newAmount or error
 */
function decrementGreenbushLoadAmount(greenbushLoadId) {
  try {
    if (!greenbushLoadId || !String(greenbushLoadId).trim()) {
      return createErrorResponse('Greenbush load ID is required');
    }
    const sheet = getSheet(SHEET_NAMES.GREENBUSH_LOADS);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createErrorResponse('Greenbush load not found');
    }
    const headers = data[0];
    const idIdx = headers.indexOf(GREENBUSH_COLUMNS.ID);
    const amountIdx = headers.indexOf(GREENBUSH_COLUMNS.AMOUNT);
    if (idIdx < 0 || amountIdx < 0) {
      return createErrorResponse('Greenbush_Loads sheet missing ID or Amount column');
    }
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]).trim() === String(greenbushLoadId).trim()) {
        const currentAmount = Number(data[i][amountIdx]) || 0;
        const newAmount = Math.max(0, currentAmount - 1);
        sheet.getRange(i + 1, amountIdx + 1).setValue(newAmount);
        return createSuccessResponse({ newAmount: newAmount });
      }
    }
    return createErrorResponse('Greenbush load not found');
  } catch (error) {
    return handleError(error, 'decrementGreenbushLoadAmount');
  }
}

