/**
 * Data Access Layer
 * Abstraction layer for all spreadsheet operations
 */

/**
 * Cache for loads data
 */
const _cache = {
  loads: null,
  lastFetch: null,
  cacheDuration: 5000 // 5 seconds
};

/**
 * Gets a sheet by name
 * @param {string} sheetName - Name of the sheet
 * @returns {Sheet} Google Sheets Sheet object
 */
function getSheet(sheetName) {
  const dbId = getDBId();
  const ss = SpreadsheetApp.openById(dbId);
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  
  return sheet;
}

/**
 * Gets column indices for a sheet
 * @param {Sheet} sheet - Sheet object
 * @returns {Object} Object mapping column names to indices
 */
function getColumnIndices(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const indices = {};
  
  // Map all load columns
  Object.values(LOAD_COLUMNS).forEach(colName => {
    indices[colName] = headers.indexOf(colName);
  });
  
  return indices;
}

/**
 * Maps a row to a load object
 * @param {Array} row - Row data array
 * @param {Object} indices - Column indices object
 * @returns {Object} Load object
 */
function mapRowToLoad(row, indices) {
  return {
    ID: row[indices[LOAD_COLUMNS.ID]] ? row[indices[LOAD_COLUMNS.ID]].toString() : '',
    Status: row[indices[LOAD_COLUMNS.STATUS]] ? row[indices[LOAD_COLUMNS.STATUS]].toString().trim() : '',
    SA_Name: row[indices[LOAD_COLUMNS.SA_NAME]] ? row[indices[LOAD_COLUMNS.SA_NAME]].toString() : '',
    Customer_Name: row[indices[LOAD_COLUMNS.CUSTOMER_NAME]] ? row[indices[LOAD_COLUMNS.CUSTOMER_NAME]].toString() : '',
    Customer_Type: row[indices[LOAD_COLUMNS.CUSTOMER_TYPE]] ? row[indices[LOAD_COLUMNS.CUSTOMER_TYPE]].toString() : '',
    Load_Ref_Number: row[indices[LOAD_COLUMNS.LOAD_REF_NUMBER]] ? row[indices[LOAD_COLUMNS.LOAD_REF_NUMBER]].toString() : '',
    PU_City: row[indices[LOAD_COLUMNS.PU_CITY]] ? row[indices[LOAD_COLUMNS.PU_CITY]].toString() : '',
    PU_State: row[indices[LOAD_COLUMNS.PU_STATE]] ? row[indices[LOAD_COLUMNS.PU_STATE]].toString() : '',
    PU_Zip: row[indices[LOAD_COLUMNS.PU_ZIP]] ? row[indices[LOAD_COLUMNS.PU_ZIP]].toString() : '',
    PU_Date: row[indices[LOAD_COLUMNS.PU_DATE]] ? formatDate(row[indices[LOAD_COLUMNS.PU_DATE]]) : '',
    PU_Appt_Time: row[indices[LOAD_COLUMNS.PU_APPT_TIME]] ? row[indices[LOAD_COLUMNS.PU_APPT_TIME]].toString() : '',
    PU_APPT: indices[LOAD_COLUMNS.PU_APPT] >= 0 && row[indices[LOAD_COLUMNS.PU_APPT]] ? (row[indices[LOAD_COLUMNS.PU_APPT]] === true || row[indices[LOAD_COLUMNS.PU_APPT]] === 'TRUE' || row[indices[LOAD_COLUMNS.PU_APPT]] === 'true') : false,
    Del_City: row[indices[LOAD_COLUMNS.DEL_CITY]] ? row[indices[LOAD_COLUMNS.DEL_CITY]].toString() : '',
    Del_State: row[indices[LOAD_COLUMNS.DEL_STATE]] ? row[indices[LOAD_COLUMNS.DEL_STATE]].toString() : '',
    Del_Zip: row[indices[LOAD_COLUMNS.DEL_ZIP]] ? row[indices[LOAD_COLUMNS.DEL_ZIP]].toString() : '',
    Del_Date: row[indices[LOAD_COLUMNS.DEL_DATE]] ? formatDate(row[indices[LOAD_COLUMNS.DEL_DATE]]) : '',
    Del_Appt_Time: row[indices[LOAD_COLUMNS.DEL_APPT_TIME]] ? row[indices[LOAD_COLUMNS.DEL_APPT_TIME]].toString() : '',
    Del_APPT: indices[LOAD_COLUMNS.DEL_APPT] >= 0 && row[indices[LOAD_COLUMNS.DEL_APPT]] ? (row[indices[LOAD_COLUMNS.DEL_APPT]] === true || row[indices[LOAD_COLUMNS.DEL_APPT]] === 'TRUE' || row[indices[LOAD_COLUMNS.DEL_APPT]] === 'true') : false,
    Rate: row[indices[LOAD_COLUMNS.RATE]] ? parseFloat(row[indices[LOAD_COLUMNS.RATE]]).toFixed(2) : '0.00',
    Miles: row[indices[LOAD_COLUMNS.MILES]] ? parseFloat(row[indices[LOAD_COLUMNS.MILES]]).toFixed(2) : '0.00',
    RPM: row[indices[LOAD_COLUMNS.RPM]] ? parseFloat(row[indices[LOAD_COLUMNS.RPM]]).toFixed(2) : '0.00',
    Notes: row[indices[LOAD_COLUMNS.NOTES]] ? row[indices[LOAD_COLUMNS.NOTES]].toString() : '',
    Reason_Log: row[indices[LOAD_COLUMNS.REASON_LOG]] ? row[indices[LOAD_COLUMNS.REASON_LOG]].toString() : '',
    Assigned_Dispatcher: row[indices[LOAD_COLUMNS.ASSIGNED_DISPATCHER]] ? row[indices[LOAD_COLUMNS.ASSIGNED_DISPATCHER]].toString() : '',
    Driver_Name: row[indices[LOAD_COLUMNS.DRIVER_NAME]] ? row[indices[LOAD_COLUMNS.DRIVER_NAME]].toString() : '',
    Truck_Number: row[indices[LOAD_COLUMNS.TRUCK_NUMBER]] ? row[indices[LOAD_COLUMNS.TRUCK_NUMBER]].toString() : '',
    McLeod_Order_ID: row[indices[LOAD_COLUMNS.MCLEOD_ORDER_ID]] ? row[indices[LOAD_COLUMNS.MCLEOD_ORDER_ID]].toString() : '',
    Equipment: indices[LOAD_COLUMNS.EQUIPMENT] >= 0 && row[indices[LOAD_COLUMNS.EQUIPMENT]] ? row[indices[LOAD_COLUMNS.EQUIPMENT]].toString() : '',
    Delay_Reason: indices[LOAD_COLUMNS.DELAY_REASON] >= 0 && row[indices[LOAD_COLUMNS.DELAY_REASON]] ? row[indices[LOAD_COLUMNS.DELAY_REASON]].toString() : '',
    Cancel_Reason: indices[LOAD_COLUMNS.CANCEL_REASON] >= 0 && row[indices[LOAD_COLUMNS.CANCEL_REASON]] ? row[indices[LOAD_COLUMNS.CANCEL_REASON]].toString() : '',
    Deny_Quote_Reason: indices[LOAD_COLUMNS.DENY_QUOTE_REASON] >= 0 && row[indices[LOAD_COLUMNS.DENY_QUOTE_REASON]] ? row[indices[LOAD_COLUMNS.DENY_QUOTE_REASON]].toString() : '',
    Other_Notes: indices[LOAD_COLUMNS.OTHER_NOTES] >= 0 && row[indices[LOAD_COLUMNS.OTHER_NOTES]] ? row[indices[LOAD_COLUMNS.OTHER_NOTES]].toString() : ''
  };
}

