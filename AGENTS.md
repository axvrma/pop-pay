# PopPay

PopPay is a Vite, React and TypeScript app deployed as one static Netlify site. Use Node.js 24. The demo runs in the browser with no runtime credentials or external services.

Business records live in IndexedDB. Route financial changes through the typed commands in `src/core/ledger.ts` and the transaction in `src/core/storage.ts`. Store amounts as integer paise and derive balances from the ledger. Keep demo content fictional.

Run `npm run check` before handing off changes. It validates lint, unit tests, the static build, and browser behavior.
