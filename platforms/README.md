One npm package per platform, each holding only the optimizer binary for that
platform (design D6). The plugin lists them as `optionalDependencies` at its
own exact version, so poi's npm installs just the one matching the machine.

`bin/` is filled by `npm run fetch-optimizer` from the release pinned in
`../optimizer.json` and is never committed. To add a platform once its release
asset exists: add its entry under `assets` in `optimizer.json`, add
`platforms/<platform>-<arch>/package.json` (with `os`/`cpu`), and add it to
`optionalDependencies`; the fetch script refuses to run while those disagree.

Releasing is `npm run release -- <x.y.z> [--notes <file>] [--dry-run]`
(`scripts/release.mjs`): it bumps the main and every platform package
together, publishes each `./platforms/<key>` first (the `./` matters: without
it npm reads `platforms/<key>` as a GitHub repo), refreshes the lockfile,
commits `🔖 Release <x.y.z>` with its `v<x.y.z>` tag, publishes the main
package and pushes.
