/**
 * Configuration and Constants
 * Centralized constants for the Customer Freight App
 */

/**
 * Gets the database ID from Script Properties
 * @returns {string} Database spreadsheet ID
 */
function getDBId() {
  const dbId = PropertiesService.getScriptProperties().getProperty('DB_ID');
  if (!dbId || dbId.trim() === '') {
    throw new Error('DB_ID not configured in Script Properties');
  }
  return dbId;
}

/**
 * Sheet name constants
 */
const SHEET_NAMES = {
  LOADS: 'Loads',
  CUSTOMERS: 'Customers',
  SYSTEM_USERS: 'System_Users',
  GREENBUSH_LOADS: 'Greenbush_Loads'
};

/**
 * Status constants
 */
const STATUS = {
  AVAILABLE: 'Available',
  PENDING_APPROVAL: 'Pending Approval',
  QUOTE_SUBMITTED: 'Quote Submitted',
  COVERED: 'Covered',
  LOADED: 'Loaded',
  DELAYED: 'Delayed',
  DELIVERED: 'Delivered',
  BROKERAGE: 'Brokerage',
  CANCELED: 'Canceled',
  TONU: 'TONU'
};

/**
 * Load column name constants
 */
const LOAD_COLUMNS = {
  ID: 'ID',
  CREATED_TIMESTAMP: 'Created_Timestamp',
  STATUS: 'Status',
  SA_NAME: 'SA_Name',
  CUSTOMER_NAME: 'Customer_Name',
  CUSTOMER_TYPE: 'Customer_Type',
  LOAD_REF_NUMBER: 'Load_Ref_Number',
  PU_CITY: 'PU_City',
  PU_STATE: 'PU_State',
  PU_ZIP: 'PU_Zip',
  PU_DATE: 'PU_Date',
  PU_APPT_TIME: 'PU_Appt_Time',
  PU_APPT: 'PU_APPT',
  DEL_CITY: 'Del_City',
  DEL_STATE: 'Del_State',
  DEL_ZIP: 'Del_Zip',
  DEL_DATE: 'Del_Date',
  DEL_APPT_TIME: 'Del_Appt_Time',
  DEL_APPT: 'Del_APPT',
  RATE: 'Rate',
  MILES: 'Miles',
  RPM: 'RPM',
  NOTES: 'Notes',
  ASSIGNED_DISPATCHER: 'Assigned_Dispatcher',
  DRIVER_NAME: 'Driver_Name',
  TRUCK_NUMBER: 'Truck_Number',
  MCLEOD_ORDER_ID: 'McLeod_Order_ID',
  REASON_LOG: 'Reason_Log',
  EQUIPMENT: 'Equipment',
  DELAY_REASON: 'Delay_Reson',
  CANCEL_REASON: 'Cancel_Reason',
  DENY_QUOTE_REASON: 'Deny_Quote_Reason',
  OTHER_NOTES: 'Other_Notes'
};

/**
 * Greenbush load column name constants (flexible loads, no PU/Del dates)
 */
const GREENBUSH_COLUMNS = {
  ID: 'ID',
  PICKUP_LOCATION: 'Pickup_Location',
  DESTINATION: 'Destination',
  RECEIVING_HOURS: 'Receiving_Hours',
  PRICE: 'Price',
  TARP: 'Tarp',
  AMOUNT: 'Amount',
  SPECIAL_NOTES: 'Special_Notes',
  CREATED_TIMESTAMP: 'Created_Timestamp'
};

/**
 * Completed statuses array
 */
const COMPLETED_STATUSES = [
  STATUS.DELIVERED,
  STATUS.BROKERAGE,
  STATUS.CANCELED,
  STATUS.TONU
];

/**
 * Excluded statuses from "My Loads" view
 */
const EXCLUDED_STATUSES = [
  STATUS.AVAILABLE,
  STATUS.DELIVERED,
  STATUS.BROKERAGE,
  STATUS.CANCELED,
  STATUS.TONU
];

/**
 * Gets company domains from Script Properties
 * @returns {Array} Array of allowed email domains
 */
function getCompanyDomains() {
  const props = PropertiesService.getScriptProperties();
  const domains = [];
  
  const domain1 = props.getProperty('COMPANY_DOMAIN_1');
  const domain2 = props.getProperty('COMPANY_DOMAIN_2');
  
  if (domain1 && domain1.trim()) {
    domains.push(domain1.trim().toLowerCase());
  }
  
  if (domain2 && domain2.trim()) {
    domains.push(domain2.trim().toLowerCase());
  }
  
  return domains;
}
