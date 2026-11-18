# ShopSniff fix list — selftest-shady

URL: http://localhost:8080/
Honesty score: 25/100 (D)

You are a coding agent working on this store. Kane CLI found these dark patterns in a real browser.
Fix each one in the store's code, then re-run `node shopsniff.mjs http://localhost:8080/` and repeat until the score is 100.

## 1. Sneaky add-on in cart

- **What Kane saw:** Added only "AirWave Pro Earbuds", but the cart had 2 items: ShieldPlus Protection Plan was added without asking.
- **Fix:** Never add extras (protection plans, insurance, donations) by default. Offer them as an unticked option.
- **Evidence:** `{"url":"http://localhost:8080/#/cart","product_name":"AirWave Pro Earbuds","cart_items":"AirWave Pro Earbuds | ShieldPlus Protection Plan","cart_line_count":"2"}`

## 2. Hidden fees at checkout

- **What Kane saw:** Listed at $49.00, but the final total was $56.49 (+$7.49: Service & handling). The extra cost only appeared on the last step.
- **Fix:** Show every mandatory fee in the price on the product page. No surprise charges at the final step.
- **Evidence:** `{"url":"http://localhost:8080/#/review","listed_price":"$49.00","final_total":"$56.49","extra_fees":"Service & handling"}`

## 3. Hard-to-cancel subscription

- **What Kane saw:** Joining took 2 steps, cancelling took 9. One button guilt-tripped: “No thanks, I hate saving money to confirm cancellation”.
- **Fix:** Make cancelling as easy as joining: one clearly labelled "Cancel membership" button and one confirmation. No guilt-trip wording, no required survey.
- **Evidence:** `{"url":"http://localhost:8080/#/cancelled","join_confirmation":"You're a Club member.","cancel_confirmation":"Your DealDrop Club membership is cancelled.","guilt_text":"none","join_clicks":["Clicking DealDrop Club in the navigation header","Clicking Join Club — $12.99/mo"],"cancel_clicks":["Clicking Manage in My account to cancel the membership","Clicking Membership settings","Clicking I want to stop my membership to cancel the membership","Clicking No thanks, I hate saving money to confirm cancellation","Clicking Decline offer and continue to cancel the membership","Type \"Simple test cancellation\" into \"Your reason…\"","Click \"Continue\"","Type \"CANCEL\" into \"textbox\"","Click \"Confirm cancellation\""]}`
