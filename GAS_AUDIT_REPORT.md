FILE: Code.js
STATUS: Partially ported
GAPS: Super-admin forced role and modern role-scoped enforcement were missing and have been ported; legacy banned HTML UX was replaced by Vue banned route/view.

FILE: Config.js
STATUS: Partially ported
GAPS: Legacy constants were partially duplicated; modern schema fields (`full_load_access`, `reserved_count`) and role contract updates were added via migration/repository/API.

FILE: DataAccess.js
STATUS: Partially ported
GAPS: Legacy name-based assumptions were replaced with ID-based scoping and Greenbush reserved-count semantics in repository/routes.

FILE: ErrorHandler.js
STATUS: Partially ported
GAPS: V0.6 success/error envelope and standardized error codes were completed in API middleware/routes.

FILE: LoadService.js
STATUS: Partially ported
GAPS: Create/update audit semantics, duplicate-ref non-blocking warning, Greenbush reserve flow, and route role enforcement were ported to repository/routes.

FILE: Utils.js
STATUS: Partially ported
GAPS: Shared UI date formatter and APPT badge helper were added in web utilities/composables.

FILE: Validation.js
STATUS: Partially ported
GAPS: Route-level Zod validation and `VALIDATION_ERROR` envelope handling were standardized in API middleware/routes.

FILE: Index.html
STATUS: Safe to delete
GAPS: None

FILE: AccessDenied.html
STATUS: Safe to delete
GAPS: None

FILE: Banned.html
STATUS: Partially ported
GAPS: Dedicated Vue banned route/view was implemented and wired in router/auth store.

FILE: AccountManagerContent.html
STATUS: Needs porting
GAPS: Some deep legacy inline-edit parity behaviors remain simplified in Vue tabs.

FILE: CustomersContent.html
STATUS: Partially ported
GAPS: Core V0.6 filters/duplicate indicator added; modal/UI parity details remain simplified.

FILE: DispatchContent.html
STATUS: Needs porting
GAPS: Legacy dispatcher modal UX is simplified (prompt-driven) in current Vue implementation.

FILE: DispatcherUnifiedContent.html
STATUS: Needs porting
GAPS: Full dispatcher historical workflow parity remains partially implemented.

FILE: DispatchView.html
STATUS: Safe to delete
GAPS: None

FILE: ManagerView.html
STATUS: Safe to delete
GAPS: None

FILE: QuoteSidebar.html
STATUS: Safe to delete
GAPS: None

FILE: SalesContent.html
STATUS: Needs porting
GAPS: Full accept/deny modal parity remains partially simplified.

FILE: SalesView.html
STATUS: Safe to delete
GAPS: None

FILE: UnifiedContent.html
STATUS: Needs porting
GAPS: Some legacy combined-page parity behavior remains simplified in modular Vue tabs.

FILE: UnifiedView.html
STATUS: Safe to delete
GAPS: None

FILE: appsscript.json
STATUS: Safe to delete
GAPS: None

FILE: .clasp.json
STATUS: Safe to delete
GAPS: None
