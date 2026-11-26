# Context budget

- **Context fill:** tokens in window ÷ window (200k). Shown as % in band.
- **Est. cost:** estimate, not a bill. `/clear` keeps it.
- **Token budget:** counts context added this session from zero after `/clear` or new session. Re-arms after re-crossing.
- **Auto-compaction:** triggers once per crossing of `autoCompactAt`; re-arms when context drops below threshold, including after `/clear`.
- **Rebase:** first reading after compaction or `/clear` is a baseline, never counted as growth, spike, or spend.
