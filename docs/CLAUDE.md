# Bay Buddy - Language & Semantic Policy (Vietnam Market)

This document is part of the Bay Buddy "Project DNA". It defines the mandatory language rules and semantic constraints for building Bay Buddy for the Vietnamese airline agency market.

## Language Policy (Mandatory)

System communication: English | Target Market: Vietnam | UI Labels: Vietnamese-first.

- **System communication**: English (all assistant responses, developer explanations, documentation, and code comments).
- **Target market**: Vietnam (implement all business logic according to Vietnamese market practices and applicable Vietnamese legal/compliance requirements).
- **UI labels**: Vietnamese-first (Vietnamese is the default locale; English is secondary).
- **Engineering identifiers**: English variable names and schema fields (e.g., `is_invoice_issued`), while UI values remain Vietnamese (e.g., "Đã xuất hóa đơn").

## Semantic Integrity (Vietnamese Business Context)

Bay Buddy must preserve Vietnamese domain terms with accounting/legal precision in both UI and business logic:

- **Công nợ**: Accounts Receivable (A/R) and customer debt tracking, aligned with Vietnamese accounting practice.
- **Nghị định 123 (Decree 123/2020/ND-CP)**: E-invoice formatting and compliance requirements (Hóa đơn điện tử).
- **Số tiền bằng chữ**: Required invoice output (total amount in Vietnamese words) for compliant document generation.
- **Báo có / Báo nợ**: Bank statement terminology for incoming (credit advice) and outgoing (debit advice) transaction records.

## Implementation Conventions

- Keep all code identifiers in English and consistent with `docs/DICTIONARY.md`.
- Keep UI strings Vietnamese-first via i18n keys (e.g., `t("...")`) with a Vietnamese primary translation and an English secondary translation.
- When writing documentation, define Vietnamese terms once (with an English explanation) and then keep the Vietnamese term intact for the rest of the document.
