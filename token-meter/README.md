# token-meter

A tiny Claude Code widget that keeps your token usage in view so you can keep it to a minimum.

It adds one line above the prompt:

```
█████░░░░░ 48%  ctx 96k/200k  +6.2k last turn  ~$0.84 est.  five-hour limit 23%
```

- **Context bar**: how full the context window is (green, then yellow from 60%, red from 85%).
- **ctx**: tokens in use / window size.
- **+N last turn**: how much your last message grew the context, so expensive turns stand out.
- **~$ est.**: estimated session cost (an estimate, not your bill).
- **top:**: the three tool calls whose results were biggest in the current turn (≈ chars ÷ 4), so you can see what to read in smaller ranges.
- **limit**: your fullest rate-limit window (five-hour or seven-day).
- A short `ctx 48% · 96k` entry in the status line.

At 50%, 70% and 85% it shows a one-time toast suggesting `/compact` or `/clear`, the two biggest token savers.
**Spike alert:** when a single turn adds more than 15% of the window, a toast names the jump and the biggest tool call behind it.
**Budget:** `/meter budget $5` (dollars, by est. cost) or `/meter budget 500k` (context tokens added this session) sets a ceiling. The band shows `budget N% of …`, the bar turns red from 80%, and a toast fires once at 80% and once at 100%. The budget is saved in the plugin's store and applies to new sessions too; `/meter budget off` clears it, `/meter budget` shows it. A token budget counts from zero again after `/clear` or in a new session, and warns again when re-crossed; a dollar budget follows est. cost, which `/clear` keeps.
**Report:** `/meter report` prints a short, copy-pasteable summary: peak context, context now, est. cost, number of compactions, the three biggest turns (with the tool behind each), and budget use if one is set. `/clear` and a new session start it over.
**Compaction:** the first reading after a compaction or `/clear` is a fresh baseline, so the drop is never counted as a turn, a spike or spend.
**Surfaces:** the band is one row and is tested on the terminal, desktop app, VS Code and mobile app. On a narrow surface it drops the least important parts (limit, then top tools, then cost) so it still fits on one line.
**Auto-compaction (off by default):** the meter only nudges you to `/compact` by default. To let it compact for you, set the plugin option `autoCompactAt` (in `/config`, or `pluginConfigs["token-meter"].options.autoCompactAt` in settings.json) to a context % such as `80`. Once a turn ends with context at or above that %, token-meter runs a compaction (once per crossing) and toasts that it did. `0` (the default) leaves it off.
Type `/meter` to hide or show the bar; any other argument besides `report` or `budget` prints usage. The meter itself makes no model calls, so it costs no tokens; only auto-compaction runs a (billed) compaction.
It also bundles a `token-thrift` skill that keeps Claude's own replies, searches and noisy command output (test runs, builds, CI logs) lean and tells you when to `/compact` or `/clear`.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install token-meter --marketplace therealmrsandman/therealmrsandman
```

From a shell:

```bash
claude plugin install token-meter --marketplace therealmrsandman/therealmrsandman
```

In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `therealmrsandman/therealmrsandman`, then **Add plugin**.

Answer `y` to add the marketplace, then pick a scope (user scope = every session).

## Icon

`.claude-plugin/icon.png` is a placeholder (512 px, a meter bar on a dark tile). Replace it with the final square PNG (512–2048 px, under 2 MB) before submitting to the plugin directory: the directory takes the icon only on the first submission, so a later change won't update the listing.

## License

MIT. See [LICENSE](LICENSE).
