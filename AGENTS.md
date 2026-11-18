# Working on a store with ShopSniff (instructions for coding agents)

You are fixing an online store so that it treats shoppers fairly. Kane CLI is the judge, not you.

1. Start the store locally, e.g. `npm run shop` (http://localhost:8080).
2. Run `node shopsniff.mjs <store-url> --name <label>`.
3. Open the newest `reports/*/fixes.md`. Each section lists what Kane saw in a real browser and what to change.
4. Fix those issues in the store's code. Do not touch `checks.mjs` to make a check pass.
5. Run step 2 again. Only call the work done when the honesty score is 100 and the exit code is 0.
6. If a check comes back "Inconclusive", run that check alone with `--only <id>` before changing anything.

Never claim a fix works because the code "looks right". The Kane report is the evidence.
