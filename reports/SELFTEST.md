# ShopSniff self-test

Ran 2026-11-18T18:28:15.887Z against http://localhost:8080/

ShopSniff must flag every trick in the shady store **and** give the honest store a clean bill.

| Check | Shady store | Honest store | OK |
|---|---|---|---|
| Fake countdown timer | fail (want fail) | pass (want pass) | ✅ |
| Fake "only N left" stock | unknown (want fail) | pass (want pass) | ❌ |
| Sneaky add-on in cart | fail (want fail) | pass (want pass) | ✅ |
| Hidden fees at checkout | fail (want fail) | pass (want pass) | ✅ |
| Hard-to-cancel subscription | fail (want fail) | pass (want pass) | ✅ |

**4/5 checks behave correctly.** Shady score 0/100, honest score 100/100.