/**
 * Fetches all loads from the sheet (internal method)
 * @returns {Array} Array of load objects
 */
function _fetchAllLoads() {
  const sheet = getSheet(SHEET_NAMES.LOADS);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return []; // No data rows
  }
  
  const headers = data[0];
  const indices = getColumnIndices(sheet);
  
  const loads = [];
  for (let i = 1; i < data.length; i++) {
    loads.push(mapRowToLoad(data[i], indices));
  }
  
  return loads;
}

/**
 * Gets all loads with optional caching
 * @param {boolean} forceRefresh - Force refresh cache
 * @returns {Array} Array of load objects
 */
function getAllLoads(forceRefresh = false) {
  const now = Date.now();
  
  if (!forceRefresh && 
      _cache.loads && 
      (now - _cache.lastFetch) < _cache.cacheDuration) {
    return _cache.loads;
  }
  
  const loads = _fetchAllLoads();
  _cache.loads = loads;
  _cache.lastFetch = now;
  return loads;
}

/**
 * Gets a load by ID
 * @param {string} loadId - Load ID
 * @returns {Object|null} Load object or null if not found
 */
function getLoadById(loadId) {
  const loads = getAllLoads();
  return loads.find(load => load.ID === loadId) || null;
}

/**
 * Finds the row index for a load by ID
 * @param {string} loadId - Load ID
 * @returns {number} Row index (1-indexed) or -1 if not found
 */
