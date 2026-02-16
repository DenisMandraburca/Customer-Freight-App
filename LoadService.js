/**
 * Load Service
 * Business logic for load management
 */

/**
 * Gets initial data for the unified view
 * @returns {Object} Object containing customers array and loads array
 */
function getInitialData() {
  try {
    // Use getAllCustomersData() to get full customer objects with Quote_Accept property
    const customers = getAllCustomersData();
    const allLoads = getAllLoads(true); // Force refresh for initial load
    
    return createSuccessResponse({
      customers: customers,
      loads: allLoads
    });
  } catch (error) {
    return handleError(error, 'getInitialData');
  }
}

/**
 * Creates a new load
 * @param {Object} formData - Form data object
 * @param {string} [initialStatus] - Optional initial status (e.g. 'Brokerage'). If omitted, status is Available or Covered based on dispatcher.
 * @returns {Object} Result object with success status
 */
function createLoad(formData, initialStatus) {
  try {
    // Validate input
    const validation = validateLoadData(formData);
    if (!validation.valid) {
      return createErrorResponse('Validation failed: ' + validation.errors.join(', '));
    }
    
    // Get current user email
    const userEmail = Session.getActiveUser().getEmail();
    
    // Ensure user exists in System_Users (auto-register with VIEWER role if first time)
    ensureUserExists(userEmail);
    
    const userName = getUserNameFromSystem(userEmail);
    
    // Get customer type
    const customerType = getCustomerType(formData.customer);
    
    // Generate load ID
    const loadId = generateLoadId();
    
    // Calculate RPM (use provided RPM if available, otherwise calculate)
    const rate = parseFloat(formData.rate);
    const miles = parseFloat(formData.miles);
    const rpm = formData.rpm ? parseFloat(formData.rpm) : calculateRPM(rate, miles);
    
    // Parse dates if provided (optional fields)
    const puDate = formData.puDate ? parseDateString(formData.puDate) : null;
    const delDate = formData.delDate ? parseDateString(formData.delDate) : null;
    
    // Prepare load data
    const loadData = {};
    loadData[LOAD_COLUMNS.ID] = loadId;
    loadData[LOAD_COLUMNS.CREATED_TIMESTAMP] = new Date();
    // Set status: Brokerage if requested, otherwise Covered/Available based on dispatcher
    if (initialStatus === STATUS.BROKERAGE || initialStatus === 'Brokerage') {
      loadData[LOAD_COLUMNS.STATUS] = STATUS.BROKERAGE;
    } else {
      const hasDispatcher = formData.assignedDispatcher && formData.assignedDispatcher.trim();
      loadData[LOAD_COLUMNS.STATUS] = hasDispatcher ? STATUS.COVERED : STATUS.AVAILABLE;
    }
    
    // Validate SA_Name if provided, otherwise use current user's name
    if (formData.saName && formData.saName.trim()) {
      if (!validateUserName(formData.saName.trim(), 'ACCOUNT MANAGER')) {
        return createErrorResponse('Invalid Account Manager name. Name must exist in System_Users with ACCOUNT MANAGER role.');
      }
      loadData[LOAD_COLUMNS.SA_NAME] = sanitizeString(formData.saName.trim());
    } else {
      loadData[LOAD_COLUMNS.SA_NAME] = sanitizeString(userName);
    }
    loadData[LOAD_COLUMNS.CUSTOMER_NAME] = sanitizeString(formData.customer);
    loadData[LOAD_COLUMNS.CUSTOMER_TYPE] = sanitizeString(customerType);
    loadData[LOAD_COLUMNS.LOAD_REF_NUMBER] = sanitizeString(formData.loadRef || '');
    loadData[LOAD_COLUMNS.MCLEOD_ORDER_ID] = sanitizeString(formData.mcleodOrderId || '');
    loadData[LOAD_COLUMNS.PU_CITY] = sanitizeString(formData.puCity);
    loadData[LOAD_COLUMNS.PU_STATE] = sanitizeString(formData.puState);
    loadData[LOAD_COLUMNS.PU_ZIP] = sanitizeString(formData.puZip || '');
    loadData[LOAD_COLUMNS.PU_DATE] = puDate || '';
    loadData[LOAD_COLUMNS.PU_APPT_TIME] = sanitizeString(formData.puApptTime || '');
    loadData[LOAD_COLUMNS.PU_APPT] = formData.puApptCheckbox === true || formData.puApptCheckbox === 'true';
    loadData[LOAD_COLUMNS.DEL_CITY] = sanitizeString(formData.delCity);
    loadData[LOAD_COLUMNS.DEL_STATE] = sanitizeString(formData.delState);
    loadData[LOAD_COLUMNS.DEL_ZIP] = sanitizeString(formData.delZip || '');
    loadData[LOAD_COLUMNS.DEL_DATE] = delDate || '';
    loadData[LOAD_COLUMNS.DEL_APPT_TIME] = sanitizeString(formData.delApptTime || '');
    loadData[LOAD_COLUMNS.DEL_APPT] = formData.delApptCheckbox === true || formData.delApptCheckbox === 'true';
    loadData[LOAD_COLUMNS.RATE] = rate;
    loadData[LOAD_COLUMNS.MILES] = miles;
    loadData[LOAD_COLUMNS.RPM] = parseFloat(rpm);
    loadData[LOAD_COLUMNS.NOTES] = sanitizeString(formData.notes || '');
    // Use provided dispatcher/driver/truck if available, otherwise empty strings
    // Validate dispatcher name if provided
    if (formData.assignedDispatcher && formData.assignedDispatcher.trim()) {
      if (!validateUserName(formData.assignedDispatcher.trim(), 'DISPATCHER')) {
        return createErrorResponse('Invalid Dispatcher name. Name must exist in System_Users with DISPATCHER role.');
      }
      loadData[LOAD_COLUMNS.ASSIGNED_DISPATCHER] = sanitizeString(formData.assignedDispatcher.trim());
    } else {
      loadData[LOAD_COLUMNS.ASSIGNED_DISPATCHER] = '';
    }
    loadData[LOAD_COLUMNS.DRIVER_NAME] = formData.driverName ? sanitizeString(formData.driverName) : '';
    loadData[LOAD_COLUMNS.TRUCK_NUMBER] = formData.truckNumber ? sanitizeString(formData.truckNumber) : '';
    loadData[LOAD_COLUMNS.REASON_LOG] = '';
    
    // Create load
    const createdId = insertLoadRecord(loadData);
    
    return createSuccessResponse({
      loadId: createdId,
      message: 'Load created successfully'
    });
  } catch (error) {
    return handleError(error, 'createLoad');
  }
}

