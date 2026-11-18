# ShopSniff fix list — selftest-shady

URL: http://localhost:8080/
Honesty score: 0/100 (F)

You are a coding agent working on this store. Kane CLI found these dark patterns in a real browser.
Fix each one in the store's code, then re-run `node shopsniff.mjs http://localhost:8080/` and repeat until the score is 100.

## 1. Fake countdown timer

- **What Kane saw:** The timer showed Sale ends in 14:43, then 14:49 after waiting 10s and reloading. It restarted, so the deadline isn't real.
- **Fix:** Count the countdown down to a real, fixed end date stored on the server. It must never restart on reload.
- **Evidence:** `{"url":"http://localhost:8080/","timer_first":"Sale ends in 14:43","timer_after_reload":"14:49"}`

## 2. Fake "only N left" stock

- **What Kane saw:** Nobody bought anything, but the stock count changed between reloads: 4 → 5 → 2. The scarcity is made up.
- **Fix:** Show the real inventory number from your database, or drop the scarcity message.
- **Evidence:** `{"url":"http://localhost:8080/","stock_1":"Only 4 left","stock_2":"Only 5 left","stock_3":"Only 2 left — 23 people viewing!"}`

## 3. Sneaky add-on in cart

- **What Kane saw:** Added only "AirWave Pro Earbuds", but the cart had 2 items: ShieldPlus Protection Plan was added without asking.
- **Fix:** Never add extras (protection plans, insurance, donations) by default. Offer them as an unticked option.
- **Evidence:** `{"url":"http://localhost:8080/#/cart","product_name":"AirWave Pro Earbuds","cart_items":"AirWave Pro Earbuds | ShieldPlus Protection Plan","cart_line_count":"2"}`

## 4. Hidden fees at checkout

- **What Kane saw:** Listed at $49.00, but the final total was $56.49 (+$7.49: Service & handling). The extra cost only appeared on the last step.
- **Fix:** Show every mandatory fee in the price on the product page. No surprise charges at the final step.
- **Evidence:** `{"url":"http://localhost:8080/#/review","listed_price":"$49.00","final_total":"$56.49","extra_fees":"Service & handling"}`

## 5. Hard-to-cancel subscription

- **What Kane saw:** Joining took 2 steps, cancelling took 9. One button guilt-tripped: “No thanks, I hate saving money”.
- **Fix:** Make cancelling as easy as joining: one clearly labelled "Cancel membership" button and one confirmation. No guilt-trip wording, no required survey.
- **Evidence:** `{"url":"http://localhost:8080/#/cancelled","cancel_confirmation":"Your DealDrop Club membership is cancelled.","cancel_confirmation_2":"Your DealDrop Club membership is cancelled.","guilt_tripping_button_present":"false","join_clicks":["Clicking the DealDrop Club link in the header navigation","Clicking Join Club — $12.99/mo to join the membership"],"cancel_clicks":["Clicking Manage in My account link in the account area","Clicking Membership settings in your account area","Clicking I want to stop my membership to cancel the membership","Clicking No thanks, I hate saving money","Clicking Decline offer and continue to keep going with cancellation","Type \"Simple test cancellation reason.\" into \"Your reason…\"","Click \"Continue\"","Type \"CANCEL\" into \"textbox\"","Click \"Confirm cancellation\""]}`
