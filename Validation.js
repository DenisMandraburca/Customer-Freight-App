/**
 * Validation Functions
 * Input validation and sanitization
 */

/**
 * Validates load form data
 * @param {Object} formData - Load form data
 * @returns {Object} Validation result with valid flag and errors array
 */
function validateLoadData(formData) {
  const errors = [];
  
  // Required fields - 1st Block
  if (!formData.customer || !formData.customer.trim()) {
    errors.push('Customer is required');
  }
  
  if (!formData.loadRef || !formData.loadRef.trim()) {
    errors.push('Load Reference is required');
  }
  
  if (!formData.mcleodOrderId || !formData.mcleodOrderId.trim()) {
    errors.push('McLeod # is required');
  }
  
  // 2nd Block: Pick Up Details validation
  // City and state are now parsed from combined field in frontend
  if (!formData.puCity || !formData.puCity.trim()) {
    errors.push('Pickup city is required');
  }
  
  if (!formData.puState || !formData.puState.trim()) {
    errors.push('Pickup state is required');
  } else if (formData.puState.trim().length !== 2) {
    errors.push('Pickup state must be 2 characters');
  }
  
  // puZip is optional (not mandatory)
  // puApptTime is optional (not mandatory)
  
  // Pickup Date is mandatory
  if (!formData.puDate) {
    errors.push('Pickup Date is required');
  }
  
  // 3rd Block: Delivery Details validation
  // City and state are now parsed from combined field in frontend
  if (!formData.delCity || !formData.delCity.trim()) {
    errors.push('Delivery city is required');
  }
  
  if (!formData.delState || !formData.delState.trim()) {
    errors.push('Delivery state is required');
  } else if (formData.delState.trim().length !== 2) {
    errors.push('Delivery state must be 2 characters');
  }
  
  // delZip is optional (not mandatory)
  // delApptTime is optional (not mandatory)
  
  // Delivery Date is mandatory
  if (!formData.delDate) {
    errors.push('Delivery Date is required');
  }
  
  // Date validation - delivery date must be after pickup date
  if (formData.puDate && formData.delDate) {
    const puDate = new Date(formData.puDate);
    const delDate = new Date(formData.delDate);
    
    if (delDate < puDate) {
      errors.push('Delivery date must be after pickup date');
    }
  }
  
  // 4th Block: Description validation
  // Rate validation
  const rate = parseFloat(formData.rate);
  if (isNaN(rate) || rate <= 0) {
    errors.push('Rate must be a positive number');
  }
  
  // Miles validation
  const miles = parseFloat(formData.miles);
  if (isNaN(miles) || miles <= 0) {
    errors.push('Miles must be a positive number');
  }
  
  // Notes is optional (not mandatory)
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates status transition
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - New status
 * @returns {Object} Validation result
 */
function validateStatusTransition(currentStatus, newStatus) {
  // Basic validation - can be expanded with workflow rules
  if (!newStatus || !newStatus.trim()) {
    return {
      valid: false,
      error: 'Status cannot be empty'
    };
  }
  
  // Add business rules here if needed
  // For now, allow any transition
  
  return {
    valid: true
  };
}

/**
 * Validates rate value
 * @param {number|string} rate - Rate value
 * @returns {boolean} True if valid
 */
function validateRate(rate) {
  const numRate = parseFloat(rate);
  return !isNaN(numRate) && numRate > 0;
}

/**
 * Validates miles value
 * @param {number|string} miles - Miles value
 * @returns {boolean} True if valid
 */
function validateMiles(miles) {
  const numMiles = parseFloat(miles);
  return !isNaN(numMiles) && numMiles > 0;
}

/**
 * Validates date string
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if valid
 */
function validateDate(dateString) {
  if (!dateString) return false;
  
  const date = parseDateString(dateString);
  return date !== null;
}

/**
 * Sanitizes a string input
 * @param {*} input - Input to sanitize
 * @param {number} maxLength - Maximum length (default 1000)
 * @returns {string} Sanitized string
 */
function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .substring(0, maxLength);
}

/**
 * Validates load updates
 * @param {Object} load - Current load object
 * @param {Object} updates - Updates to apply
 * @returns {Object} Validation result
 */
function validateLoadUpdates(load, updates) {
  const errors = [];
  
  // Validate status transition if status is being updated
  if (updates.Status && load.Status) {
    const statusValidation = validateStatusTransition(load.Status, updates.Status);
    if (!statusValidation.valid) {
      errors.push(statusValidation.error);
    }
  }
  
  // Validate rate if being updated
  if (updates.Rate !== undefined && !validateRate(updates.Rate)) {
    errors.push('Rate must be a positive number');
  }
  
  // Validate miles if being updated
  if (updates.Miles !== undefined && !validateMiles(updates.Miles)) {
    errors.push('Miles must be a positive number');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}
