# Netlify deployment

Use Node.js 24 and commit the npm lockfile. The Netlify config sets build command `npm run build`, publish directory `dist`, and a 200 rewrite from `/*` to `/index.html`. Existing static assets take precedence over the rewrite. Netlify does not need a functions folder, environment secrets, database or payment integration.

## Preview locally with Netlify CLI

With Node.js 24 and the Netlify CLI installed, run `npm ci` followed by `netlify serve --offline`. The CLI builds the static site and runs the SPA rewrite locally. Its preview server supplies its own cache headers. Verify production cache headers on a deployed preview URL. [Netlify CLI serve reference](https://cli.netlify.com/commands/serve/)

The repository also provides a preview server for automated tests and local checks without the CLI:

```sh
npm ci
npm run build
node scripts/serve-static.mjs
```

The local verification server serves the built files and applies the repo's rewrite and headers. It is for testing only. Try refreshing `/customers/kirana-c1` and `/credit/kirana-open-1`, then verify `/popcard/kirana-pending-1` and `/story`. Confirm security headers on an SPA route and immutable cache headers on a hashed asset. The shell and worker revalidate; the worker installs a versioned bundle, waits for old clients to close before replacing an earlier worker and deletes older PopPay caches on activation. After precaching succeeds, test a reload offline.

## Deploy from GitHub

1. In Netlify, choose **Add new project → Import an existing project**. Select GitHub and the `axvrma/pop-pay` repository. [Netlify repository import guide](https://docs.netlify.com/start/quickstarts/deploy-from-repository/)
2. Choose the branch containing this version of PopPay. Confirm the repository root as the base, `npm run build` as the build command and `dist` as the publish directory. These settings are read from `netlify.toml`.
3. Publish and run the smoke checks on the Netlify URL. Then assign **poppay.axvrma.com** under **Domain management → Production domains**, follow Netlify’s DNS and HTTPS instructions, and repeat the checks on the custom domain.

References: [Vite static deployment](https://vite.dev/guide/static-deploy) · [Netlify SPA rewrites](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/).
