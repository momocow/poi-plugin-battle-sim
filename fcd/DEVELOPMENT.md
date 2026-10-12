Maintaining `poi-plugin-battle-sim-data`. This file is not published; the package's `files` list leaves it out.

## Refreshing the kcnav snapshot

From the repo root, with the optimizer binary from `platforms/<platform>/bin/`,
one map at a time and never in parallel (kcnav blocks clients that go too fast):

```sh
kancolle-fleet-optimizer kcnav fetch --map 5-2 --all-nodes --force \
  --data-dir fcd/optimizer --kcnav-dir fcd/kcnav
# an event map, per variant
kancolle-fleet-optimizer kcnav fetch --map 62-3 --all-nodes --force \
  --difficulty 4 --min-gauge 2 --max-gauge 2 --min-gauge-level 1 --max-gauge-level 4800 \
  --data-dir fcd/optimizer --kcnav-dir fcd/kcnav
```

## Publishing

Bump `version` in `fcd/package.json`, then, from the repo root, `npm publish ./fcd`
(the `./` matters, as for the platform packages).