function findLoadRow(loadId) {
  const sheet = getSheet(SHEET_NAMES.LOADS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(LOAD_COLUMNS.ID);
  
  if (idIdx < 0) return -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] && data[i][idIdx].toString() === loadId) {
      return i + 1; // +1 because sheet rows are 1-indexed
    }
  }
  
  return -1;
}

/**
 * Gets loads by status
 * @param {string} status - Status to filter by
 * @returns {Array} Array of load objects
 */
function getLoadsByStatus(status) {
  return getAllLoads().filter(load => load.Status === status);
}

/**
 * Gets customers list
 * @returns {Array} Array of customer names
 */
function getCustomers() {
  const sheet = getSheet(SHEET_NAMES.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  const customers = [];
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      customers.push(data[i][0].toString());
    }
  }
  
  return customers;
}

/**
 * Gets all customer data with name and type, including load statistics
 * @returns {Array} Array of customer objects with Customer_Name, Type, and statistics
 */
function getAllCustomersData() {
  const sheet = getSheet(SHEET_NAMES.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  const customers = [];
  
  // Get header row to find column indices dynamically
  const headers = data[0] || [];
  const customerNameIdx = 0; // Column A - Customer_Name
  const typeIdx = 1; // Column B - Type
  // Find Quote_Accept column dynamically (case-insensitive)
  let quoteAcceptIdx = -1;
  for (let h = 0; h < headers.length; h++) {
    if (headers[h] && headers[h].toString().trim().toLowerCase() === 'quote_accept') {
      quoteAcceptIdx = h;
      break;
    }
  }
  
  // Get all loads to calculate statistics
  const allLoads = getAllLoads();
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    if (data[i][customerNameIdx]) {
      const customerName = data[i][customerNameIdx].toString();
      
      // Calculate statistics for this customer
      const customerLoads = allLoads.filter(load => 
        load.Customer_Name && load.Customer_Name.trim() === customerName.trim()
      );
      
      // Count delivered loads (Delivered and Brokerage both count as delivered for customer totals)
      const deliveredLoads = customerLoads.filter(load => load.Status === STATUS.DELIVERED || load.Status === STATUS.BROKERAGE);
      const totalDelivered = deliveredLoads.length;
      
      // Calculate total rate for delivered loads
      const totalRateDelivered = deliveredLoads.reduce((sum, load) => {
        const rate = parseFloat(load.Rate) || 0;
        return sum + rate;
      }, 0);
      
      // Count canceled loads (Canceled + TONU)
      const canceledLoads = customerLoads.filter(load => 
        load.Status === STATUS.CANCELED || load.Status === STATUS.TONU
      );
      const totalCanceled = canceledLoads.length;
      
      // Read Quote_Accept column dynamically
      // Default to false if column doesn't exist or value is missing
      let quoteAccept = false;
      if (quoteAcceptIdx >= 0 && data[i][quoteAcceptIdx] !== undefined && data[i][quoteAcceptIdx] !== null && data[i][quoteAcceptIdx] !== '') {
        const quoteAcceptValue = data[i][quoteAcceptIdx];
        // Handle boolean, string 'true'/'false', or 'TRUE'/'FALSE'
        quoteAccept = quoteAcceptValue === true || 
                     quoteAcceptValue === 'true' || 
                     quoteAcceptValue === 'TRUE' ||
                     quoteAcceptValue === 1 ||
                     quoteAcceptValue === '1';
      }
      
      customers.push({
        Customer_Name: customerName,
        Type: data[i][typeIdx] ? data[i][typeIdx].toString() : '',
        Quote_Accept: quoteAccept,
        Total_Delivered: totalDelivered,
        Total_Rate_Delivered: totalRateDelivered,
        Total_Canceled: totalCanceled
      });
    }
  }
  
  return customers;
}

/**
 * Gets customer type by customer name
 * @param {string} customerName - Customer name
 * @returns {string} Customer type or empty string
 */
function getCustomerType(customerName) {
  const sheet = getSheet(SHEET_NAMES.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString() === customerName) {
      return data[i][1] ? data[i][1].toString() : '';
    }
  }
  
  return '';
}

