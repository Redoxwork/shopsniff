# ShopSniff fix list — selftest-shady

URL: http://localhost:8080/
Honesty score: 0/100 (F)

You are a coding agent working on this store. Kane CLI found these dark patterns in a real browser.
Fix each one in the store's code, then re-run `node shopsniff.mjs http://localhost:8080/` and repeat until the score is 100.

## 1. Fake countdown timer

- **What Kane saw:** The timer showed Sale ends in 14:42, then 14:46 after waiting 10s and reloading. It restarted, so the deadline isn't real.
- **Fix:** Count the countdown down to a real, fixed end date stored on the server. It must never restart on reload.
- **Evidence:** `{"url":"http://localhost:8080/","timer_first":"Sale ends in 14:42","timer_after_reload":"14:46"}`

## 2. Sneaky add-on in cart

- **What Kane saw:** Added only "AirWave Pro Earbuds", but the cart had 2 items: ShieldPlus Protection Plan was added without asking.
- **Fix:** Never add extras (protection plans, insurance, donations) by default. Offer them as an unticked option.
- **Evidence:** `{"url":"http://localhost:8080/#/cart","product_name":"AirWave Pro Earbuds","cart_items":"AirWave Pro Earbuds | ShieldPlus Protection Plan","cart_line_count":"2"}`

## 3. Hidden fees at checkout

- **What Kane saw:** Listed at $49.00, but the final total was $56.49 (+$7.49: Service & handling). The extra cost only appeared on the last step.
- **Fix:** Show every mandatory fee in the price on the product page. No surprise charges at the final step.
- **Evidence:** `{"url":"http://localhost:8080/#/review","listed_price":"$49.00","final_total":"$56.49","extra_fees":"Service & handling"}`

## 4. Hard-to-cancel subscription

- **What Kane saw:** Joining took 2 steps, cancelling took 11. One button guilt-tripped: “No thanks, I hate saving money”.
- **Fix:** Make cancelling as easy as joining: one clearly labelled "Cancel membership" button and one confirmation. No guilt-trip wording, no required survey.
- **Evidence:** `{"url":"http://localhost:8080/#/cancelled","cancel_confirmation":"Your DealDrop Club membership is cancelled.","guilt_text":"none","form_required":"false","join_clicks":["Clicking the DealDrop Club membership link in the top navigation","Clicking Join Club subscription button"],"cancel_clicks":["Clicking Manage in My account link","Clicking Membership settings in the account area","Clicking I want to stop my membership","Clicking No thanks, I hate saving money","Clicking Decline offer and continue","Type \"test\" into \"Your reason…\"","Click \"Continue\"","Type \"This is a simple test reason.\" into \"Your reason…\"","Clicking Continue to confirm membership cancellation","Entering CANCEL in the membership cancellation confirmation box","Clicking Confirm cancellation"]}`
