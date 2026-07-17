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
    "/api/v1/auth/internal-login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Login With Internal Access Code
         * @description Issue a JWT for the configured internal account after code verification.
         */
        post: operations["login_with_internal_access_code_api_v1_auth_internal_login_post"];
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
         * @description Accepts the user-reviewed ticket data from the frontend. Automatically resolves or creates the customer record by name, saves the ticket as CONFIRMED, creates a CHARGE transaction for the debt, and updates the customer balance. All changes are committed atomically. Business rule: true_income = selling_price + discount - (ev_price + ast_price + thf_price + web_price + insurance_price) (BUSINESS.md §2).
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
    "/api/v1/workbooks/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Editing Sessions Route */
        get: operations["list_editing_sessions_route_api_v1_workbooks_sessions_get"];
        put?: never;
        /** Create Editing Session Route */
        post: operations["create_editing_session_route_api_v1_workbooks_sessions_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workbooks/sessions/{session_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Editing Session Route */
        get: operations["get_editing_session_route_api_v1_workbooks_sessions__session_id__get"];
        put?: never;
        post?: never;
        /** Discard Editing Session Route */
        delete: operations["discard_editing_session_route_api_v1_workbooks_sessions__session_id__delete"];
        options?: never;
        head?: never;
        /** Rename Editing Session Route */
        patch: operations["rename_editing_session_route_api_v1_workbooks_sessions__session_id__patch"];
        trace?: never;
    };
    "/api/v1/workbooks/sessions/{session_id}/cell-values": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Lookup Session Cell Values Route */
        post: operations["lookup_session_cell_values_route_api_v1_workbooks_sessions__session_id__cell_values_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workbooks/sessions/{session_id}/column-configuration": {
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
        /** Update Session Column Configuration Route */
        patch: operations["update_session_column_configuration_route_api_v1_workbooks_sessions__session_id__column_configuration_patch"];
        trace?: never;
    };
    "/api/v1/workbooks/sessions/{session_id}/columns": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Add Session Column Route */
        post: operations["add_session_column_route_api_v1_workbooks_sessions__session_id__columns_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workbooks/sessions/{session_id}/columns/{column_id}": {
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
        /** Update Session Column Route */
        patch: operations["update_session_column_route_api_v1_workbooks_sessions__session_id__columns__column_id__patch"];
        trace?: never;
    };
    "/api/v1/workbooks/sessions/{session_id}/columns/{column_id}/remove": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Remove Session Column Route */
        post: operations["remove_session_column_route_api_v1_workbooks_sessions__session_id__columns__column_id__remove_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workbooks/sessions/{session_id}/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download Current Workbook Route */
        get: operations["download_current_workbook_route_api_v1_workbooks_sessions__session_id__download_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workbooks/sessions/{session_id}/formulas/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Preview Session Formula Route */
        post: operations["preview_session_formula_route_api_v1_workbooks_sessions__session_id__formulas_preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workbooks/sessions/{session_id}/records": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read Session Records Route */
        get: operations["read_session_records_route_api_v1_workbooks_sessions__session_id__records_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workbooks/sessions/{session_id}/saves": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Save Session Changes Route */
        post: operations["save_session_changes_route_api_v1_workbooks_sessions__session_id__saves_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workbooks/sessions/latest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Latest Editing Session Route */
        get: operations["get_latest_editing_session_route_api_v1_workbooks_sessions_latest_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workbooks/uploads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Upload Workbook Route */
        post: operations["upload_workbook_route_api_v1_workbooks_uploads_post"];
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
             * @description Ticket email HTML or .eml file.
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
        /** Body_upload_workbook_route_api_v1_workbooks_uploads_post */
        Body_upload_workbook_route_api_v1_workbooks_uploads_post: {
            /**
             * File
             * Format: binary
             * @description Excel .xlsx or legacy .xls workbook.
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
         * InternalLoginRequest
         * @description Payload accepted by the internal shared access-code login.
         */
        InternalLoginRequest: {
            /** Access Code */
            access_code: string;
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
             * @description 6-character PNR booking reference code when visible.
             */
            pnr?: string | null;
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
         * SortDirection
         * @enum {string}
         */
        SortDirection: "asc" | "desc";
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
         *         true_income = selling_price + discount - (ev_price + ast_price + thf_price + web_price + insurance_price)
         *         If `selling_price` is omitted, the service derives it from service_fee.
         *         If `true_income` is supplied, it must match the computed income.
         */
        TicketConfirmPayload: {
            /** @description Carrier code: VNA | VJ | QH | VU. */
            airline?: components["schemas"]["Airline"] | null;
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
             * Ast Price
             * @description Host net price from AST (giá AST). Empty values count as 0.
             * @default 0
             */
            ast_price: number;
            /**
             * Booked At
             * @description Real-world datetime when the ticket was booked manually by staff.
             */
            booked_at?: string | null;
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
             * Ev Price
             * @description Host price from EV (giá EV). Empty values count as 0.
             * @default 0
             */
            ev_price: number;
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
             * Insurance Price
             * @description Insurance price (giá bảo hiểm). Empty values count as 0.
             * @default 0
             */
            insurance_price: number;
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
             * @description List of passenger full names (UPPERCASE).
             */
            passengers?: string[];
            /**
             * Pnr
             * @description Optional 6-character PNR booking reference code.
             */
            pnr?: string | null;
            /**
             * Seat Code
             * @description Optional seat assignment code, e.g. 12A.
             */
            seat_code?: string | null;
            /**
             * Selling Price
             * @description Final price charged to the customer (giá bán). If omitted, computed as net_price + service_fee.
             */
            selling_price?: number | null;
            /**
             * Service Fee
             * @description Agent profit margin (phí dịch vụ). selling_price = net_price + service_fee. Defaults to 0.
             * @default 0
             */
            service_fee: number;
            /**
             * Thf Price
             * @description Host net price from Thanh Hoang / THF (giá Thành Hoàng). Empty values count as 0.
             * @default 0
             */
            thf_price: number;
            /**
             * Ticket Number
             * @description Airline ticket number.
             */
            ticket_number?: string | null;
            /**
             * True Income
             * @description Actual ticket income: selling_price + discount - (ev_price + ast_price + thf_price + web_price + insurance_price).
             */
            true_income?: number | null;
            /**
             * Web Price
             * @description Host net price from WEB (giá WEB). Empty values count as 0.
             * @default 0
             */
            web_price: number;
        };
        /**
         * TicketCreate
         * @description Payload accepted by POST /tickets (after AI-extraction confirmation).
         */
        TicketCreate: {
            /** @description Carrier code: VNA (Vietnam Airlines), VJ (Vietjet), QH (Bamboo), VU (Vietravel). */
            airline?: components["schemas"]["Airline"] | null;
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
             * Ast Price
             * @description Host net price from AST (giá AST). Empty values count as 0.
             * @default 0
             */
            ast_price: number;
            /**
             * Booked At
             * @description Real-world datetime when the ticket was booked manually by staff.
             */
            booked_at?: string | null;
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
             * Ev Price
             * @description Host price from EV (giá EV). Empty values count as 0.
             * @default 0
             */
            ev_price: number;
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
             * Insurance Price
             * @description Insurance price (giá bảo hiểm). Empty values count as 0.
             * @default 0
             */
            insurance_price: number;
            /**
             * Itinerary
             * @description Flight route string (hành trình), e.g. "HAN-SGN" or "SGN-DAD-HAN".
             */
            itinerary?: string | null;
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
             * @description Optional 6-character PNR (Passenger Name Record) booking reference code. May repeat across passenger rows in group bookings.
             */
            pnr?: string | null;
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
             * Thf Price
             * @description Host net price from Thanh Hoang / THF (giá Thành Hoàng). Empty values count as 0.
             * @default 0
             */
            thf_price: number;
            /**
             * Ticket Number
             * @description Airline ticket number. May repeat across outbound/return ticket rows.
             */
            ticket_number?: string | null;
            /**
             * True Income
             * @description Actual ticket income: selling_price + discount - (ev_price + ast_price + thf_price + web_price + insurance_price).
             * @default 0
             */
            true_income: number;
            /**
             * Web Price
             * @description Host net price from WEB (giá WEB). Empty values count as 0.
             * @default 0
             */
            web_price: number;
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
            /** Ast Price */
            ast_price?: number | null;
            /** Booked At */
            booked_at?: string | null;
            /** Customer Id */
            customer_id?: string | null;
            /** Departure Code */
            departure_code?: string | null;
            /** Departure Place */
            departure_place?: string | null;
            /** Discount */
            discount?: number | null;
            /** Ev Price */
            ev_price?: number | null;
            /** Fare Class */
            fare_class?: string | null;
            /** Flight Date */
            flight_date?: string | null;
            /** Insurance Price */
            insurance_price?: number | null;
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
            /** Thf Price */
            thf_price?: number | null;
            /** Ticket Number */
            ticket_number?: string | null;
            /** True Income */
            true_income?: number | null;
            /** Web Price */
            web_price?: number | null;
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
        /** WorkbookAddColumnRequest */
        WorkbookAddColumnRequest: {
            /** Base Version */
            base_version: number;
            /** @default text */
            data_type: components["schemas"]["WorkbookColumnDataType"];
            /** Formula */
            formula?: components["schemas"]["WorkbookColumnFormula-Input"] | components["schemas"]["WorkbookLegacyColumnFormula"] | null;
            /** Label */
            label: string;
        };
        /** WorkbookCellReference */
        WorkbookCellReference: {
            /** Column Id */
            column_id: string;
            /** Row Number */
            row_number: number;
        };
        /** WorkbookCellValueItem */
        WorkbookCellValueItem: {
            /** Column Id */
            column_id: string;
            /** Row Number */
            row_number: number;
            /** Value */
            value: string | number | boolean | null;
        };
        /** WorkbookCellValueLookupRequest */
        WorkbookCellValueLookupRequest: {
            /** Base Version */
            base_version: number;
            /** Cells */
            cells: components["schemas"]["WorkbookCellReference"][];
        };
        /** WorkbookCellValueLookupResponse */
        WorkbookCellValueLookupResponse: {
            /** Cells */
            cells: components["schemas"]["WorkbookCellValueItem"][];
            /**
             * Session Id
             * Format: uuid
             */
            session_id: string;
            /** Version */
            version: number;
        };
        /** WorkbookColumnConfiguration */
        WorkbookColumnConfiguration: {
            /** Column Number */
            column_number: number;
            data_type: components["schemas"]["WorkbookColumnDataType"];
            formula?: components["schemas"]["WorkbookColumnFormula-Output"] | null;
            /**
             * Hidden
             * @default false
             */
            hidden: boolean;
            /** Id */
            id: string;
            /** Label */
            label: string;
            origin: components["schemas"]["WorkbookColumnOrigin"];
            semantic_field?: components["schemas"]["WorkbookSemanticField"] | null;
            /**
             * Sticky
             * @default false
             */
            sticky: boolean;
        };
        /** WorkbookColumnConfigurationRequest */
        WorkbookColumnConfigurationRequest: {
            /** Base Version */
            base_version: number;
            /** Hidden Column Ids */
            hidden_column_ids?: string[];
            /** Sticky Column Ids */
            sticky_column_ids?: string[];
        };
        /**
         * WorkbookColumnDataType
         * @enum {string}
         */
        WorkbookColumnDataType: "text" | "number" | "date" | "currency" | "boolean";
        /** WorkbookColumnFormula */
        "WorkbookColumnFormula-Input": {
            /** Expression */
            expression: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Input"] | components["schemas"]["WorkbookFormulaComparison-Input"] | components["schemas"]["WorkbookFormulaIf-Input"] | components["schemas"]["WorkbookFormulaRound-Input"] | components["schemas"]["WorkbookFormulaFunction-Input"];
            /**
             * Schema Version
             * @default 1
             * @constant
             */
            schema_version: 1;
        };
        /** WorkbookColumnFormula */
        "WorkbookColumnFormula-Output": {
            /** Expression */
            expression: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Output"] | components["schemas"]["WorkbookFormulaComparison-Output"] | components["schemas"]["WorkbookFormulaIf-Output"] | components["schemas"]["WorkbookFormulaRound-Output"] | components["schemas"]["WorkbookFormulaFunction-Output"];
            /**
             * Schema Version
             * @default 1
             * @constant
             */
            schema_version: 1;
        };
        /**
         * WorkbookColumnOrigin
         * @enum {string}
         */
        WorkbookColumnOrigin: "source" | "user";
        /**
         * WorkbookComparisonOperator
         * @enum {string}
         */
        WorkbookComparisonOperator: "=" | "<>" | "<" | "<=" | ">" | ">=";
        /** WorkbookErrorDetail */
        WorkbookErrorDetail: {
            /** Code */
            code: string;
            /** Details */
            details?: {
                [key: string]: unknown;
            };
            /** Message */
            message: string;
        };
        /** WorkbookErrorResponse */
        WorkbookErrorResponse: {
            detail: components["schemas"]["WorkbookErrorDetail"];
        };
        /** WorkbookFormulaBinary */
        "WorkbookFormulaBinary-Input": {
            /** Left */
            left: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Input"] | components["schemas"]["WorkbookFormulaComparison-Input"] | components["schemas"]["WorkbookFormulaIf-Input"] | components["schemas"]["WorkbookFormulaRound-Input"] | components["schemas"]["WorkbookFormulaFunction-Input"];
            operator: components["schemas"]["WorkbookFormulaOperator"];
            /** Right */
            right: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Input"] | components["schemas"]["WorkbookFormulaComparison-Input"] | components["schemas"]["WorkbookFormulaIf-Input"] | components["schemas"]["WorkbookFormulaRound-Input"] | components["schemas"]["WorkbookFormulaFunction-Input"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "binary";
        };
        /** WorkbookFormulaBinary */
        "WorkbookFormulaBinary-Output": {
            /** Left */
            left: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Output"] | components["schemas"]["WorkbookFormulaComparison-Output"] | components["schemas"]["WorkbookFormulaIf-Output"] | components["schemas"]["WorkbookFormulaRound-Output"] | components["schemas"]["WorkbookFormulaFunction-Output"];
            operator: components["schemas"]["WorkbookFormulaOperator"];
            /** Right */
            right: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Output"] | components["schemas"]["WorkbookFormulaComparison-Output"] | components["schemas"]["WorkbookFormulaIf-Output"] | components["schemas"]["WorkbookFormulaRound-Output"] | components["schemas"]["WorkbookFormulaFunction-Output"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "binary";
        };
        /** WorkbookFormulaColumnReference */
        WorkbookFormulaColumnReference: {
            /** Column Id */
            column_id: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "column";
        };
        /** WorkbookFormulaComparison */
        "WorkbookFormulaComparison-Input": {
            /** Left */
            left: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Input"] | components["schemas"]["WorkbookFormulaComparison-Input"] | components["schemas"]["WorkbookFormulaIf-Input"] | components["schemas"]["WorkbookFormulaRound-Input"] | components["schemas"]["WorkbookFormulaFunction-Input"];
            operator: components["schemas"]["WorkbookComparisonOperator"];
            /** Right */
            right: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Input"] | components["schemas"]["WorkbookFormulaComparison-Input"] | components["schemas"]["WorkbookFormulaIf-Input"] | components["schemas"]["WorkbookFormulaRound-Input"] | components["schemas"]["WorkbookFormulaFunction-Input"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "comparison";
        };
        /** WorkbookFormulaComparison */
        "WorkbookFormulaComparison-Output": {
            /** Left */
            left: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Output"] | components["schemas"]["WorkbookFormulaComparison-Output"] | components["schemas"]["WorkbookFormulaIf-Output"] | components["schemas"]["WorkbookFormulaRound-Output"] | components["schemas"]["WorkbookFormulaFunction-Output"];
            operator: components["schemas"]["WorkbookComparisonOperator"];
            /** Right */
            right: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Output"] | components["schemas"]["WorkbookFormulaComparison-Output"] | components["schemas"]["WorkbookFormulaIf-Output"] | components["schemas"]["WorkbookFormulaRound-Output"] | components["schemas"]["WorkbookFormulaFunction-Output"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "comparison";
        };
        /** WorkbookFormulaConstant */
        WorkbookFormulaConstant: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "constant";
            /** Value */
            value: string;
        };
        /** WorkbookFormulaFunction */
        "WorkbookFormulaFunction-Input": {
            /** Arguments */
            arguments: (components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Input"] | components["schemas"]["WorkbookFormulaComparison-Input"] | components["schemas"]["WorkbookFormulaIf-Input"] | components["schemas"]["WorkbookFormulaRound-Input"] | components["schemas"]["WorkbookFormulaFunction-Input"])[];
            function: components["schemas"]["WorkbookVariadicFunction"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "function";
        };
        /** WorkbookFormulaFunction */
        "WorkbookFormulaFunction-Output": {
            /** Arguments */
            arguments: (components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Output"] | components["schemas"]["WorkbookFormulaComparison-Output"] | components["schemas"]["WorkbookFormulaIf-Output"] | components["schemas"]["WorkbookFormulaRound-Output"] | components["schemas"]["WorkbookFormulaFunction-Output"])[];
            function: components["schemas"]["WorkbookVariadicFunction"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "function";
        };
        /** WorkbookFormulaIf */
        "WorkbookFormulaIf-Input": {
            /** Condition */
            condition: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Input"] | components["schemas"]["WorkbookFormulaComparison-Input"] | components["schemas"]["WorkbookFormulaIf-Input"] | components["schemas"]["WorkbookFormulaRound-Input"] | components["schemas"]["WorkbookFormulaFunction-Input"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "if";
            /** When False */
            when_false: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Input"] | components["schemas"]["WorkbookFormulaComparison-Input"] | components["schemas"]["WorkbookFormulaIf-Input"] | components["schemas"]["WorkbookFormulaRound-Input"] | components["schemas"]["WorkbookFormulaFunction-Input"];
            /** When True */
            when_true: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Input"] | components["schemas"]["WorkbookFormulaComparison-Input"] | components["schemas"]["WorkbookFormulaIf-Input"] | components["schemas"]["WorkbookFormulaRound-Input"] | components["schemas"]["WorkbookFormulaFunction-Input"];
        };
        /** WorkbookFormulaIf */
        "WorkbookFormulaIf-Output": {
            /** Condition */
            condition: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Output"] | components["schemas"]["WorkbookFormulaComparison-Output"] | components["schemas"]["WorkbookFormulaIf-Output"] | components["schemas"]["WorkbookFormulaRound-Output"] | components["schemas"]["WorkbookFormulaFunction-Output"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "if";
            /** When False */
            when_false: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Output"] | components["schemas"]["WorkbookFormulaComparison-Output"] | components["schemas"]["WorkbookFormulaIf-Output"] | components["schemas"]["WorkbookFormulaRound-Output"] | components["schemas"]["WorkbookFormulaFunction-Output"];
            /** When True */
            when_true: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Output"] | components["schemas"]["WorkbookFormulaComparison-Output"] | components["schemas"]["WorkbookFormulaIf-Output"] | components["schemas"]["WorkbookFormulaRound-Output"] | components["schemas"]["WorkbookFormulaFunction-Output"];
        };
        /**
         * WorkbookFormulaOperator
         * @enum {string}
         */
        WorkbookFormulaOperator: "+" | "-" | "*" | "/";
        /** WorkbookFormulaPreviewRequest */
        WorkbookFormulaPreviewRequest: {
            /** Base Version */
            base_version: number;
            /** Formula */
            formula: components["schemas"]["WorkbookColumnFormula-Input"] | components["schemas"]["WorkbookLegacyColumnFormula"];
            /** Output Column Id */
            output_column_id?: string | null;
            output_type: components["schemas"]["WorkbookColumnDataType"];
            /** Sample Rows */
            sample_rows?: number[] | null;
        };
        /** WorkbookFormulaPreviewResponse */
        WorkbookFormulaPreviewResponse: {
            /** Errors */
            errors?: components["schemas"]["WorkbookErrorDetail"][];
            normalized_formula?: components["schemas"]["WorkbookColumnFormula-Output"] | null;
            /** Readable Expression */
            readable_expression?: string | null;
            /** Referenced Column Ids */
            referenced_column_ids?: string[];
            /** Results */
            results?: components["schemas"]["WorkbookFormulaPreviewResult"][];
            /** Valid */
            valid: boolean;
            /** Warnings */
            warnings?: components["schemas"]["WorkbookErrorDetail"][];
        };
        /** WorkbookFormulaPreviewResult */
        WorkbookFormulaPreviewResult: {
            /** Error Code */
            error_code?: string | null;
            /** Error Message */
            error_message?: string | null;
            /** Row Number */
            row_number: number;
            /** Value */
            value?: number | null;
        };
        /** WorkbookFormulaRound */
        "WorkbookFormulaRound-Input": {
            /** Digits */
            digits: number;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "round";
            /** Value */
            value: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Input"] | components["schemas"]["WorkbookFormulaComparison-Input"] | components["schemas"]["WorkbookFormulaIf-Input"] | components["schemas"]["WorkbookFormulaRound-Input"] | components["schemas"]["WorkbookFormulaFunction-Input"];
        };
        /** WorkbookFormulaRound */
        "WorkbookFormulaRound-Output": {
            /** Digits */
            digits: number;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "round";
            /** Value */
            value: components["schemas"]["WorkbookFormulaConstant"] | components["schemas"]["WorkbookFormulaColumnReference"] | components["schemas"]["WorkbookFormulaBinary-Output"] | components["schemas"]["WorkbookFormulaComparison-Output"] | components["schemas"]["WorkbookFormulaIf-Output"] | components["schemas"]["WorkbookFormulaRound-Output"] | components["schemas"]["WorkbookFormulaFunction-Output"];
        };
        /** WorkbookLegacyColumnFormula */
        WorkbookLegacyColumnFormula: {
            /** Left Column Id */
            left_column_id: string;
            operator: components["schemas"]["WorkbookLegacyFormulaOperator"];
            /** Right Column Id */
            right_column_id: string;
        };
        /**
         * WorkbookLegacyFormulaOperator
         * @enum {string}
         */
        WorkbookLegacyFormulaOperator: "+" | "-" | "*" | "/" | "%";
        /**
         * WorkbookMappingStatus
         * @enum {string}
         */
        WorkbookMappingStatus: "READY" | "MAPPING_INCOMPLETE" | "AMBIGUOUS_MAPPING";
        /** WorkbookPagination */
        WorkbookPagination: {
            /** Page */
            page: number;
            /** Page Size */
            page_size: number;
            /** Total */
            total: number;
            /** Total Pages */
            total_pages: number;
        };
        /** WorkbookPriceChange */
        WorkbookPriceChange: {
            /** Row Number */
            row_number: number;
            values: components["schemas"]["WorkbookPriceChangeValues"];
        };
        /**
         * WorkbookPriceChangeValues
         * @description Generic cell values with legacy semantic price keys still accepted.
         */
        WorkbookPriceChangeValues: {
            /** Net Price */
            net_price?: string | number | boolean | null;
            /** Selling Price */
            selling_price?: string | number | boolean | null;
        } & {
            [key: string]: string | number | boolean | null;
        };
        /** WorkbookRecordColumn */
        WorkbookRecordColumn: {
            /** @default text */
            data_type: components["schemas"]["WorkbookColumnDataType"];
            /** Editable */
            editable: boolean;
            /** Field */
            field: string;
            formula?: components["schemas"]["WorkbookColumnFormula-Output"] | null;
            /** Group Label */
            group_label?: string | null;
            /**
             * Header Row Span
             * @default 1
             */
            header_row_span: number;
            /**
             * Hidden
             * @default false
             */
            hidden: boolean;
            /**
             * Id
             * @default legacy
             */
            id: string;
            /** Label */
            label: string;
            /** Number Format */
            number_format?: string | null;
            /** @default source */
            origin: components["schemas"]["WorkbookColumnOrigin"];
            semantic_field?: components["schemas"]["WorkbookSemanticField"] | null;
            /**
             * Sticky
             * @default false
             */
            sticky: boolean;
        };
        /** WorkbookRecordItem */
        WorkbookRecordItem: {
            /** Editable */
            editable: {
                [key: string]: boolean;
            };
            /** Row Number */
            row_number: number;
            /** Values */
            values: {
                [key: string]: string | number | boolean | null;
            };
        };
        /** WorkbookRecordsPage */
        WorkbookRecordsPage: {
            /** Columns */
            columns: components["schemas"]["WorkbookRecordColumn"][];
            /**
             * Header Row Count
             * @default 1
             */
            header_row_count: number;
            /** Items */
            items: components["schemas"]["WorkbookRecordItem"][];
            pagination: components["schemas"]["WorkbookPagination"];
            /**
             * Session Id
             * Format: uuid
             */
            session_id: string;
            /** Sheet Name */
            sheet_name: string;
            /** Version */
            version: number;
        };
        /** WorkbookRemoveColumnRequest */
        WorkbookRemoveColumnRequest: {
            /** Base Version */
            base_version: number;
        };
        /** WorkbookSaveRequest */
        WorkbookSaveRequest: {
            /** Base Version */
            base_version: number;
            /** Changes */
            changes: components["schemas"]["WorkbookPriceChange"][];
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
        };
        /** WorkbookSaveResponse */
        WorkbookSaveResponse: {
            /** Changed Cells */
            changed_cells: number;
            /** Current Version */
            current_version: number;
            /**
             * Operation Id
             * Format: uuid
             */
            operation_id: string;
            /** Previous Version */
            previous_version: number;
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /**
             * Saved At
             * Format: date-time
             */
            saved_at: string;
        };
        /**
         * WorkbookSemanticField
         * @enum {string}
         */
        WorkbookSemanticField: "passenger_name" | "pnr" | "ticket_number" | "net_price" | "selling_price";
        /** WorkbookSessionCreateRequest */
        WorkbookSessionCreateRequest: {
            /** Header Row Number */
            header_row_number: number;
            /** Sheet Name */
            sheet_name: string;
            /**
             * Workbook Id
             * Format: uuid
             */
            workbook_id: string;
        };
        /** WorkbookSessionListResponse */
        WorkbookSessionListResponse: {
            /** Items */
            items: components["schemas"]["WorkbookSessionSummary"][];
            pagination: components["schemas"]["WorkbookPagination"];
        };
        /** WorkbookSessionRenameRequest */
        WorkbookSessionRenameRequest: {
            /** Display Name */
            display_name: string;
        };
        /** WorkbookSessionResponse */
        WorkbookSessionResponse: {
            /** Column Config */
            column_config?: components["schemas"]["WorkbookColumnConfiguration"][];
            /** Column Mapping */
            column_mapping: {
                [key: string]: number;
            };
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Current Version */
            current_version: number;
            /** Header Row Number */
            header_row_number: number;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Original Filename */
            original_filename: string;
            /** Selected Sheet Name */
            selected_sheet_name: string;
            status: components["schemas"]["WorkbookSessionStatus"];
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /**
             * Workbook Id
             * Format: uuid
             */
            workbook_id: string;
        };
        /**
         * WorkbookSessionStatus
         * @description Lifecycle state of an independent workbook editing branch.
         * @enum {string}
         */
        WorkbookSessionStatus: "DRAFT" | "COMPLETED" | "DISCARDED" | "FAILED";
        /** WorkbookSessionSummary */
        WorkbookSessionSummary: {
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Current Version */
            current_version: number;
            /** Display Name */
            display_name: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Original Filename */
            original_filename: string;
            /** Selected Sheet Name */
            selected_sheet_name: string;
            status: components["schemas"]["WorkbookSessionStatus"];
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** WorkbookSuccessResponse[WorkbookCellValueLookupResponse] */
        WorkbookSuccessResponse_WorkbookCellValueLookupResponse_: {
            data: components["schemas"]["WorkbookCellValueLookupResponse"];
            /** Error */
            error?: null;
            /**
             * Success
             * @default true
             * @constant
             */
            success: true;
        };
        /** WorkbookSuccessResponse[WorkbookFormulaPreviewResponse] */
        WorkbookSuccessResponse_WorkbookFormulaPreviewResponse_: {
            data: components["schemas"]["WorkbookFormulaPreviewResponse"];
            /** Error */
            error?: null;
            /**
             * Success
             * @default true
             * @constant
             */
            success: true;
        };
        /** WorkbookSuccessResponse[WorkbookRecordsPage] */
        WorkbookSuccessResponse_WorkbookRecordsPage_: {
            data: components["schemas"]["WorkbookRecordsPage"];
            /** Error */
            error?: null;
            /**
             * Success
             * @default true
             * @constant
             */
            success: true;
        };
        /** WorkbookSuccessResponse[WorkbookSaveResponse] */
        WorkbookSuccessResponse_WorkbookSaveResponse_: {
            data: components["schemas"]["WorkbookSaveResponse"];
            /** Error */
            error?: null;
            /**
             * Success
             * @default true
             * @constant
             */
            success: true;
        };
        /** WorkbookSuccessResponse[WorkbookSessionListResponse] */
        WorkbookSuccessResponse_WorkbookSessionListResponse_: {
            data: components["schemas"]["WorkbookSessionListResponse"];
            /** Error */
            error?: null;
            /**
             * Success
             * @default true
             * @constant
             */
            success: true;
        };
        /** WorkbookSuccessResponse[WorkbookSessionResponse] */
        WorkbookSuccessResponse_WorkbookSessionResponse_: {
            data: components["schemas"]["WorkbookSessionResponse"];
            /** Error */
            error?: null;
            /**
             * Success
             * @default true
             * @constant
             */
            success: true;
        };
        /** WorkbookSuccessResponse[WorkbookSessionSummary] */
        WorkbookSuccessResponse_WorkbookSessionSummary_: {
            data: components["schemas"]["WorkbookSessionSummary"];
            /** Error */
            error?: null;
            /**
             * Success
             * @default true
             * @constant
             */
            success: true;
        };
        /** WorkbookSuccessResponse[WorkbookUploadResponse] */
        WorkbookSuccessResponse_WorkbookUploadResponse_: {
            data: components["schemas"]["WorkbookUploadResponse"];
            /** Error */
            error?: null;
            /**
             * Success
             * @default true
             * @constant
             */
            success: true;
        };
        /** WorkbookUpdateColumnRequest */
        WorkbookUpdateColumnRequest: {
            /** Base Version */
            base_version: number;
            data_type?: components["schemas"]["WorkbookColumnDataType"] | null;
            /** Formula */
            formula?: components["schemas"]["WorkbookColumnFormula-Input"] | components["schemas"]["WorkbookLegacyColumnFormula"] | null;
            /** Label */
            label?: string | null;
        };
        /** WorkbookUploadResponse */
        WorkbookUploadResponse: {
            /** Checksum */
            checksum: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** File Size */
            file_size: number;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Mime Type */
            mime_type: string;
            /** Original Filename */
            original_filename: string;
            /** Sheet Count */
            sheet_count: number;
            /** Sheets */
            sheets: components["schemas"]["WorksheetInspectionResponse"][];
        };
        /**
         * WorkbookVariadicFunction
         * @enum {string}
         */
        WorkbookVariadicFunction: "SUM" | "MIN" | "MAX";
        /** WorksheetHeaderCandidateResponse */
        WorksheetHeaderCandidateResponse: {
            /** Ambiguous Fields */
            ambiguous_fields: {
                [key: string]: number[];
            };
            /** Column Mapping */
            column_mapping: {
                [key: string]: number;
            };
            /** Detected Headers */
            detected_headers: string[];
            mapping_status: components["schemas"]["WorkbookMappingStatus"];
            /** Missing Required Fields */
            missing_required_fields: components["schemas"]["WorkbookSemanticField"][];
            /** Row Number */
            row_number: number;
        };
        /** WorksheetInspectionResponse */
        WorksheetInspectionResponse: {
            /** Ambiguous Fields */
            ambiguous_fields: {
                [key: string]: number[];
            };
            /** Column Mapping */
            column_mapping: {
                [key: string]: number;
            };
            /** Detected Headers */
            detected_headers: string[];
            /** Header Candidates */
            header_candidates?: components["schemas"]["WorksheetHeaderCandidateResponse"][];
            /** Header Row Number */
            header_row_number?: number | null;
            mapping_status: components["schemas"]["WorkbookMappingStatus"];
            /** Max Column */
            max_column: number;
            /** Max Row */
            max_row: number;
            /** Missing Required Fields */
            missing_required_fields: components["schemas"]["WorkbookSemanticField"][];
            /** Name */
            name: string;
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
    login_with_internal_access_code_api_v1_auth_internal_login_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InternalLoginRequest"];
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
    list_editing_sessions_route_api_v1_workbooks_sessions_get: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
                search?: string | null;
                status?: components["schemas"]["WorkbookSessionStatus"] | null;
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
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookSessionListResponse_"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    create_editing_session_route_api_v1_workbooks_sessions_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkbookSessionCreateRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookSessionResponse_"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    get_editing_session_route_api_v1_workbooks_sessions__session_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
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
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookSessionResponse_"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    discard_editing_session_route_api_v1_workbooks_sessions__session_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
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
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookSessionSummary_"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    rename_editing_session_route_api_v1_workbooks_sessions__session_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkbookSessionRenameRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookSessionSummary_"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    lookup_session_cell_values_route_api_v1_workbooks_sessions__session_id__cell_values_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkbookCellValueLookupRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookCellValueLookupResponse_"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    update_session_column_configuration_route_api_v1_workbooks_sessions__session_id__column_configuration_patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkbookColumnConfigurationRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookSessionResponse_"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    add_session_column_route_api_v1_workbooks_sessions__session_id__columns_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkbookAddColumnRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookSessionResponse_"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    update_session_column_route_api_v1_workbooks_sessions__session_id__columns__column_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                column_id: string;
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkbookUpdateColumnRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookSessionResponse_"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    remove_session_column_route_api_v1_workbooks_sessions__session_id__columns__column_id__remove_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                column_id: string;
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkbookRemoveColumnRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookSessionResponse_"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    download_current_workbook_route_api_v1_workbooks_sessions__session_id__download_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Current immutable workbook version. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": string;
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    preview_session_formula_route_api_v1_workbooks_sessions__session_id__formulas_preview_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkbookFormulaPreviewRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookFormulaPreviewResponse_"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    read_session_records_route_api_v1_workbooks_sessions__session_id__records_get: {
        parameters: {
            query?: {
                page?: number;
                page_size?: number;
                search?: string | null;
                sort_by?: string | null;
                sort_direction?: components["schemas"]["SortDirection"];
            };
            header?: never;
            path: {
                session_id: string;
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
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookRecordsPage_"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    save_session_changes_route_api_v1_workbooks_sessions__session_id__saves_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkbookSaveRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookSaveResponse_"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    get_latest_editing_session_route_api_v1_workbooks_sessions_latest_get: {
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
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookSessionResponse_"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
        };
    };
    upload_workbook_route_api_v1_workbooks_uploads_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_upload_workbook_route_api_v1_workbooks_uploads_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookSuccessResponse_WorkbookUploadResponse_"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
                };
            };
            /** @description Workbook domain error or request validation error. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"] | components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkbookErrorResponse"];
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
