# poi-plugin-battle-sim

A [poi](https://github.com/poooi/poi) plugin that estimates how a fleet will do on a map. It predicts the routes the fleet can take with [compass](https://x-20a.github.io/compass/), then runs a Monte Carlo battle simulation of every route that reaches the boss with [kancolle-fleet-optimizer](https://github.com/momocow/kancolle-fleet-optimizer).

## Using it

1. Pick a fleet (1–4) and a normal map (worlds 1–7). If the map has branches or phases you choose, pick them as well.
2. Pick the number of trials: Quick (500), Normal (2000), Precise (10000), or Custom.
3. Click **Simulate**, or just edit the fleet (see [Automatic runs](#automatic-runs)).

A run captures a snapshot of the fleet, predicts the routes, and simulates each route that reaches the boss. The summary shows the odds of an S, A-or-better, and B-or-better win per sortie, the chance of reaching the boss, and the boss-sunk rate, all weighted by route probability. Below them, one card per route shows its probability, its nodes, and its result. When you change the inputs after a run, the result is dimmed until you run again.

The panel text is in English, Japanese, and Traditional Chinese. Ship, equipment, and map names follow poi's language setting.

### Automatic runs

A run starts by itself when one of these changes:

- the selected fleet;
- ships in the selected fleet (added, removed, moved, swapped, or remodeled);
- equipment on those ships (equipped, removed, moved, or improved);
- the selected map;
- a branch or phase choice;
- the trial count.

This only happens when every ship in the fleet has all of its main slots filled. The expansion slot doesn't count, and the fleet doesn't need to be full. HP, morale, level, and proficiency changes don't start a run, so coming back from a sortie doesn't either. The run starts once things stop changing for a moment, so typing a custom trial count starts just one run. If the fleet changes while a run is going, that run is cancelled and a new one starts. Turn this off with the **Auto** switch next to **Simulate**; the setting is remembered.

### Limitations

- Combined fleets aren't supported yet (see `openspec/changes/add-combined-fleet-support`).
- Event maps aren't offered.
- The bundled optimizer binary is currently built for macOS on Apple silicon (`darwin-arm64`) only.
- Route prediction needs network access to compass. The first run on a map also downloads that map's enemy data.

## Development

```sh
npm install
npm run typecheck
npm test            # vitest
npm run build       # tsc → dist/
```

**Using a local optimizer build.** On poi's settings page for this plugin, set the optimizer binary path, and the data path if needed. You can also start poi from a shell with `BATTLE_SIM_OPTIMIZER_BIN` and `BATTLE_SIM_OPTIMIZER_DATA` set. The settings page wins over the environment variables, and the binary and data path always come from the same source.

**Test fixtures.** `test/fixtures/store.json` is a trimmed copy of poi's store. To refresh it from a running poi with `poi-plugin-nanodesu-mcp` installed, run `node scripts/capture-store.mjs [port]`. Recorded optimizer runs are kept under `test/fixtures/optimizer`.

**The optimizer release.** `optimizer.json` pins the optimizer version together with the SHA-256 of every archive and binary. `npm run fetch-optimizer` downloads that release with `gh` and checks it against the pins. It needs access to the optimizer repo, and it also runs as `prepublishOnly`. See [`platforms/README.md`](platforms/README.md) for the per-platform binary packages and the order to publish them in.

### Layout

| Path | What's there |
| --- | --- |
| `index.ts` | Plugin entry: the panel and settings page |
| `src/fleet/` | Reading poi's store into a frozen fleet snapshot; deck-builder and TOML converters |
| `src/routes/` | Route prediction through compass in a hidden webview; branch choices; boss nodes |
| `src/optimizer/` | Finding, running, and checking the optimizer; kcnav prefetch; combining results |
| `src/fleet-view/` | The fleet display (ships, HP, morale, equipment, summary row) |
| `src/ui/` | The panel: controls, run state and runner, summary, route cards, result footer |
| `i18n/` | en-US, ja-JP, and zh-TW strings |
| `openspec/` | Specs and change proposals (see below) |

## OpenSpec workflow

The plugin's behavior is written down in [OpenSpec](https://github.com/Fission-AI/OpenSpec) specs, and changes go through a proposal before any code is written. You need the `openspec` CLI (`openspec --version`).

```
openspec/
├── config.yaml            project context given to the AI when it writes artifacts
├── specs/<capability>/    current behavior, one spec per capability
│   └── spec.md
└── changes/
    ├── <change>/          proposed or in-progress changes
    └── archive/           finished changes, prefixed with their date
```

The current capabilities are `battle-simulation`, `fleet-capture`, `route-prediction`, and `simulator-panel`. Each spec is a list of requirements, and each requirement has `#### Scenario:` blocks written as **WHEN** / **THEN**.

### A change's files

A change directory holds:

- `proposal.md`: why the change is needed and what it changes;
- `design.md`: how it will be done, the decisions made, and anything still open;
- `specs/<capability>/spec.md`: a *delta* against the main spec, split into `## ADDED Requirements`, `## MODIFIED Requirements`, and `## REMOVED Requirements`. A modified requirement is written out in full, not as a diff;
- `tasks.md`: numbered checkbox tasks, ticked off as the work gets done.

### The flow

In Claude Code the steps are slash commands (`.claude/commands/opsx/`), each backed by a skill in `.claude/skills/`:

1. **Explore** (`/opsx:explore`, optional): think the idea through, read the code, and settle open questions. Nothing is written.
2. **Propose** (`/opsx:propose <idea>`): create `openspec/changes/<name>/` with the proposal, the delta specs, the design, and the tasks. Planning only; no code changes.
3. **Revise** (`/opsx:update`): fold new decisions into the change and keep its files consistent with each other. This never edits code.
4. **Apply** (`/opsx:apply <name>`): work through `tasks.md`, ticking tasks as they're done.
5. **Sync** (`/opsx:sync`, optional): merge the change's delta specs into `openspec/specs/` without archiving it.
6. **Archive** (`/opsx:archive <name>`): once all tasks are done, merge the delta specs into the main specs and move the change to `changes/archive/YYYY-MM-DD-<name>/`.

The CLI shows where things stand: `openspec list` for the open changes, `openspec status --change <name>` for a change's progress, and `openspec validate <name>` to check its format.

A small change whose code already exists can go straight into the main spec instead. The automatic-runs requirement in `simulator-panel` was added that way.

### Open changes

- `add-combined-fleet-support`: combined fleets (1+2) for capture, prediction, simulation, and the panel.
- `add-hensei-nikki-integration`: simulate fleets saved in the Hensei Nikki (編成日記) plugin, and save simulated fleets to it.
