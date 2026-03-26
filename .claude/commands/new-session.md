Read the following files to build context before any work begins:

1. `CLAUDE.md` — project instructions and architecture
2. `BUILD_LOG.md` — recent changes and changelog
3. `docs/` — any files in the docs directory (especially product/demo context)
4. `src/main.jsx` — current route definitions
5. `package.json` — dependencies and scripts

After reading, print a **5-line current state summary** in this format:

```
## Session Context
1. **Stack:** [framework, key deps, deploy target]
2. **Last changes:** [summarize most recent BUILD_LOG entries]
3. **Demo status:** [which demo scenarios exist, any known issues]
4. **Routes:** [list active routes and their status]
5. **Action items:** [any open TODOs, bugs, or next steps from BUILD_LOG]
```

Do NOT start any edits or fixes — this is a read-only orientation step. Wait for the user to give a task after the summary.
