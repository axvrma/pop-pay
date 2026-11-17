# Data model

- **Snapshot**: seed anchor (Indian business date), installation/reset revision, three merchants.
- **Merchant workspace**: stable ID, fictional name, category and city, plus customer, request, ledger, operation and follow-up records.
- **Customer**: scoped ID, fictional name, relationship start and maximum outstanding demo credit in paise. No contact details.
- **Request**: scoped ID, customer ID, amount in paise, purpose, due date, creator perspective, state and optional decision time.
- **Ledger entry**: unique posting ID, request ID, entry kind (issue or repayment), amount in paise, timestamp and source.
- **Operation**: idempotency key, validated command fingerprint and result resource ID.
- **Follow-up**: note or saved reminder draft, associated customer and timestamp. Template overrides are scoped to each merchant.

Open accounts, statements, notifications and the relationship indicator are projections of these records. They do not store a separate money balance. A PopCard is a request presentation; a demo receipt is a verified ledger posting and the balance immediately after it.

Dexie schema v2 adds the snapshot revision to legacy v1 records. The revision distinguishes storage installations and invalidates open operations after a reset. Zod validates the document shape; reconciliation checks linked IDs, timestamps, issue entries and caps on repayments. A corrupt document is reported and can be replaced only through an explicit reset.
