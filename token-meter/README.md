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
- **limit**: your fullest rate-limit window (five-hour or seven-day).
- A short `ctx 48% · 96k` entry in the status line.

At 50%, 70% and 85% it shows a one-time toast suggesting `/compact` or `/clear`, the two biggest token savers.
Type `/meter` to hide or show the bar. It makes no model calls, so it costs no tokens.

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
