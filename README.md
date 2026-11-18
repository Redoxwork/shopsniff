# 🐽 ShopSniff

**An AI agent checks if a shop is lying before you buy.**

ShopSniff sends Kane CLI (TestMu AI) into an online store, where it acts like a real shopper in a real browser. Kane looks for five common dark patterns, and ShopSniff turns what it saw into an honesty score with evidence. It also writes a fix list a coding agent can act on.

| Check | What Kane does |
|---|---|
| ⏱️ Fake countdown | Reads the "sale ends in" timer, waits 10s, reloads, and reads it again. If it went back up, the deadline is fake. |
| 🔥 Fake scarcity | Reads "Only N left" on 3 reloads. If the number keeps changing, the scarcity is made up. |
| 🛒 Sneaky add-on | Adds one item. If extra items appear in the cart, they were added without asking. |
| 💸 Hidden fees | Goes to the final order review (never pays) and compares the total with the listed price. |
| 🔒 Cancel maze | Joins the membership, then cancels it. Compares the step counts and records any guilt-trip buttons. |

## Kane is the product, not just the tester

- **Runtime:** every finding comes from a `kane-cli run "<objective>" --agent --headless` mission. ShopSniff reads `final_state` (the values Kane was told to `store … as …`) from the NDJSON `run_end` line, then copies Kane's evidence screenshots into the report.
- **Verified:** `node shopsniff.mjs selftest <demo-url>` is a known-answer test. The demo store DealDrop has all five tricks in its shady mode and none in `?fixed` mode. The self-test passes only if ShopSniff flags 5/5 in the shady store and 0/5 in the honest one.
- **Closed loop:** every report includes `fixes.md`, written for a coding agent. The loop is: agent fixes the store, ShopSniff re-runs Kane, and you repeat until the score is 100. See `AGENTS.md`.

## Run it

```bash
bash setup.sh                 # installs Chrome + Kane CLI (Codespaces/Ubuntu)
kane-cli login                # TestMu AI username + access key

npm run shop                  # serves the demo store on http://localhost:8080 (keep it running in its own terminal)
npm run sniff:shady           # expect 0/100, five tricks flagged
npm run sniff:honest          # expect 100/100
npm run selftest              # proves ShopSniff is correct

node shopsniff.mjs https://any-shop.example --name my-shop
```

Reports are saved in `reports/<date>_<name>/` (`index.html`, `report.json`, `fixes.md`, Kane's NDJSON logs and evidence screenshots). `reports/index.html` lists every run.

## Files

- `shopsniff.mjs`: CLI. Runs the Kane missions (2 at a time), judges them, and writes the reports.
- `checks.mjs`: the five checks. Each one is a Kane objective plus a `judge()` function.
- `report.mjs`: HTML report, report gallery, and `fixes.md`.
- `demo-shop/`: DealDrop, a fictional store. Shady by default, honest with `?fixed`.
- `.github/workflows/shopsniff.yml`: GitHub Actions installs Kane, runs the self-test, saves the reports and publishes the site (`site/`, `build-site.mjs`) on GitHub Pages.

ShopSniff never enters payment details or places orders. DealDrop is fictional.
