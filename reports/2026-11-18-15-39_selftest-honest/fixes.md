# ShopSniff fix list — selftest-honest

URL: http://localhost:8080/?fixed
Honesty score: 80/100 (B)

You are a coding agent working on this store. Kane CLI found these dark patterns in a real browser.
Fix each one in the store's code, then re-run `node shopsniff.mjs http://localhost:8080/?fixed` and repeat until the score is 100.

## 1. Fake "only N left" stock

- **What Kane saw:** Nobody bought anything, but the stock count changed between reloads: 12 → 8 → 30. The scarcity is made up.
- **Fix:** Show the real inventory number from your database, or drop the scarcity message.
- **Evidence:** `{"url":"http://localhost:8080/?fixed","stock_1":"12 in stock","stock_2":"8 in stock","stock_3":"30 in stock"}`