/**
 * Creates a new customer record in the sheet
 * @param {string} customerName - Customer name
 * @param {string} customerType - Customer type (Direct Customer or Broker)
 * @param {boolean} quoteAccept - Whether customer accepts PU date change quotes (default: false)
 * @returns {boolean} True if successful
 */
function insertCustomerRecord(customerName, customerType, quoteAccept) {
  const sheet = getSheet(SHEET_NAMES.CUSTOMERS);
  
  // Check if customer already exists
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim().toLowerCase() === customerName.trim().toLowerCase()) {
      throw new Error('Customer with this name already exists');
    }
  }
  
  // Ensure Quote_Accept column exists
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let quoteAcceptIdx = headers.indexOf('Quote_Accept');
  
  // If column doesn't exist, add it
  if (quoteAcceptIdx === -1) {
    const lastCol = sheet.getLastColumn();
    sheet.getRange(1, lastCol + 1).setValue('Quote_Accept');
    quoteAcceptIdx = lastCol;
  }
  
  // Append new row: Customer_Name, Type, Quote_Accept
  const quoteAcceptValue = quoteAccept === true || quoteAccept === 'true' || quoteAccept === 'TRUE' || quoteAccept === 1;
  sheet.appendRow([customerName.trim(), customerType.trim(), quoteAcceptValue]);
  
  return true;
}

/**
 * Updates a customer record in the sheet
 * @param {string} originalName - Original customer name
 * @param {string} newName - New customer name
 * @param {string} newType - New customer type
 * @param {boolean} quoteAccept - Whether customer accepts PU date change quotes (optional, preserves existing if not provided)
 * @returns {boolean} True if successful
 */
function updateCustomerRecord(originalName, newName, newType, quoteAccept) {
  const sheet = getSheet(SHEET_NAMES.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  
  // Find the customer row
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === originalName.trim()) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Customer not found');
  }
  
  // Check if new name already exists (if name is being changed)
  if (newName.trim().toLowerCase() !== originalName.trim().toLowerCase()) {
    for (let i = 1; i < data.length; i++) {
      if (i + 1 !== rowIndex && data[i][0] && data[i][0].toString().trim().toLowerCase() === newName.trim().toLowerCase()) {
        throw new Error('Customer with this name already exists');
      }
    }
  }
  
  // Ensure Quote_Accept column exists
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let quoteAcceptIdx = headers.indexOf('Quote_Accept');
  
  // If column doesn't exist, add it
  if (quoteAcceptIdx === -1) {
    const lastCol = sheet.getLastColumn();
    sheet.getRange(1, lastCol + 1).setValue('Quote_Accept');
    quoteAcceptIdx = lastCol;
  }
  
  // Update the row (Column A = Customer_Name, Column B = Type, Column C = Quote_Accept)
  sheet.getRange(rowIndex, 1).setValue(newName.trim());
  sheet.getRange(rowIndex, 2).setValue(newType.trim());
  
  // Update Quote_Accept if provided, otherwise preserve existing value
  if (quoteAccept !== undefined && quoteAccept !== null) {
    const quoteAcceptValue = quoteAccept === true || quoteAccept === 'true' || quoteAccept === 'TRUE' || quoteAccept === 1;
    sheet.getRange(rowIndex, quoteAcceptIdx + 1).setValue(quoteAcceptValue);
  }
  
  return true;
}

/**
 * Deletes a customer record from the sheet
 * @param {string} customerName - Customer name to delete
 * @returns {boolean} True if successful
 */
function deleteCustomerRecord(customerName) {
  const sheet = getSheet(SHEET_NAMES.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  
  // Find the customer row
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === customerName.trim()) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Customer not found');
  }
  
  // Delete the row
  sheet.deleteRow(rowIndex);
  
  return true;
}

/**
 * Gets all users data from System_Users sheet
 * @returns {Array} Array of user objects with Email, Name, and Role
 */
function getAllUsersData() {
  const sheet = getSheet(SHEET_NAMES.SYSTEM_USERS);
  const data = sheet.getDataRange().getValues();
  const users = [];
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      users.push({
        Email: data[i][0].toString(),
        Name: data[i][1] ? data[i][1].toString() : '',
        Role: data[i][2] ? data[i][2].toString() : ''
      });
    }
  }
  
  return users;
}

/**
 * Finds the row index for a user by email
 * @param {string} email - User email
 * @returns {number} Row index (1-indexed) or -1 if not found
 */
