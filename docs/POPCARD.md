# PopCard

Previewing a card does not write data. Generating creates a pending credit request and routes to `/popcard/:id`. The card shows the original amount, fictional merchant and customer, description, status and due date. A QR opens the card link, and **Download PNG** renders a local copy with the QR and fiction disclosure.

The share URL has a path request ID and a fragment `#card=…`. The fragment contains a bounded base64url JSON tuple:
`[version, requestId, revision, merchantId, seededCustomerIndex, demoPaise, dueDate]`.
It omits the free-text description, current outstanding balance and repayment history. Merchant and customer strings come from a known fictional catalog. The decoder bounds the input before parsing and validates its version, types, amounts, calendar date and the match between the path and payload IDs.

An existing request with a matching revision resolves to the current local ledger. An ID-only URL can open a local request, including seeded examples. Other installations and resets show an independent, read-only snapshot. A version or format error has a recovery screen. Snapshots are untrusted display data, not signed documents, and importing one never creates or posts credit. Fragments are not included in normal HTTP requests, but can be seen by anyone with the link; share only fictional demo data.
