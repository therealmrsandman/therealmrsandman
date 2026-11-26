### Hi there 👋

- 🌱 I’m currently learning the very basics of coding. This is a sideproject of mine which I've decided to explore a bit more.
- 🤔 There's a real possibility that I'll be looking for help with understanding programming languages mainly so any tips are welcome!
- 
**therealmrsandman/therealmrsandman** is a ✨ _special_ ✨ repository because its `README.md` (this file) appears on your GitHub profile.

Here are some ideas to get you started:

- 🔭 I’m currently working on ...
- 🌱 I’m currently learning ...
- 👯 I’m looking to collaborate on ...
- 🤔 I’m looking for help with ...
- 💬 Ask me about ...
- 📫 How to reach me: ...
- 😄 Pronouns: ...
- ⚡ Fun fact: ...
-->

## Plugins

### token-efficiency-routing
Keeps Claude's context to the minimum a task needs, and shows you the savings.

- **Always on:** core rules, your saved next step and lessons load at every session start.
- **Automatic memory recall:** each prompt pulls in only the matching lines from `.claude/memory.md`.
- **Memory save prompt:** after a substantial task, Claude is asked once to save decisions, facts and lessons.
- **Model routing:** `extractor` (Haiku), `worker` (Sonnet) and `reasoner` (Opus) agents return compact JSON.
- **`/token-report`:** tokens used, cache hit rate, and how often memory answered a prompt.

```bash
/plugin marketplace add therealmrsandman/therealmrsandman
/plugin install token-efficiency-routing@therealmrsandman
```

Requires `python3`. Commit `.claude/memory.md` to share memory; add `.claude/token-efficiency-stats.json` to `.gitignore`.
