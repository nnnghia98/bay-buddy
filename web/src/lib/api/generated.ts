export interface paths {
    "/api/v1/ai/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Check AI service health
         * @description Verify that the AI service is properly configured.
         */
        get: operations["ai_health_check_api_v1_ai_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/ai/parse": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Parse flight confirmation file
         * @description Extract structured flight data from an uploaded image or PDF using the configured Gemini model. Accepts multipart/form-data with a single 'file' field. Returns JSON matching the Ticket model schema suitable for database storage.
         */
        post: operations["parse_flight_api_v1_ai_parse_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Login
         * @description Authenticate a user from OAuth2 form fields and return a JWT access token.
         */
        post: operations["login_api_v1_auth_login_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Current User Profile
         * @description Return the authenticated user's public profile.
         */
        get: operations["get_current_user_profile_api_v1_auth_me_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customers/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Customers
         * @description List all customers for the directory page.
         */
        get: operations["list_customers_api_v1_customers__get"];
        put?: never;
        /**
         * Create Customer
         * @description Create a new customer.
         */
        post: operations["create_customer_api_v1_customers__post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customers/{customer_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Customer
         * @description Get a specific customer by ID.
         */
        get: operations["get_customer_api_v1_customers__customer_id__get"];
        put?: never;
        post?: never;
        /**
         * Delete Customer
         * @description Delete a customer when no related finance/ticket records exist.
         */
        delete: operations["delete_customer_api_v1_customers__customer_id__delete"];
        options?: never;
        head?: never;
        /**
         * Update Customer
         * @description Partially update a customer and enforce unique email/tax code constraints.
         */
        patch: operations["update_customer_api_v1_customers__customer_id__patch"];
        trace?: never;
    };
    "/api/v1/customers/{customer_id}/ledger": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Customer Ledger Route
         * @description Return the customer's ledger with ticket and transaction history.
         */
        get: operations["get_customer_ledger_route_api_v1_customers__customer_id__ledger_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customers/{customer_id}/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Record Customer Payment
         * @description Record a manual payment for a customer and reduce their balance.
         */
        post: operations["record_customer_payment_api_v1_customers__customer_id__payments_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/data-center/backup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Backup Data Center Scope */
        get: operations["backup_data_center_scope_api_v1_data_center_backup_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/data-center/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Preview Data Center Scope */
        get: operations["preview_data_center_scope_api_v1_data_center_preview_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/data-center/wipe": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Wipe Data Center Scope */
        delete: operations["wipe_data_center_scope_api_v1_data_center_wipe_delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/finance/invoices": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Invoices Route
         * @description List customer invoices with optional status/date filters.
         */
        get: operations["list_invoices_route_api_v1_finance_invoices_get"];
        put?: never;
        /**
         * Create Invoice Route
         * @description Generate a draft invoice from selected tickets in one atomic transaction.
         */
        post: operations["create_invoice_route_api_v1_finance_invoices_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/finance/invoices/{invoice_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Invoice Route
         * @description Fetch full invoice details including line items and amount in words.
         */
        get: operations["get_invoice_route_api_v1_finance_invoices__invoice_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update Invoice Route
         * @description Update mutable draft invoice fields. Issued/paid invoices are read-only.
         */
        patch: operations["update_invoice_route_api_v1_finance_invoices__invoice_id__patch"];
        trace?: never;
    };
    "/api/v1/finance/invoices/{invoice_id}/public": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Invoice Public Route
         * @description Return a printable/public invoice payload using immutable snapshots only.
         */
        get: operations["get_invoice_public_route_api_v1_finance_invoices__invoice_id__public_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/finance/invoices/{invoice_id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update Invoice Status Route
         * @description Update invoice lifecycle status and lock linked transactions on issue.
         */
        patch: operations["update_invoice_status_route_api_v1_finance_invoices__invoice_id__status_patch"];
        trace?: never;
    };
    "/api/v1/finance/quotes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create Quote Route
         * @description Create an informational quote without touching the ledger.
         */
        post: operations["create_quote_route_api_v1_finance_quotes_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/finance/quotes/{quote_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Quote Route
         * @description Fetch full quote details from immutable snapshot fields.
         */
        get: operations["get_quote_route_api_v1_finance_quotes__quote_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/finance/quotes/{quote_id}/convert-to-invoice": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Convert Quote To Invoice Route
         * @description Accept a quote and convert it into a draft invoice.
         */
        post: operations["convert_quote_to_invoice_route_api_v1_finance_quotes__quote_id__convert_to_invoice_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/settings/base-date-time": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Base Date Time Settings
         * @description Return the current app-wide base date time setting.
         */
        get: operations["get_base_date_time_settings_api_v1_settings_base_date_time_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update Base Date Time Settings
         * @description Update the app-wide base date time setting. Admin only.
         */
        patch: operations["update_base_date_time_settings_api_v1_settings_base_date_time_patch"];
        trace?: never;
    };
    "/api/v1/ticket-imports/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Imports Route
         * @description Return recent customer-safe ticket imports for staff review.
         */
        get: operations["list_imports_route_api_v1_ticket_imports__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/ticket-imports/{import_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Import Route
         * @description Return one customer-safe ticket import for staff review.
         */
        get: operations["get_import_route_api_v1_ticket_imports__import_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/ticket-imports/inbound-email": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create Inbound Email Import Route
         * @description Receive a forwarded airline itinerary from an inbound email provider.
         */
        post: operations["create_inbound_email_import_route_api_v1_ticket_imports_inbound_email_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/ticket-imports/uploads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create Upload Import Route
         * @description Create a pending import from an authenticated staff upload.
         */
        post: operations["create_upload_import_route_api_v1_ticket_imports_uploads_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tickets/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Tickets
         * @description List all tickets (paginated).
         */
        get: operations["list_tickets_api_v1_tickets__get"];
        put?: never;
        /**
         * Create Ticket
         * @description Legacy write path retired in favor of POST /confirm.
         *
         *     The confirm flow is the only supported ledger-safe ticket mutation because it
         *     creates the matching CHARGE transaction and updates customer.balance atomically.
         */
        post: operations["create_ticket_api_v1_tickets__post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tickets/{ticket_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Ticket
         * @description Get a specific ticket by UUID.
         */
        get: operations["get_ticket_api_v1_tickets__ticket_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update Ticket
         * @description Legacy write path retired in favor of the confirm-only ticket flow.
         */
        patch: operations["update_ticket_api_v1_tickets__ticket_id__patch"];
        trace?: never;
    };
    "/api/v1/tickets/{ticket_id}/correction": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete Ticket Correction Route
         * @description Admin-only removal for mutable confirmed ticket ledger rows.
         */
        delete: operations["delete_ticket_correction_route_api_v1_tickets__ticket_id__correction_delete"];
        options?: never;
        head?: never;
        /**
         * Correct Ticket Route
         * @description Admin-only correction for mutable confirmed ticket ledger rows.
         */
        patch: operations["correct_ticket_route_api_v1_tickets__ticket_id__correction_patch"];
        trace?: never;
    };
    "/api/v1/tickets/{ticket_id}/reassign": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reassign Ticket Route
         * @description Move a confirmed ticket and its debt to another customer.
         */
        post: operations["reassign_ticket_route_api_v1_tickets__ticket_id__reassign_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tickets/{ticket_id}/refund": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Refund Ticket Route
         * @description Record a refund credit adjustment and mark the ticket REFUNDED.
         */
        post: operations["refund_ticket_route_api_v1_tickets__ticket_id__refund_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tickets/{ticket_id}/void": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Void Ticket Route
         * @description Reverse the confirmed ticket debt and mark the ticket VOID.
         */
        post: operations["void_ticket_route_api_v1_tickets__ticket_id__void_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/tickets/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirm & save an AI-parsed ticket
         * @description Accepts the user-reviewed ticket data from the frontend. Automatically resolves or creates the customer record by name, saves the ticket as CONFIRMED, creates a CHARGE transaction for the debt, and updates the customer balance. All changes are committed atomically. Business rule: selling_price = net_price + service_fee (BUSINESS.md §2).
         */
        post: operations["confirm_ticket_api_v1_tickets_confirm_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/transactions/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Transactions
         * @description List all transactions.
         */
        get: operations["list_transactions_api_v1_transactions__get"];
        put?: never;
        /**
         * Create Transaction
         * @description Create a new transaction and update the customer's balance.
         *     The signed debt impact is derived from `category`.
         */
        post: operations["create_transaction_api_v1_transactions__post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/transactions/{transaction_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete Transaction
         * @description Admin-only removal for a mutable ledger transaction.
         */
        delete: operations["delete_transaction_api_v1_transactions__transaction_id__delete"];
        options?: never;
        head?: never;
        /**
         * Update Transaction
         * @description Admin-only correction for a mutable ledger transaction.
         */
        patch: operations["update_transaction_api_v1_transactions__transaction_id__patch"];
        trace?: never;
    };
    "/api/v1/users/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Users
         * @description List all users (ADMIN only).
         */
        get: operations["list_users_api_v1_users__get"];
        put?: never;
        /**
         * Create User
         * @description Create a new user. Only ADMIN can create other users (or staff).
         */
        post: operations["create_user_api_v1_users__post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/users/{user_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update User
         * @description Update a user account. Only ADMIN can edit staff accounts.
         */
        patch: operations["update_user_api_v1_users__user_id__patch"];
        trace?: never;
    };
    "/api/v1/users/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get Current User Profile
         * @description Get the currently authenticated user's profile.
         */
        get: operations["get_current_user_profile_api_v1_users_me_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Health Check
         * @description Lightweight liveness probe for deployment platforms.
         */
        get: operations["health_check_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /**
         * Airline
         * @description Supported Vietnamese airlines mapped to their IATA-style codes.
         * @enum {string}
         */
        Airline: "VNA" | "VJ" | "QH" | "VU";
        /** Body_create_upload_import_route_api_v1_ticket_imports_uploads_post */
        Body_create_upload_import_route_api_v1_ticket_imports_uploads_post: {
            /**
             * File
             * Format: binary
             * @description Ticket PDF, screenshot, email HTML, or .eml file.
             */
            file: string;
        };
        /** Body_login_api_v1_auth_login_post */
        Body_login_api_v1_auth_login_post: {
            /** Client Id */
            client_id?: string | null;
            /**
             * Client Secret
             * Format: password
             */
            client_secret?: string | null;
            /** Grant Type */
            grant_type?: string | null;
            /**
             * Password
             * Format: password
             */
            password: string;
            /**
             * Scope
             * @default
             */
            scope: string;
            /** Username */
            username: string;
        };
        /** Body_parse_flight_api_v1_ai_parse_post */
        Body_parse_flight_api_v1_ai_parse_post: {
            /**
             * File
             * Format: binary
             * @description Image (JPEG/PNG/WebP) or PDF of a flight booking confirmation.
             */
            file: string;
        };
        /**
         * CustomerCreate
         * @description Payload accepted by POST /customers.
         */
        CustomerCreate: {
            /**
             * Address
             * @description Optional billing/customer address.
             */
            address?: string | null;
            /**
             * Balance
             * @description Current debt balance (công nợ). Positive = customer owes; Negative = customer has credit.
             * @default 0
             */
            balance: number;
            /**
             * Email
             * @description Optional customer email used for contact and invoice delivery.
             */
            email?: string | null;
            /**
             * Is Active
             * @description Soft-archive flag. Inactive customers stay in history but should be treated as archived in the UI.
             * @default true
             */
            is_active: boolean;
            /**
             * Name
             * @description Full name of the individual or registered business name.
             */
            name: string;
            /**
             * Phone
             * @description Optional customer phone number.
             */
            phone?: string | null;
            /**
             * Tax Code
             * @description Optional Vietnamese tax code for invoicing.
             */
            tax_code?: string | null;
            /**
             * @description INDIVIDUAL for personal travellers; BUSINESS for corporate accounts.
             * @default INDIVIDUAL
             */
            type: components["schemas"]["CustomerType"];
        };
        /**
         * CustomerType
         * @description Distinguishes individual travellers from corporate/business accounts.
         * @enum {string}
         */
        CustomerType: "INDIVIDUAL" | "BUSINESS";
        /**
         * CustomerUpdate
         * @description All fields optional for partial PATCH payloads.
         */
        CustomerUpdate: {
            /** Address */
            address?: string | null;
            /** Balance */
            balance?: number | null;
            /** Email */
            email?: string | null;
            /** Is Active */
            is_active?: boolean | null;
            /** Name */
            name?: string | null;
            /** Phone */
            phone?: string | null;
            /** Tax Code */
            tax_code?: string | null;
            type?: components["schemas"]["CustomerType"] | null;
        };
        /** DataCenterWipePayload */
        DataCenterWipePayload: {
            /** Confirmation */
            confirmation: string;
            /** Date From */
            date_from?: string | null;
            /** Date To */
            date_to?: string | null;
            /** Tables */
            tables?: string[] | null;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /**
         * InvoiceCreate
         * @description Payload for POST /invoices.
         */
        InvoiceCreate: {
            /**
             * Customer Id
             * Format: uuid
             */
            customer_id: string;
            /**
             * Discount Amount
             * @default 0
             */
            discount_amount: number;
            /** Note */
            note?: string | null;
            /**
             * Tax Amount
             * @default 0
             */
            tax_amount: number;
            /** Ticket Ids */
            ticket_ids?: string[];
        };
        /**
         * InvoiceStatus
         * @description Lifecycle state for quotes / invoices under VN financial workflows.
         * @enum {string}
         */
        InvoiceStatus: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";
        /**
         * InvoiceStatusUpdate
         * @description Payload for PATCH /invoices/{id}/status.
         */
        InvoiceStatusUpdate: {
            status: components["schemas"]["InvoiceStatus"];
        };
        /**
         * InvoiceUpdate
         * @description Draft-only mutable invoice fields.
         */
        InvoiceUpdate: {
            /** Discount Amount */
            discount_amount?: number | null;
            /** Note */
            note?: string | null;
            /** Tax Amount */
            tax_amount?: number | null;
        };
        /**
         * ParseFlightResponse
         * @description Response schema matching AGENT_PARSER.md output format.
         */
        ParseFlightResponse: {
            /**
             * Airline
             * @description Airline code: VNA, VJ, QH, or VU.
             */
            airline: string;
            /**
             * Arrival Code
             * @description Arrival place code, e.g. SGN.
             */
            arrival_code: string;
            /**
             * Arrival Place
             * @description Readable arrival place name.
             */
            arrival_place: string;
            /**
             * Currency
             * @description Currency code, defaults to VND.
             * @default VND
             */
            currency: string;
            /**
             * Departure Code
             * @description Departure place code, e.g. DAD.
             */
            departure_code: string;
            /**
             * Departure Place
             * @description Readable departure place name.
             */
            departure_place: string;
            /**
             * Flight Date
             * @description Departure datetime in ISO-8601 format.
             */
            flight_date: string;
            /**
             * Itinerary
             * @description Flight route (e.g., 'HAN-SGN').
             */
            itinerary: string;
            /**
             * Net Price
             * @description Total net price from airline/supplier.
             */
            net_price: number;
            /**
             * Passengers
             * @description List of passenger names in UPPERCASE.
             */
            passengers: string[];
            /**
             * Pnr
             * @description 6-character PNR booking reference code.
             */
            pnr: string;
            /**
             * Ticket Number
             * @description Airline ticket number.
             */
            ticket_number: string;
        };
        /**
         * QuoteCreate
         * @description Payload for POST /quotes.
         */
        QuoteCreate: {
            /**
             * Customer Id
             * Format: uuid
             */
            customer_id: string;
            /**
             * Discount Amount
             * @default 0
             */
            discount_amount: number;
            /** Note */
            note?: string | null;
            /**
             * Tax Amount
             * @default 0
             */
            tax_amount: number;
            /** Ticket Ids */
            ticket_ids?: string[];
            /**
             * Valid Until
             * Format: date-time
             */
            valid_until: string;
        };
        /**
         * RecordPaymentPayload
         * @description Payload accepted by POST /customers/{id}/payments.
         */
        RecordPaymentPayload: {
            /**
             * Amount
             * @description Payment amount in VND.
             */
            amount: number;
            /**
             * Evidence Url
             * @description Optional payment receipt / proof URL.
             */
            evidence_url?: string | null;
            /**
             * Linked Ticket Id
             * @description Optional ticket UUID for specific reconciliation (đích danh).
             */
            linked_ticket_id?: string | null;
            /**
             * Method
             * @description Payment method label, e.g. Chuyển khoản or Tiền mặt.
             */
            method: string;
            /**
             * Note
             * @description Required payment note or transfer reference.
             */
            note?: string | null;
        };
        /**
         * SystemSettingUpdate
         * @description Partial settings update payload.
         */
        SystemSettingUpdate: {
            /** Base Datetime */
            base_datetime?: string | null;
        };
        /**
         * TicketConfirmPayload
         * @description Payload sent by the frontend when the user confirms an AI-parsed ticket.
         *
         *     Customer identification:
         *         The user can identify the customer by name (and optionally `customer_type`).
         *         The service will look up an existing customer by name (case-insensitive) or
         *         create a new one if no match is found.
         *
         *     Pricing (docs/BUSINESS.md §2):
         *         true_income = selling_price + discount - net_price
         *         If `selling_price` is omitted, the service derives it from service_fee.
         *         If `true_income` is supplied, it must match the computed income.
         */
        TicketConfirmPayload: {
            /** @description Carrier code: VNA | VJ | QH | VU. */
            airline: components["schemas"]["Airline"];
            /**
             * Arrival Code
             * @description Arrival place code, e.g. SGN.
             */
            arrival_code?: string | null;
            /**
             * Arrival Place
             * @description Readable arrival place, e.g. Ho Chi Minh City.
             */
            arrival_place?: string | null;
            /**
             * Customer Name
             * @description Full name of the customer. Used to look up or create the customer record.
             */
            customer_name: string;
            /**
             * @description INDIVIDUAL or BUSINESS. Only used when creating a new customer.
             * @default INDIVIDUAL
             */
            customer_type: components["schemas"]["CustomerType"];
            /**
             * Departure Code
             * @description Departure place code, e.g. DAD.
             */
            departure_code?: string | null;
            /**
             * Departure Place
             * @description Readable departure place, e.g. Da Nang City.
             */
            departure_place?: string | null;
            /**
             * Discount
             * @description Airline add-in / discount amount earned by the agency for this ticket in VND.
             * @default 0
             */
            discount: number;
            /**
             * Fare Class
             * @description Optional fare class / fare family label from the source ticket.
             */
            fare_class?: string | null;
            /**
             * Flight Date
             * Format: date-time
             * @description Scheduled departure datetime (ISO-8601 / UTC).
             */
            flight_date: string;
            /**
             * Itinerary
             * @description Flight route string, e.g. "HAN-SGN". Derived from codes when omitted.
             */
            itinerary?: string | null;
            /**
             * Net Price
             * @description Net cost from airline/supplier (giá gốc). ≥ 0.
             */
            net_price: number;
            /**
             * Passengers
             * @description List of passenger full names (UPPERCASE). At least one required.
             */
            passengers: string[];
            /**
             * Pnr
             * @description 6-character PNR booking reference code.
             */
            pnr: string;
            /**
             * Seat Code
             * @description Optional seat assignment code, e.g. 12A.
             */
            seat_code?: string | null;
            /**
             * Selling Price
             * @description Final price charged to the customer (giá bán). If omitted, computed as net_price + service_fee. If provided, must equal net_price + service_fee.
             */
            selling_price?: number | null;
            /**
             * Service Fee
             * @description Agent profit margin (phí dịch vụ). selling_price = net_price + service_fee. Defaults to 0.
             * @default 0
             */
            service_fee: number;
            /**
             * Ticket Number
             * @description Airline ticket number.
             */
            ticket_number?: string | null;
            /**
             * True Income
             * @description Actual ticket income: selling_price + discount - net_price.
             */
            true_income?: number | null;
        };
        /**
         * TicketCreate
         * @description Payload accepted by POST /tickets (after AI-extraction confirmation).
         */
        TicketCreate: {
            /** @description Carrier code: VNA (Vietnam Airlines), VJ (Vietjet), QH (Bamboo), VU (Vietravel). */
            airline: components["schemas"]["Airline"];
            /**
             * Arrival Code
             * @description Compact arrival place code, e.g. SGN.
             */
            arrival_code?: string | null;
            /**
             * Arrival Place
             * @description Human-readable arrival place, e.g. Ho Chi Minh City.
             */
            arrival_place?: string | null;
            /**
             * Customer Id
             * Format: uuid
             */
            customer_id: string;
            /**
             * Departure Code
             * @description Compact departure place code, e.g. DAD.
             */
            departure_code?: string | null;
            /**
             * Departure Place
             * @description Human-readable departure place, e.g. Da Nang City.
             */
            departure_place?: string | null;
            /**
             * Discount
             * @description Airline add-in / discount amount earned by the agency for this ticket in VND.
             * @default 0
             */
            discount: number;
            /**
             * Fare Class
             * @description Optional fare class / fare family label from the source ticket, e.g. B or Flexible.
             */
            fare_class?: string | null;
            /**
             * Flight Date
             * Format: date-time
             * @description Scheduled departure datetime stored in ISO-8601 / UTC.
             */
            flight_date: string;
            /**
             * Itinerary
             * @description Flight route string (hành trình), e.g. "HAN-SGN" or "SGN-DAD-HAN".
             */
            itinerary: string;
            /**
             * Net Price
             * @description Net cost from airline/supplier (giá gốc). Must be ≥ 0.
             */
            net_price: number;
            /**
             * Passengers
             * @description At least one passenger name is required.
             */
            passengers?: string[];
            /**
             * Pnr
             * @description 6-character PNR (Passenger Name Record) booking reference code. May repeat across passenger rows in group bookings.
             */
            pnr: string;
            /**
             * Seat Code
             * @description Optional seat assignment code, e.g. 12A.
             */
            seat_code?: string | null;
            /**
             * Selling Price
             * @description Selling price charged to the customer (giá bán). Must be ≥ 0.
             */
            selling_price: number;
            /**
             * @description Lifecycle state of the ticket (DRAFT, CONFIRMED, VOID, REFUNDED).
             * @default DRAFT
             */
            status: components["schemas"]["TicketStatus"];
            /**
             * Ticket Number
             * @description Airline ticket number. May repeat across outbound/return ticket rows.
             */
            ticket_number?: string | null;
            /**
             * True Income
             * @description Actual ticket income: selling_price + discount - net_price.
             * @default 0
             */
            true_income: number;
        };
        /**
         * TicketReassignPayload
         * @description Payload for moving a confirmed ticket to another customer.
         */
        TicketReassignPayload: {
            /**
             * New Customer Id
             * Format: uuid
             * @description UUID of the target customer.
             */
            new_customer_id: string;
        };
        /**
         * TicketRefundPayload
         * @description Payload for partial or full ticket refunds.
         */
        TicketRefundPayload: {
            /**
             * Amount
             * @description Refund amount in VND.
             */
            amount: number;
        };
        /**
         * TicketStatus
         * @description Lifecycle status of a ticket.
         * @enum {string}
         */
        TicketStatus: "DRAFT" | "CONFIRMED" | "VOID" | "REFUNDED";
        /**
         * TicketUpdate
         * @description All fields optional for partial PATCH payloads.
         */
        TicketUpdate: {
            airline?: components["schemas"]["Airline"] | null;
            /** Arrival Code */
            arrival_code?: string | null;
            /** Arrival Place */
            arrival_place?: string | null;
            /** Customer Id */
            customer_id?: string | null;
            /** Departure Code */
            departure_code?: string | null;
            /** Departure Place */
            departure_place?: string | null;
            /** Discount */
            discount?: number | null;
            /** Fare Class */
            fare_class?: string | null;
            /** Flight Date */
            flight_date?: string | null;
            /** Itinerary */
            itinerary?: string | null;
            /** Net Price */
            net_price?: number | null;
            /** Passengers */
            passengers?: string[] | null;
            /** Pnr */
            pnr?: string | null;
            /** Seat Code */
            seat_code?: string | null;
            /** Selling Price */
            selling_price?: number | null;
            /**
             * Service Fee
             * @description Optional service fee used to recompute selling_price.
             */
            service_fee?: number | null;
            status?: components["schemas"]["TicketStatus"] | null;
            /** Ticket Number */
            ticket_number?: string | null;
            /** True Income */
            true_income?: number | null;
        };
        /**
         * TokenResponse
         * @description JSON response returned after a successful login.
         */
        TokenResponse: {
            /** Access Token */
            access_token: string;
            /**
             * Token Type
             * @default bearer
             */
            token_type: string;
        };
        /**
         * TransactionCategory
         * @description Vietnamese-market transaction categories used for reconciliation and audit.
         * @enum {string}
         */
        TransactionCategory: "TICKET_PURCHASE" | "PAYMENT" | "DISCOUNT" | "ADDITIONAL_FEE" | "REFUND";
        /**
         * TransactionCreate
         * @description Payload accepted by POST /transactions.
         */
        TransactionCreate: {
            /**
             * Amount
             * @description Transaction amount. Must be a positive value (direction is encoded in `type`).
             */
            amount: number;
            /**
             * @description VN-market category used for reconciliation and running balance rules: TICKET_PURCHASE | PAYMENT | DISCOUNT | ADDITIONAL_FEE | REFUND.
             * @default TICKET_PURCHASE
             */
            category: components["schemas"]["TransactionCategory"];
            /**
             * Customer Id
             * Format: uuid
             */
            customer_id: string;
            /**
             * Evidence Url
             * @description Optional receipt / payment-proof URL attached to the transaction.
             */
            evidence_url?: string | null;
            /**
             * Invoice Id
             * @description Optional invoice UUID for duplicate-billing prevention.
             */
            invoice_id?: string | null;
            /**
             * Is Invoiced
             * @description True once this transaction has been locked into an issued invoice.
             * @default false
             */
            is_invoiced: boolean;
            /**
             * Is Refund Confirmed
             * @description True once an outbound refund / overpayment return has been confirmed.
             * @default false
             */
            is_refund_confirmed: boolean;
            /**
             * Linked Ticket Id
             * @description UUID of the Ticket explicitly reconciled to this transaction.
             */
            linked_ticket_id?: string | null;
            /**
             * Method
             * @description Payment method label, e.g. "Bank Transfer", "Cash", "Momo".
             */
            method: string;
            /**
             * Note
             * @description Reference/note text. Required for manual payments and manual adjustments.
             */
            note?: string | null;
            /**
             * Occurred At
             * Format: date-time
             * @description UTC timestamp of when the business event actually happened.
             */
            occurred_at?: string;
            /** @description Legacy direction enum kept in sync with category. */
            type: components["schemas"]["TransactionType"];
        };
        /**
         * TransactionType
         * @description Types of financial transactions that affect a Customer's balance (công nợ).
         * @enum {string}
         */
        TransactionType: "PAYMENT" | "CHARGE" | "REFUND";
        /**
         * TransactionUpdate
         * @description All fields optional for partial PATCH payloads (typically only `note` or `method` changes).
         */
        TransactionUpdate: {
            /** Amount */
            amount?: number | null;
            category?: components["schemas"]["TransactionCategory"] | null;
            /** Evidence Url */
            evidence_url?: string | null;
            /** Is Refund Confirmed */
            is_refund_confirmed?: boolean | null;
            /** Linked Ticket Id */
            linked_ticket_id?: string | null;
            /** Method */
            method?: string | null;
            /** Note */
            note?: string | null;
            /** Occurred At */
            occurred_at?: string | null;
            type?: components["schemas"]["TransactionType"] | null;
        };
        /**
         * UserCreate
         * @description Payload accepted by POST /users. The plain-text password is hashed before storage.
         */
        UserCreate: {
            /**
             * Is Active
             * @description Soft-delete / deactivation flag. Inactive users cannot log in.
             * @default true
             */
            is_active: boolean;
            /**
             * Password
             * @description Plain-text password (hashed before storage).
             */
            password: string;
            /**
             * @description Access level: ADMIN has full privileges; STAFF has limited access.
             * @default STAFF
             */
            role: components["schemas"]["UserRole"];
            /**
             * Username
             * @description Unique login identifier for the system user.
             */
            username: string;
        };
        /**
         * UserRead
         * @description Safe public representation – hashed_password is intentionally excluded.
         */
        UserRead: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Is Active
             * @description Soft-delete / deactivation flag. Inactive users cannot log in.
             * @default true
             */
            is_active: boolean;
            /**
             * @description Access level: ADMIN has full privileges; STAFF has limited access.
             * @default STAFF
             */
            role: components["schemas"]["UserRole"];
            /**
             * Username
             * @description Unique login identifier for the system user.
             */
            username: string;
        };
        /**
         * UserRole
         * @description Roles available to internal system users.
         * @enum {string}
         */
        UserRole: "ADMIN" | "STAFF";
        /**
         * UserUpdate
         * @description All fields optional so clients can send partial PATCH payloads.
         */
        UserUpdate: {
            /** Is Active */
            is_active?: boolean | null;
            /** Password */
            password?: string | null;
            role?: components["schemas"]["UserRole"] | null;
            /** Username */
            username?: string | null;
        };
        /** ValidationError */
        ValidationError: {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    ai_health_check_api_v1_ai_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: string;
                    };
                };
            };
        };
    };
    parse_flight_api_v1_ai_parse_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_parse_flight_api_v1_ai_parse_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ParseFlightResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    login_api_v1_auth_login_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/x-www-form-urlencoded": components["schemas"]["Body_login_api_v1_auth_login_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_current_user_profile_api_v1_auth_me_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserRead"];
                };
            };
        };
    };
    list_customers_api_v1_customers__get: {
        parameters: {
            query?: {
                limit?: number;
                skip?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_customer_api_v1_customers__post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CustomerCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_customer_api_v1_customers__customer_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                customer_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_customer_api_v1_customers__customer_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                customer_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_customer_api_v1_customers__customer_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                customer_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CustomerUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_customer_ledger_route_api_v1_customers__customer_id__ledger_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                customer_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    record_customer_payment_api_v1_customers__customer_id__payments_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                customer_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecordPaymentPayload"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    backup_data_center_scope_api_v1_data_center_backup_get: {
        parameters: {
            query?: {
                date_from?: string | null;
                date_to?: string | null;
                tables?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    preview_data_center_scope_api_v1_data_center_preview_get: {
        parameters: {
            query?: {
                date_from?: string | null;
                date_to?: string | null;
                tables?: string | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    wipe_data_center_scope_api_v1_data_center_wipe_delete: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DataCenterWipePayload"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_invoices_route_api_v1_finance_invoices_get: {
        parameters: {
            query: {
                customer_id: string;
                date_from?: string | null;
                date_to?: string | null;
                status?: components["schemas"]["InvoiceStatus"] | null;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_invoice_route_api_v1_finance_invoices_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InvoiceCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_invoice_route_api_v1_finance_invoices__invoice_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                invoice_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_invoice_route_api_v1_finance_invoices__invoice_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                invoice_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InvoiceUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_invoice_public_route_api_v1_finance_invoices__invoice_id__public_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                invoice_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_invoice_status_route_api_v1_finance_invoices__invoice_id__status_patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                invoice_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InvoiceStatusUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_quote_route_api_v1_finance_quotes_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QuoteCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_quote_route_api_v1_finance_quotes__quote_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quote_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    convert_quote_to_invoice_route_api_v1_finance_quotes__quote_id__convert_to_invoice_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quote_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_base_date_time_settings_api_v1_settings_base_date_time_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    update_base_date_time_settings_api_v1_settings_base_date_time_patch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SystemSettingUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_imports_route_api_v1_ticket_imports__get: {
        parameters: {
            query?: {
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_import_route_api_v1_ticket_imports__import_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                import_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_inbound_email_import_route_api_v1_ticket_imports_inbound_email_post: {
        parameters: {
            query?: never;
            header?: {
                "x-bay-buddy-inbound-secret"?: string | null;
                "x-bay-buddy-webhook-secret"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_upload_import_route_api_v1_ticket_imports_uploads_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_create_upload_import_route_api_v1_ticket_imports_uploads_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_tickets_api_v1_tickets__get: {
        parameters: {
            query?: {
                limit?: number;
                skip?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_ticket_api_v1_tickets__post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TicketCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_ticket_api_v1_tickets__ticket_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                ticket_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_ticket_api_v1_tickets__ticket_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                ticket_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TicketUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_ticket_correction_route_api_v1_tickets__ticket_id__correction_delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                ticket_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    correct_ticket_route_api_v1_tickets__ticket_id__correction_patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                ticket_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TicketUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    reassign_ticket_route_api_v1_tickets__ticket_id__reassign_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                ticket_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TicketReassignPayload"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    refund_ticket_route_api_v1_tickets__ticket_id__refund_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                ticket_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TicketRefundPayload"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    void_ticket_route_api_v1_tickets__ticket_id__void_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                ticket_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    confirm_ticket_api_v1_tickets_confirm_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TicketConfirmPayload"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_transactions_api_v1_transactions__get: {
        parameters: {
            query?: {
                limit?: number;
                skip?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_transaction_api_v1_transactions__post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TransactionCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_transaction_api_v1_transactions__transaction_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                transaction_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_transaction_api_v1_transactions__transaction_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                transaction_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TransactionUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_users_api_v1_users__get: {
        parameters: {
            query?: {
                limit?: number;
                skip?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_user_api_v1_users__post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UserCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_user_api_v1_users__user_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                user_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UserUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_current_user_profile_api_v1_users_me_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    health_check_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
}
