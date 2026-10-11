`recorded-0.2.0/`: real `simulate --config - --json` output from optimizer
0.2.0 (branch `simulate-json-cli`, commit 921515d8), recorded by the optimizer
session. Each case is `<case>.stdout.ndjson`, `<case>.stderr.txt` and
`<case>.exit`; `input.toml` is the config used.

- `success`: warm kcnav cache, `--seed 1`; one WARN on stderr.
- `success-with-warnings`: empty kcnav dir, so the auto-fetch log appears.
- `runtime-error`: unknown key `trialz`; exit 1 with an `error` line.
- `usage-error`: `--bogus`; exit 2, empty stdout, message on stderr.

The two hand-written files cover what the real optimizer does not produce on
demand: `missing-terminal.json` (a `start` line and nothing else) and
`unknown-schema.json` (a future `schema: 2`). They use `{exitCode, stdout, stderr}`.

`recorded-0.2.1/`: real `simulate --config - --json --seed 1` output from
optimizer 0.2.1 (tag `v0.2.1`, commit 05c1017e, the darwin-arm64 release
binary), recorded against a warm kcnav cache. Same file layout as
`recorded-0.2.0/`.

- `success`: 5-2 `B-C-E-F-O` from `input.toml`. In 0.2.1, B is a pass-through
  node and C an air raid, so `_meta.route` has a null `battle_index` at B.
- `pass-through-2-3`: 2-3 `B-E-F-J-N` from `input-2-3.toml`; B is an empty
  node, which 0.2.0 rejected with "no enemy comp".

The 0.2.0 `success` recording has no `_meta.route`, so it now stands for an
optimizer that is too old.

`recorded-0.3.0/`: real `simulate --config - --json --seed 1` output from
optimizer 0.3.0 (tag `v0.3.0`, the darwin-arm64 release binary), recorded
against a warm kcnav cache. Same file layout as `recorded-0.2.0/`.

- `node-target-5-2`: 5-2 `B-C-E` from `input-node-target.toml`, a route cut
  before the boss O, with `fields = ["ranks", "ranks-per-node",
  "node-outcomes"]` and `do_night_battle = true` at E. The route has no boss,
  so the `ranks` channel's boss fields are all 0; E is battle index 1 in
  `ranks_per_node`, `node_outcomes` and `per_node_reach`.
- `no-battle-5-2`: 5-2 `B` from `input-no-battle.toml`, cut at the
  pass-through node B. The optimizer rejects it at load, exit 1, with an
  `error` line: a `[tactics.nodes.B]` table on a node without a battle has
  nothing to act on. So a no-battle target never reaches the result's null
  `battle_index`.
