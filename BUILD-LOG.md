# How Kane and the coding agent built ShopSniff together

ShopSniff was built with Claude as the coding agent. Every change was verified by Kane CLI running in GitHub Actions on each push. The agent read Kane's NDJSON output (the `run_end` result, `final_state` and step remarks), found the problem, and pushed a fix. Then Kane ran again.

| Run | What Kane reported | What the agent changed | Commit |
|---|---|---|---|
| 1 | No run: the Kane secrets were missing. | Added the secrets and the Pages setup. | `8fd8e35` |
| 2 | Shady store: 5/5 tricks caught. Honest store: 2 runs ended with an empty `final_state`. One said *"browser page was closed while the system was trying to take a screenshot"*. The other said Kane could not save a click count it was asked to make. | ShopSniff now retries a Kane run that ends without evidence, and marks it **inconclusive** instead of "not present". | `301e10f` |
| 3 | The cancel check failed on both stores: *"the test could not read its recorded click history"*. Kane can't report its own clicks. | ShopSniff stopped asking Kane to count. It now counts Kane's own `click:`/`type:` actions from the NDJSON stream and splits them into the join flow and the cancel flow. | `4f0774d` |
| 4 | Cancel check correct (shady store: join 2, cancel 9; honest store: join 2, cancel 3). But the shady store's stock check **passed**. The step remarks showed Kane read the page once and stored the same value three times without reloading. | The timer and stock missions now require fresh page loads. ShopSniff also counts `navigate` steps in Kane's log and refuses to judge if the reloads didn't happen. | `ad4d28e` |
| 5 | **Self-test 5/5.** Shady store 0/100, honest store 100/100. | — | green ✅ |

What we learned: Kane is the evidence, and ShopSniff never trusts a value Kane didn't actually observe. Each Kane run also links to its TestMu Test Manager page, where you can see the full run.