/**
 * Updates load status
 * @param {string} loadId - Load ID
 * @param {string} newStatus - New status
 * @param {string|null} reason - Reason for status change
 * @returns {Object} Result object
 */
function updateLoadStatus(loadId, newStatus, reason) {
  try {
    // Get current load
    const load = getLoadById(loadId);
    if (!load) {
      return createErrorResponse('Load not found');
    }
    
    // Validate status transition
    const validation = validateStatusTransition(load.Status, newStatus);
    if (!validation.valid) {
      return createErrorResponse(validation.error);
    }
    
    // Prepare updates
    const updates = {
      [LOAD_COLUMNS.STATUS]: newStatus
    };
    
    // Save reason to appropriate column based on status
    if (reason) {
      if (newStatus === STATUS.DELAYED) {
        updates[LOAD_COLUMNS.DELAY_REASON] = sanitizeString(reason);
      } else if (newStatus === STATUS.CANCELED) {
        updates[LOAD_COLUMNS.CANCEL_REASON] = sanitizeString(reason);
      }
      
      // Also append to reason log for historical tracking
      const currentReason = load.Reason_Log || '';
      updates[LOAD_COLUMNS.REASON_LOG] = appendReasonLog(currentReason, newStatus, reason);
    }
    
    // Update load
    const success = updateLoadRecord(loadId, updates);
    if (!success) {
      return createErrorResponse('Failed to update load');
    }
    
    return createSuccessResponse({
      message: 'Status updated successfully'
    });
  } catch (error) {
    return handleError(error, 'updateLoadStatus');
  }
}

