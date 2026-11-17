# Netlify deployment

Use Node.js 24 and commit the npm lockfile. The Netlify config sets build command `npm run build`, publish directory `dist`, and a 200 rewrite from `/*` to `/index.html`. Existing static assets take precedence over the rewrite. Netlify does not need a functions folder, environment secrets, database or payment integration.

```sh
npm ci
npm run build
node scripts/serve-static.mjs
```

The local verification server serves the built files and applies the repo's rewrite and headers. It is for testing only. Try refreshing `/customers/kirana-c1` and `/credit/kirana-open-1`, then verify `/popcard/kirana-pending-1` and `/story`. Confirm security headers on an SPA route and immutable cache headers on a hashed asset. The shell and worker revalidate; the worker installs a versioned bundle, waits for old clients to close before replacing an earlier worker and deletes older PopPay caches on activation. After precaching succeeds, test a reload offline.

When publication is authorized, connect the repository to one Netlify site. Confirm the intended production branch, the config above, and the preview smoke checks before assigning **poppay.axvrma.com**. Configure domain and HTTPS in Netlify, then repeat the smoke journey against the deployed origin. No live deployment or DNS change is required for local verification.

References: [Vite static deployment](https://vite.dev/guide/static-deploy) · [Netlify SPA rewrites](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/).
