# Security and privacy

PopPay is a simulation. It collects no real payment credential or UPI PIN, contacts no payment gateway or credit service, and contains no authentication or production API secrets. No server receives the demo ledger. Use fictional information only.

Netlify serves a same-origin Content Security Policy for scripts, styles, fonts and fetches; frames, embedded objects, camera, microphone, geolocation and payment APIs are blocked. The app uses text rendering, strict schemas for saved data and commands, and bounded, versioned PopCard fragments. Cross-browser card data is rendered read-only and never trusted as a write. Outbound repository and portfolio links use opener protection. CSV fields are quoted, with spreadsheet formula prefixes neutralized. PNG and reports have explicit fictional labels.

Credit changes require validated operations against IDs. IndexedDB transactions are atomic and idempotent, and receipts are drawn from committed entries. Users with control of their browser can clear or alter their own data. The role switcher is presentation only. There is no server backup and there are no claims of regulatory certification, official credit scoring or encrypted sharing.

Review the installed package tree with `npm audit` at release time and keep the lockfile in source control. Automated accessibility, finance and deployment checks run via `npm run check`.