function findUserRow(email) {
  const sheet = getSheet(SHEET_NAMES.SYSTEM_USERS);
  const data = sheet.getDataRange().getValues();
  
  // Email is in column A (index 0)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim().toLowerCase() === email.trim().toLowerCase()) {
      return i + 1; // +1 because sheet rows are 1-indexed
    }
  }
  
  return -1;
}

/**
 * Gets user name from System_Users sheet by email.
 * Looks up the row where Email column matches the given email (case-insensitive)
 * and returns the value from the Name column. Column positions are determined
 * from the first row (headers): "Email" and "Name" (case-insensitive). If headers
 * are not found, assumes Email = column A (index 0), Name = column B (index 1).
 * @param {string} email - User email
 * @returns {string} User name from System_Users Name column, or email prefix only if not found
 */
function getUserNameFromSystem(email) {
  if (!email) return 'User';
  const emailTrim = email.trim();
  if (!emailTrim) return 'User';

  try {
    const sheet = getSheet(SHEET_NAMES.SYSTEM_USERS);
    const data = sheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      return emailTrim.indexOf('@') !== -1 ? emailTrim.split('@')[0] : emailTrim;
    }

    const headerRow = data[0];
    let emailCol = -1;
    let nameCol = -1;
    for (let c = 0; c < headerRow.length; c++) {
      const h = (headerRow[c] && headerRow[c].toString().trim()) ? headerRow[c].toString().trim().toLowerCase() : '';
      if (h === 'email') emailCol = c;
      if (h === 'name') nameCol = c;
    }
    if (emailCol === -1) emailCol = 0;
    if (nameCol === -1) nameCol = 1;

    const emailLower = emailTrim.toLowerCase();
    for (let i = 1; i < data.length; i++) {
      const rowEmail = data[i][emailCol] ? data[i][emailCol].toString().trim() : '';
      if (rowEmail.toLowerCase() === emailLower) {
        const name = data[i][nameCol] ? data[i][nameCol].toString().trim() : '';
        if (name) return name;
        break;
      }
    }
  } catch (e) {
    Logger.log('Error getting user name from System_Users: ' + e.toString());
  }

  return emailTrim.indexOf('@') !== -1 ? emailTrim.split('@')[0] : emailTrim;
}

/**
 * Creates a new user record in the System_Users sheet
 * @param {string} email - User email (Column A)
 * @param {string} name - User name (Column B)
 * @param {string} role - User role (Column C)
 * @returns {boolean} True if successful
 */
function insertUserRecord(email, name, role) {
  const sheet = getSheet(SHEET_NAMES.SYSTEM_USERS);
  
  // Check if user already exists
  const existingRow = findUserRow(email);
  if (existingRow !== -1) {
    throw new Error('User with this email already exists');
  }
  
  // Append new row: Email (Column A), Name (Column B), Role (Column C)
  sheet.appendRow([email.trim(), name.trim(), role.trim()]);
  
  return true;
}

/**
 * Updates a user record in the System_Users sheet
 * @param {string} originalEmail - Original email to find the user
 * @param {string} email - New email (Column A)
 * @param {string} name - New name (Column B)
 * @param {string} role - New role (Column C)
 * @returns {boolean} True if successful
 */
function updateUserRecord(originalEmail, email, name, role) {
  const sheet = getSheet(SHEET_NAMES.SYSTEM_USERS);
  const rowIndex = findUserRow(originalEmail);
  
  if (rowIndex === -1) {
    throw new Error('User not found');
  }
  
  // Check if new email already exists (if email is being changed)
  if (email.trim().toLowerCase() !== originalEmail.trim().toLowerCase()) {
    const existingRow = findUserRow(email);
    if (existingRow !== -1) {
      throw new Error('User with this email already exists');
    }
  }
  
  // Update the row (Column A = Email, Column B = Name, Column C = Role)
  sheet.getRange(rowIndex, 1).setValue(email.trim());
  sheet.getRange(rowIndex, 2).setValue(name.trim());
  sheet.getRange(rowIndex, 3).setValue(role.trim());
  
  return true;
}

/**
 * Deletes a user record from the System_Users sheet
 * @param {string} email - User email to delete
 * @returns {boolean} True if successful
 */
function deleteUserRecord(email) {
  const sheet = getSheet(SHEET_NAMES.SYSTEM_USERS);
  const rowIndex = findUserRow(email);
  
  if (rowIndex === -1) {
    throw new Error('User not found');
  }
  
  // Delete the row
  sheet.deleteRow(rowIndex);
  
  return true;
}

