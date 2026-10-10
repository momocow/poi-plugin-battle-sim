One npm package per platform, each holding only the optimizer binary for that
platform (design D6). The plugin lists them as `optionalDependencies` at its
own exact version, so poi's npm installs just the one matching the machine.

`bin/` is filled by `npm run fetch-optimizer` from the release pinned in
`../optimizer.json` and is never committed. To add a platform once its release
asset exists: add its entry under `assets` in `optimizer.json`, add
`platforms/<platform>-<arch>/package.json` (with `os`/`cpu`), and add it to
`optionalDependencies`; the fetch script refuses to run while those disagree.

Publishing, after `npm run fetch-optimizer`: each `npm publish ./platforms/<key>` (the `./` matters: without it npm reads `platforms/<key>` as a GitHub repo)
first, then `npm publish` for the main package, all at the same version.
