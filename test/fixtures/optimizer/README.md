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