/**
 * Ensures user exists in System_Users, creates with VIEWER role if not found
 * @param {string} email - User email
 * @param {string} name - User name (optional, will use email prefix if not provided)
 * @returns {Object} User object with Email, Name, and Role
 */
function ensureUserExists(email, name) {
  if (!email) {
    throw new Error('Email is required');
  }
  
  try {
    // Check if user already exists
    const existingRow = findUserRow(email);
    if (existingRow !== -1) {
      // User exists, return user data
      const sheet = getSheet(SHEET_NAMES.SYSTEM_USERS);
      const data = sheet.getDataRange().getValues();
      const rowIndex = existingRow - 1; // Convert to 0-indexed
      
      return {
        Email: data[rowIndex][0].toString(),
        Name: data[rowIndex][1] ? data[rowIndex][1].toString() : '',
        Role: data[rowIndex][2] ? data[rowIndex][2].toString() : ''
      };
    }
    
    // User doesn't exist, create with VIEWER role
    const userName = name && name.trim() ? name.trim() : email.split('@')[0];
    insertUserRecord(email.trim(), userName, 'VIEWER');
    
    return {
      Email: email.trim(),
      Name: userName,
      Role: 'VIEWER'
    };
  } catch (error) {
    Logger.log('Error in ensureUserExists: ' + error.toString());
    throw error;
  }
}

/**
 * Validates that a name exists in System_Users
 * @param {string} name - User name to validate
 * @param {string} role - Optional role to filter by
 * @returns {boolean} True if name exists (and matches role if provided)
 */
function validateUserName(name, role) {
  if (!name || !name.trim()) {
    return false;
  }
  
  try {
    const sheet = getSheet(SHEET_NAMES.SYSTEM_USERS);
    const data = sheet.getDataRange().getValues();
    
    // Name is in column B (index 1), Role is in column C (index 2)
    for (let i = 1; i < data.length; i++) {
      const userName = data[i][1] ? data[i][1].toString().trim() : '';
      if (userName && userName.toLowerCase() === name.trim().toLowerCase()) {
        // Name matches
        if (role) {
          // Check if role also matches
          const userRole = data[i][2] ? data[i][2].toString().trim() : '';
          return userRole.toLowerCase() === role.trim().toLowerCase();
        }
        return true;
      }
    }
    
    return false;
  } catch (error) {
    Logger.log('Error validating user name: ' + error.toString());
    return false;
  }
}

/**
 * Gets users by role from System_Users sheet
 * @param {string} role - Role to filter by
 * @returns {Array} Array of user objects with Email, Name, and Role
 */
function getUsersByRole(role) {
  if (!role) {
    return getAllUsersData();
  }
  
  const allUsers = getAllUsersData();
  return allUsers.filter(user => user.Role && user.Role.trim().toUpperCase() === role.trim().toUpperCase());
}

/**
 * Creates a new load record in the sheet (low-level data access)
 * @param {Object} loadData - Load data object
 * @returns {string} Generated load ID
 */
function insertLoadRecord(loadData) {
  const sheet = getSheet(SHEET_NAMES.LOADS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Prepare row data in correct column order
  const rowData = new Array(headers.length);
  
  Object.keys(loadData).forEach(key => {
    const colIndex = headers.indexOf(key);
    if (colIndex >= 0) {
      rowData[colIndex] = loadData[key];
    }
  });
  
  // Append row
  sheet.appendRow(rowData);
  
  // Clear cache
  _cache.loads = null;
  
  return loadData[LOAD_COLUMNS.ID];
}

/**
 * Updates a load record (low-level data access)
 * @param {string} loadId - Load ID
 * @param {Object} updates - Updates object (column name -> value)
 * @returns {boolean} True if successful
 */
function updateLoadRecord(loadId, updates) {
  const row = findLoadRow(loadId);
  if (row === -1) {
    return false;
  }
  
  const sheet = getSheet(SHEET_NAMES.LOADS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  Object.keys(updates).forEach(columnName => {
    const colIndex = headers.indexOf(columnName);
    if (colIndex >= 0) {
      sheet.getRange(row, colIndex + 1).setValue(updates[columnName]);
    }
  });
  
  // Clear cache
  _cache.loads = null;
  
  return true;
}

/**
 * Clears the cache
 */
function clearCache() {
  _cache.loads = null;
  _cache.lastFetch = null;
}