/**
 * Submits a booking request for a load
 * @param {string} loadId - Load ID
 * @param {string} truck - Truck number
 * @param {string} driver - Driver name
 * @returns {Object} Result object
 */
function submitBookingRequest(loadId, truck, driver) {
  try {
    // Validate input
    if (!truck || !truck.trim()) {
      return createErrorResponse('Truck number is required');
    }
    if (!driver || !driver.trim()) {
      return createErrorResponse('Driver name is required');
    }
    
    // Get load
    const load = getLoadById(loadId);
    if (!load) {
      return createErrorResponse('Load not found');
    }
    
    // Atomic check-and-set for race condition prevention
    const sheet = getSheet(SHEET_NAMES.LOADS);
    const row = findLoadRow(loadId);
    if (row === -1) {
      return createErrorResponse('Load not found');
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusIdx = headers.indexOf(LOAD_COLUMNS.STATUS);
    
    // Read current status immediately before writing
    const currentStatus = sheet.getRange(row, statusIdx + 1).getValue();
    if (currentStatus !== STATUS.AVAILABLE) {
      return createErrorResponse(
        'Load is no longer available. Current status: ' + currentStatus
      );
    }
    
    // Immediately update status to prevent race condition
    sheet.getRange(row, statusIdx + 1).setValue(STATUS.PENDING_APPROVAL);
    
    // Get user email
    const userEmail = Session.getActiveUser().getEmail();
    
    // Ensure user exists in System_Users (auto-register with VIEWER role if first time)
    ensureUserExists(userEmail);
    
    // Get user name from System_Users (not email)
    const userName = getUserNameFromSystem(userEmail);
    
    // Update other fields
    const dispatcherIdx = headers.indexOf(LOAD_COLUMNS.ASSIGNED_DISPATCHER);
    const driverIdx = headers.indexOf(LOAD_COLUMNS.DRIVER_NAME);
    const truckIdx = headers.indexOf(LOAD_COLUMNS.TRUCK_NUMBER);
    
    if (dispatcherIdx >= 0) {
      sheet.getRange(row, dispatcherIdx + 1).setValue(userName);
    }
    if (driverIdx >= 0) {
      sheet.getRange(row, driverIdx + 1).setValue(sanitizeString(driver));
    }
    if (truckIdx >= 0) {
      sheet.getRange(row, truckIdx + 1).setValue(sanitizeString(truck));
    }
    
    // Clear cache
    clearCache();
    
    return createSuccessResponse({
      message: 'Booking request submitted successfully'
    });
  } catch (error) {
    return handleError(error, 'submitBookingRequest');
  }
}

/**
 * Submits a quote for a load
 * @param {string} loadId - Load ID
 * @param {string|null} newDate - New pickup date (YYYY-MM-DD format)
 * @returns {Object} Result object
 */
function submitQuote(loadId, newDate) {
  try {
    // Get load
    const load = getLoadById(loadId);
    if (!load) {
      return createErrorResponse('Load not found');
    }
    
    // Atomic check-and-set for race condition prevention
    const sheet = getSheet(SHEET_NAMES.LOADS);
    const row = findLoadRow(loadId);
    if (row === -1) {
      return createErrorResponse('Load not found');
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusIdx = headers.indexOf(LOAD_COLUMNS.STATUS);
    
    // Read current status immediately before writing
    const currentStatus = sheet.getRange(row, statusIdx + 1).getValue();
    if (currentStatus !== STATUS.AVAILABLE) {
      return createErrorResponse(
        'Load is no longer available. Current status: ' + currentStatus
      );
    }
    
    // Immediately update status
    sheet.getRange(row, statusIdx + 1).setValue(STATUS.QUOTE_SUBMITTED);
    
    // Get user email
    const userEmail = Session.getActiveUser().getEmail();
    
    // Ensure user exists in System_Users (auto-register with VIEWER role if first time)
    ensureUserExists(userEmail);
    
    // Get user name from System_Users (not email)
    const userName = getUserNameFromSystem(userEmail);
    
    // Update dispatcher
    const dispatcherIdx = headers.indexOf(LOAD_COLUMNS.ASSIGNED_DISPATCHER);
    if (dispatcherIdx >= 0) {
      sheet.getRange(row, dispatcherIdx + 1).setValue(userName);
    }
    
    // Update date if provided
    if (newDate) {
      const puDateIdx = headers.indexOf(LOAD_COLUMNS.PU_DATE);
      if (puDateIdx >= 0) {
        const dateObj = parseDateString(newDate);
        if (dateObj) {
          sheet.getRange(row, puDateIdx + 1).setValue(dateObj);
          
          // Log quote submission
          const reasonLogIdx = headers.indexOf(LOAD_COLUMNS.REASON_LOG);
          if (reasonLogIdx >= 0) {
            const currentReason = sheet.getRange(row, reasonLogIdx + 1).getValue();
            const scriptTimeZone = Session.getScriptTimeZone();
            const formattedDate = Utilities.formatDate(dateObj, scriptTimeZone, 'MM/dd/yyyy');
            const quoteNote = 'Requested Pickup Date Change to ' + formattedDate;
            const newReason = appendReasonLog(currentReason || '', 'Quote', quoteNote);
            sheet.getRange(row, reasonLogIdx + 1).setValue(newReason);
          }
        }
      }
    }
    
    // Clear cache
    clearCache();
    
    return createSuccessResponse({
      message: 'Quote submitted successfully'
    });
  } catch (error) {
    return handleError(error, 'submitQuote');
  }
}

/**
 * Handles sales decision on dispatcher requests or quotes
 * @param {string} loadId - Load ID
 * @param {string} decision - 'accept' or 'deny'
 * @param {string} notes - Notes or reason for the decision
 * @param {string} requestedPickupDate - Optional: Requested pickup date (YYYY-MM-DD) for quote acceptance
 * @param {string} newDeliveryDate - Optional: New delivery date (YYYY-MM-DD) for quote acceptance
 * @param {string} loadRef - Optional: Load ref number (editable in Review Quote, saved on accept)
 * @param {string} mcleodOrderId - Optional: McLeod order ID (editable in Review Quote, saved on accept)
 * @returns {Object} Result object
 */
function handleSalesDecision(loadId, decision, notes, requestedPickupDate, newDeliveryDate, loadRef, mcleodOrderId) {
  try {
    // Get load
    const load = getLoadById(loadId);
    if (!load) {
      return createErrorResponse('Load not found');
    }
    
    const sheet = getSheet(SHEET_NAMES.LOADS);
    const row = findLoadRow(loadId);
    if (row === -1) {
      return createErrorResponse('Load not found');
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusIdx = headers.indexOf(LOAD_COLUMNS.STATUS);
    const reasonLogIdx = headers.indexOf(LOAD_COLUMNS.REASON_LOG);
    const otherNotesIdx = headers.indexOf(LOAD_COLUMNS.OTHER_NOTES);
    const denyQuoteReasonIdx = headers.indexOf(LOAD_COLUMNS.DENY_QUOTE_REASON);
    
    if (decision === 'accept') {
      // Update status to Covered
      sheet.getRange(row, statusIdx + 1).setValue(STATUS.COVERED);
      
      // Save optional Ref# and McLeod# from Review Quote
      if (loadRef !== undefined && loadRef !== null) {
        const loadRefIdx = headers.indexOf(LOAD_COLUMNS.LOAD_REF_NUMBER);
        if (loadRefIdx >= 0) {
          sheet.getRange(row, loadRefIdx + 1).setValue(sanitizeString(String(loadRef)));
        }
      }
      if (mcleodOrderId !== undefined && mcleodOrderId !== null) {
        const mcleodIdx = headers.indexOf(LOAD_COLUMNS.MCLEOD_ORDER_ID);
        if (mcleodIdx >= 0) {
          sheet.getRange(row, mcleodIdx + 1).setValue(sanitizeString(String(mcleodOrderId)));
        }
      }
      
      // Save notes to Other_Notes if provided
      if (notes && otherNotesIdx >= 0) {
        sheet.getRange(row, otherNotesIdx + 1).setValue(sanitizeString(notes));
      }
      
      // Handle quote acceptance with date updates
      if (requestedPickupDate && newDeliveryDate) {
        // Update pickup date
        const puDateIdx = headers.indexOf(LOAD_COLUMNS.PU_DATE);
        if (puDateIdx >= 0) {
          const puDateObj = parseDateString(requestedPickupDate);
          if (puDateObj) {
            sheet.getRange(row, puDateIdx + 1).setValue(puDateObj);
          }
        }
        
        // Update delivery date
        const delDateIdx = headers.indexOf(LOAD_COLUMNS.DEL_DATE);
        if (delDateIdx >= 0) {
          const delDateObj = parseDateString(newDeliveryDate);
          if (delDateObj) {
            sheet.getRange(row, delDateIdx + 1).setValue(delDateObj);
          }
        }
        
        // Update Reason_Log to "Quoted dated accepted"
        if (reasonLogIdx >= 0) {
          const currentReason = sheet.getRange(row, reasonLogIdx + 1).getValue();
          // Remove the previous "Quote:" entry and add new acceptance entry
          let cleanedReason = currentReason || '';
          if (cleanedReason) {
            const lines = cleanedReason.split('\n');
            const filteredLines = lines.filter(line => !line.includes('Quote:'));
            cleanedReason = filteredLines.join('\n').trim();
          }
          const newReason = appendReasonLog(cleanedReason, 'Accepted', 'Quoted dated accepted' + (notes ? ' - ' + notes : ''));
          sheet.getRange(row, reasonLogIdx + 1).setValue(newReason);
        }
      } else {
        // Regular acceptance (not a quote with dates)
        // Log acceptance
        if (notes && reasonLogIdx >= 0) {
          const currentReason = sheet.getRange(row, reasonLogIdx + 1).getValue();
          const newReason = appendReasonLog(currentReason || '', 'Accepted', notes);
          sheet.getRange(row, reasonLogIdx + 1).setValue(newReason);
        }
      }
    } else if (decision === 'deny') {
      // Update status back to Available
      sheet.getRange(row, statusIdx + 1).setValue(STATUS.AVAILABLE);
      
      // Check if this is a quote denial (status was QUOTE_SUBMITTED)
      const isQuoteDenial = load.Status === STATUS.QUOTE_SUBMITTED;
      
      // Save notes to Deny_Quote_Reason if it's a quote denial
      if (notes && isQuoteDenial && denyQuoteReasonIdx >= 0) {
        sheet.getRange(row, denyQuoteReasonIdx + 1).setValue(sanitizeString(notes));
      }
      
      // Clear dispatcher assignment fields
      const dispatcherIdx = headers.indexOf(LOAD_COLUMNS.ASSIGNED_DISPATCHER);
      const driverIdx = headers.indexOf(LOAD_COLUMNS.DRIVER_NAME);
      const truckIdx = headers.indexOf(LOAD_COLUMNS.TRUCK_NUMBER);
      
      if (dispatcherIdx >= 0) {
        sheet.getRange(row, dispatcherIdx + 1).setValue('');
      }
      if (driverIdx >= 0) {
        sheet.getRange(row, driverIdx + 1).setValue('');
      }
      if (truckIdx >= 0) {
        sheet.getRange(row, truckIdx + 1).setValue('');
      }
      
      // Log denial
      if (notes && reasonLogIdx >= 0) {
        const currentReason = sheet.getRange(row, reasonLogIdx + 1).getValue();
        const newReason = appendReasonLog(currentReason || '', 'Denied by SA', notes);
        sheet.getRange(row, reasonLogIdx + 1).setValue(newReason);
      }
    } else {
      return createErrorResponse('Invalid decision. Must be "accept" or "deny"');
    }
    
    // Clear cache
    clearCache();
    
    return createSuccessResponse({
      message: 'Decision processed successfully'
    });
  } catch (error) {
    return handleError(error, 'handleSalesDecision');
  }
}

/**
 * Checks if a status indicates completion
 * @param {string} status - Status to check
 * @returns {boolean} True if status is completed
 */
function isCompletedStatus(status) {
  return COMPLETED_STATUSES.includes(status);
}

/**
 * Updates a load with new data
 * @param {string} loadId - Load ID
 * @param {Object} updates - Updates object with field names and values
 * @returns {Object} Result object
 */
function updateLoad(loadId, updates) {
  try {
    // Get current load
    const load = getLoadById(loadId);
    if (!load) {
      return createErrorResponse('Load not found');
    }
    
    // Prepare updates object with proper column names
    const loadData = {};
    
    // Map frontend field names to column names
    if (updates.SA_Name !== undefined) {
      const saName = updates.SA_Name ? sanitizeString(updates.SA_Name).trim() : '';
      if (saName && !validateUserName(saName, 'ACCOUNT MANAGER')) {
        return createErrorResponse('Invalid Account Manager name. Name must exist in System_Users with ACCOUNT MANAGER role.');
      }
      loadData[LOAD_COLUMNS.SA_NAME] = saName;
    }
    if (updates.Customer_Name !== undefined) {
      loadData[LOAD_COLUMNS.CUSTOMER_NAME] = sanitizeString(updates.Customer_Name);
    }
    if (updates.Customer_Type !== undefined) {
      loadData[LOAD_COLUMNS.CUSTOMER_TYPE] = sanitizeString(updates.Customer_Type);
    }
    if (updates.Load_Ref_Number !== undefined) {
      loadData[LOAD_COLUMNS.LOAD_REF_NUMBER] = sanitizeString(updates.Load_Ref_Number);
    }
    if (updates.McLeod_Order_ID !== undefined) {
      loadData[LOAD_COLUMNS.MCLEOD_ORDER_ID] = sanitizeString(updates.McLeod_Order_ID);
    }
    if (updates.Status !== undefined) {
      loadData[LOAD_COLUMNS.STATUS] = sanitizeString(updates.Status);
    }
    if (updates.PU_City !== undefined) {
      loadData[LOAD_COLUMNS.PU_CITY] = sanitizeString(updates.PU_City);
    }
    if (updates.PU_State !== undefined) {
      loadData[LOAD_COLUMNS.PU_STATE] = sanitizeString(updates.PU_State);
    }
    if (updates.PU_Zip !== undefined) {
      loadData[LOAD_COLUMNS.PU_ZIP] = sanitizeString(updates.PU_Zip);
    }
    if (updates.PU_Date !== undefined) {
      const puDate = updates.PU_Date ? parseDateString(updates.PU_Date) : null;
      loadData[LOAD_COLUMNS.PU_DATE] = puDate || '';
    }
    if (updates.PU_Appt_Time !== undefined) {
      // If null, clear the field (APP checkbox not checked) - set to empty to clear
      // If empty string, APP checkbox is checked but no time entered (will show warning in UI)
      // If has value, APP checkbox is checked with time
      // Note: We use empty string for both "not checked" and "checked but no time" 
      // The distinction is made in the UI based on whether the field was explicitly set
      // For now, if null, we'll clear it by setting to empty string
      // The UI will check if field exists and is empty to show warning
      loadData[LOAD_COLUMNS.PU_APPT_TIME] = updates.PU_Appt_Time === null ? '' : sanitizeString(updates.PU_Appt_Time);
    }
    if (updates.PU_APPT !== undefined) {
      loadData[LOAD_COLUMNS.PU_APPT] = updates.PU_APPT === true || updates.PU_APPT === 'true' || updates.PU_APPT === 'TRUE';
    }
    if (updates.Del_City !== undefined) {
      loadData[LOAD_COLUMNS.DEL_CITY] = sanitizeString(updates.Del_City);
    }
    if (updates.Del_State !== undefined) {
      loadData[LOAD_COLUMNS.DEL_STATE] = sanitizeString(updates.Del_State);
    }
    if (updates.Del_Zip !== undefined) {
      loadData[LOAD_COLUMNS.DEL_ZIP] = sanitizeString(updates.Del_Zip);
    }
    if (updates.Del_Date !== undefined) {
      const delDate = updates.Del_Date ? parseDateString(updates.Del_Date) : null;
      loadData[LOAD_COLUMNS.DEL_DATE] = delDate || '';
    }
    if (updates.Del_Appt_Time !== undefined) {
      // If null, clear the field (APP checkbox not checked) - set to empty to clear
      // If empty string, APP checkbox is checked but no time entered (will show warning in UI)
      // If has value, APP checkbox is checked with time
      // Note: We use empty string for both "not checked" and "checked but no time"
      // The distinction is made in the UI based on whether the field was explicitly set
      // For now, if null, we'll clear it by setting to empty string
      // The UI will check if field exists and is empty to show warning
      loadData[LOAD_COLUMNS.DEL_APPT_TIME] = updates.Del_Appt_Time === null ? '' : sanitizeString(updates.Del_Appt_Time);
    }
    if (updates.Del_APPT !== undefined) {
      loadData[LOAD_COLUMNS.DEL_APPT] = updates.Del_APPT === true || updates.Del_APPT === 'true' || updates.Del_APPT === 'TRUE';
    }
    if (updates.Rate !== undefined) {
      loadData[LOAD_COLUMNS.RATE] = parseFloat(updates.Rate);
    }
    if (updates.RPM !== undefined) {
      loadData[LOAD_COLUMNS.RPM] = parseFloat(updates.RPM);
    }
    if (updates.Miles !== undefined) {
      loadData[LOAD_COLUMNS.MILES] = parseFloat(updates.Miles);
    }
    if (updates.Assigned_Dispatcher !== undefined) {
      const dispatcherName = updates.Assigned_Dispatcher ? sanitizeString(updates.Assigned_Dispatcher).trim() : '';
      if (dispatcherName && !validateUserName(dispatcherName, 'DISPATCHER')) {
        return createErrorResponse('Invalid Dispatcher name. Name must exist in System_Users with DISPATCHER role.');
      }
      loadData[LOAD_COLUMNS.ASSIGNED_DISPATCHER] = dispatcherName;
      
      // Auto-cover if dispatcher is assigned and load is currently Available
      if (dispatcherName && load.Status === STATUS.AVAILABLE) {
        loadData[LOAD_COLUMNS.STATUS] = STATUS.COVERED;
      }
    }
    if (updates.Driver_Name !== undefined) {
      loadData[LOAD_COLUMNS.DRIVER_NAME] = sanitizeString(updates.Driver_Name);
    }
    if (updates.Truck_Number !== undefined) {
      loadData[LOAD_COLUMNS.TRUCK_NUMBER] = sanitizeString(updates.Truck_Number);
    }
    if (updates.Notes !== undefined) {
      loadData[LOAD_COLUMNS.NOTES] = sanitizeString(updates.Notes);
    }
    if (updates.Delay_Reason !== undefined) {
      loadData[LOAD_COLUMNS.DELAY_REASON] = sanitizeString(updates.Delay_Reason);
    }
    if (updates.Cancel_Reason !== undefined) {
      loadData[LOAD_COLUMNS.CANCEL_REASON] = sanitizeString(updates.Cancel_Reason);
    }
    if (updates.Deny_Quote_Reason !== undefined) {
      loadData[LOAD_COLUMNS.DENY_QUOTE_REASON] = sanitizeString(updates.Deny_Quote_Reason);
    }
    if (updates.Other_Notes !== undefined) {
      loadData[LOAD_COLUMNS.OTHER_NOTES] = sanitizeString(updates.Other_Notes);
    }
    
    // Update load record
    const success = updateLoadRecord(loadId, loadData);
    if (!success) {
      return createErrorResponse('Failed to update load');
    }
    
    return createSuccessResponse({
      message: 'Load updated successfully'
    });
  } catch (error) {
    return handleError(error, 'updateLoad');
  }
}
