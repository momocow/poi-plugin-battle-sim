/**
 * Panel styles: one top-down column that fits poi's narrow plugin area (400px)
 * without sideways scrolling. poi gives the plugin a bounded height (a
 * `height:100%` flex-column card, or a `height:100%` tabpane in its own
 * window); the panel fills it exactly, every section but the route list keeps
 * its natural height, and only the route list scrolls, so the footer stays at
 * the bottom.
 */
export const PANEL_CSS = `
/* poi's wrappers scroll on overflow; this pane never overflows, so keep their scrollbar away. */
.poi-app-tabpane:has(> .bp6-card > .battle-sim), .poi-app-tabpane:has(> .battle-sim), .bp6-card:has(> .battle-sim) { overflow: hidden; }
.battle-sim { display: flex; flex-direction: column; height: 100%; flex: 1 1 auto; min-height: 0; min-width: 0; overflow: hidden; }
.battle-sim * { box-sizing: border-box; }
.battle-sim-section { flex: none; padding: 6px 8px; border-bottom: 1px solid rgba(128, 128, 128, 0.3); }
.battle-sim-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; gap: 10px; padding: 8px; }
.battle-sim-muted { opacity: 0.65; }
/*
 * The controls: wrapping rows — fleet, map and phase; then the branch choices,
 * on maps that have them; then the target and node settings, once the
 * map's topology is cached; then the action bar, Reset at its left and the
 * run controls at its right. The mode tag and the run controls float
 * right; everything else keeps to the left.
 */
.battle-sim-controls { flex: none; display: flex; flex-direction: column; gap: 6px; padding: 8px 8px 6px; border-bottom: 1px solid rgba(128, 128, 128, 0.3); }
.battle-sim-control-row { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
/* Label text centered on its select, also inside a tooltip's wrapper, so "能動分歧" and "F →" line up. */
.battle-sim-control-row > .bp6-popover-target, .battle-sim-target > .bp6-popover-target, .battle-sim-run > .bp6-popover-target { display: flex; align-items: center; }
/* Target and Node settings wrap as one, so neither is left alone on a line. */
.battle-sim-target { display: inline-flex; flex-wrap: nowrap; align-items: center; gap: 10px; }
/* No bottom margin from poi's global label style or Blueprint's control style, which would lift them above the row's plain text. */
.battle-sim-controls label:not(.bp6-control) { display: inline-flex; align-items: center; gap: 4px; margin: 0; }
.battle-sim-controls .bp6-switch { margin: 0; }
/* The controls' buttons and dropdowns are 24px, 20% under Blueprint's 30px, as Blueprint's small size. */
.battle-sim-controls .bp6-button { min-height: 24px; height: 24px; padding-top: 0; padding-bottom: 0; }
.battle-sim-controls .bp6-html-select select { height: 24px; line-height: 24px; }
.battle-sim-controls .bp6-html-select .bp6-icon { top: 4px; }
.battle-sim-float-right { margin-left: auto; }
.battle-sim-actions { flex-wrap: nowrap; }
.battle-sim-run { display: flex; align-items: center; gap: 8px; }
.battle-sim-reset .bp6-button:disabled { pointer-events: none; }
/* Auto paused for an empty main slot: the checked track in Blueprint's warning orange, as it styles primary (same in both themes). */
.battle-sim-run .battle-sim-auto-paused.bp6-control.bp6-switch input:checked ~ .bp6-control-indicator { background: #c87619; }
.battle-sim-run .battle-sim-auto-paused.bp6-control.bp6-switch:hover input:checked ~ .bp6-control-indicator { background: #935610; }
.battle-sim-run .battle-sim-auto-paused.bp6-control.bp6-switch input:checked:not(:disabled):active ~ .bp6-control-indicator { background: #77450d; }
.battle-sim-run .battle-sim-auto-paused.bp6-control.bp6-switch input:checked:disabled ~ .bp6-control-indicator { background: rgba(200, 118, 25, 0.5); }
.battle-sim-run-label { display: grid; }
.battle-sim-run-label > * { grid-area: 1 / 1; }
.battle-sim-hidden { visibility: hidden; }
/* A branch already taken in a sortie: its tooltip's target carries the not-allowed cursor. */
.battle-sim-decided { cursor: not-allowed; }
.battle-sim-decided select, .battle-sim-decided .bp6-control { pointer-events: none; }
/* The mode tag (plan or sortie), floating right on the fleet row. */
.battle-sim-mode { font-weight: bold; }
/* Capped, so a long map name does not crowd out the other inputs. */
.battle-sim-map-select { max-width: 9em; }
.battle-sim-map-select select { min-width: 0; width: 100%; text-overflow: ellipsis; }
/* Capped, so a long fleet name does not push the mode tag onto a line of its own. */
.battle-sim-fleet-select { max-width: 9em; }
.battle-sim-fleet-select select { min-width: 0; width: 100%; text-overflow: ellipsis; }
/* A disabled select gets no mouse events, so it lets the pointer through to its tooltip's target. */
.battle-sim-named select:disabled { pointer-events: none; }
/*
 * The status sits at the right of the footer, the result line taking the rest;
 * the normal-map fetch marker, when there is one, comes last, at the far right.
 * When short of room the progress bar narrows, then the fetch note ends in "…".
 */
.battle-sim-status { display: flex; flex: 0 1 auto; max-width: 50%; gap: 6px; align-items: center; justify-content: flex-end; min-width: 0; overflow: hidden; white-space: nowrap; }
.battle-sim-status > * { flex: none; }
.battle-sim-status > .battle-sim-progress { flex: 0 1 64px; min-width: 24px; }
.battle-sim-status > .battle-sim-status-note { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.battle-sim-result { display: flex; flex-direction: column; gap: 8px; }
.battle-sim-stale { opacity: 0.5; }
.battle-sim-footer { flex: none; display: flex; gap: 8px; align-items: center; min-height: 26px; padding: 4px 8px; font-size: 12px; border-top: 1px solid rgba(128, 128, 128, 0.3); }
.battle-sim-footer-result { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.battle-sim-footer-marker { margin-left: 6px; vertical-align: -1px; }
.battle-sim-map-fetch { flex: none; margin-left: auto; display: inline-flex; align-items: center; }
/* Opened against the panel's right edge, the tooltip would otherwise break "1 / 22" apart. */
.battle-sim-map-fetch-tip { white-space: nowrap; }
.battle-sim-map-fetch-failed { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 8px 10px; font-size: 12px; }
.battle-sim-section-head { display: flex; gap: 6px; align-items: center; cursor: pointer; user-select: none; }
.battle-sim-fleet-summary { display: flex; flex-wrap: wrap; gap: 2px 12px; margin: 2px 0; }
.battle-sim-hover { text-decoration: underline dotted; cursor: help; }
.battle-sim-popover { padding: 8px 10px; }
/* The Node settings popup: one row per battle node, scrolling on large maps; a setting the user chose is in bold. */
.battle-sim-node-settings { max-height: 60vh; overflow-y: auto; padding: 6px 8px; font-size: 12px; }
.battle-sim-node-settings table { border-collapse: collapse; margin-bottom: 4px; }
.battle-sim-node-settings th, .battle-sim-node-settings td { padding: 2px 6px; text-align: left; vertical-align: middle; white-space: nowrap; }
.battle-sim-node-settings thead th { font-weight: normal; opacity: 0.65; }
.battle-sim-node-settings .bp6-html-select select { height: 24px; line-height: 24px; }
.battle-sim-node-settings .bp6-html-select .bp6-icon { top: 4px; }
.battle-sim-setting-set select { font-weight: bold; }
.battle-sim-formation-note { font-size: 11px; color: #d9822b; }
/* One grid for all ships, so name, HP and equipment line up from row to row. */
.battle-sim-ships { display: grid; grid-template-columns: minmax(80px, 1fr) minmax(80px, 1fr) 30px auto; align-items: end; gap: 4px 10px; margin-top: 4px; }
.battle-sim-ship { display: contents; }
.battle-sim-ship-info { min-width: 0; }
.battle-sim-ship-sub { font-size: 11px; line-height: 1.2; opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.battle-sim-ship-name { font-size: 1.15em; font-weight: bold; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.battle-sim-ship-hp-target { min-width: 0; padding-right: 0.9em; }
.battle-sim-ship-hp-line { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 1px; line-height: 1.2; }
/* Fuel over ammo, as poi's fleet tab: 7px bars 4px apart, level with the HP bar. */
.battle-sim-supply { display: flex; flex-direction: column; gap: 4px; padding-bottom: 1px; }
.battle-sim-supply .bp6-progress-bar { height: 7px; }
.battle-sim-supply-tip { display: flex; gap: 4px; align-items: center; }
.battle-sim-slots { display: flex; align-items: center; gap: 2px; min-width: 0; padding-bottom: 1px; }
.battle-sim-ex-mark { flex: none; opacity: 0.65; }
.battle-sim-slot-icon { width: 24px; height: 24px; flex: none; display: block; }
.battle-sim-slot-tip { display: flex; gap: 6px; align-items: center; }
.battle-sim-star { color: #45a9a5; flex: none; }
.battle-sim-alv { height: 16px; flex: none; }
.battle-sim-warning { color: #c87619; }
.bp6-dark .battle-sim-warning { color: #f0b726; }
/* Rank colours from Blueprint's palette, a lighter shade in the dark theme. */
.battle-sim-rank-s { color: #c87619; }
.battle-sim-rank-a { color: #238551; }
.battle-sim-rank-b { color: #2d72d2; }
.bp6-dark .battle-sim-rank-s { color: #fbd065; }
.bp6-dark .battle-sim-rank-a { color: #72ca9b; }
.bp6-dark .battle-sim-rank-b { color: #8abbff; }
.battle-sim-summary { display: flex; flex-direction: column; gap: 2px; }
.battle-sim-summary-ranks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 6px; text-align: center; }
.battle-sim-summary-rank { min-width: 0; font-size: 11px; }
.battle-sim-big { font-size: 22px; font-weight: bold; line-height: 1.2; }
.battle-sim-summary-extra { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px 24px; }
.battle-sim-cards { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.battle-sim-cards-head { display: flex; justify-content: flex-end; gap: 8px; font-size: 11px; }
/* Route probability and reach boss | route stepper | boss results. */
.battle-sim-card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 3px; min-width: 0; }
.battle-sim-card-left { display: grid; grid-template-columns: auto auto; gap: 0 6px; font-size: 11px; line-height: 1.3; text-align: right; white-space: nowrap; }
.battle-sim-card-left > :nth-child(odd) { text-align: left; opacity: 0.65; }
.battle-sim-card-results { display: grid; grid-template-columns: auto auto; gap: 0 6px; font-size: 11px; line-height: 1.3; text-align: right; }
.battle-sim-card-results > :nth-child(odd) { text-align: left; }
.battle-sim-card-results-note { font-size: 11px; white-space: nowrap; }
/* The results and, while pending, their note share one cell. */
.battle-sim-card-results-area { display: grid; align-items: center; justify-items: center; }
.battle-sim-card-results-area > * { grid-area: 1 / 1; }
.battle-sim-card-results-sizer { grid-column: 2; height: 0; overflow: hidden; visibility: hidden; }
.battle-sim-hidden { visibility: hidden; }
/* Stepper: circles spread over a track; a retreat rate hangs under its node. */
/* Equal room above and below the circles keeps them on the card's centre line, level with the probability. */
.battle-sim-steps { position: relative; display: flex; justify-content: space-between; gap: 2px; min-width: 0; padding: 15px 0; }
.battle-sim-steps::before { content: ''; position: absolute; left: 10px; right: 10px; top: calc(50% - 1.5px); height: 3px; border-radius: 2px; background: rgba(128, 128, 128, 0.35); }
.battle-sim-step { position: relative; flex: none; width: 21px; }
.battle-sim-step-node { width: 21px; height: 21px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #fff; background: #2d72d2; position: relative; }
.battle-sim-step-boss { background: #cd4246; }
/* A node target: marked like the boss, in another colour. */
.battle-sim-step-target { background: #c87619; }
.battle-sim-card-off .battle-sim-step-node { background: #8f99a8; }
/* Nodes the fleet has already passed mid-sortie: hollow, so the nodes still ahead stand out. */
.battle-sim-step-passed .battle-sim-step-node { background: transparent; color: #8f99a8; box-shadow: inset 0 0 0 2px #8f99a8; }
.battle-sim-step-retreat { position: absolute; top: 23px; left: 50%; transform: translateX(-50%); font-size: 10px; white-space: nowrap; color: #cd4246; }
.bp6-dark .battle-sim-step-retreat { color: #fa999c; }
.battle-sim-steps-two { padding: 28px 0; }
.battle-sim-step-low { top: 36px; }
/* A node's tooltip: its type, then label | value rows. */
.battle-sim-node-tip { display: grid; grid-template-columns: auto auto; gap: 0 10px; font-size: 11px; line-height: 1.4; white-space: nowrap; }
.battle-sim-node-tip > :nth-child(odd) { opacity: 0.75; }
.battle-sim-node-tip > :nth-child(even) { text-align: right; }
.battle-sim-node-tip-type { font-size: 11px; font-weight: bold; line-height: 1.4; white-space: nowrap; }
.battle-sim-error pre {
  white-space: pre-wrap; overflow-wrap: anywhere; max-height: 240px; overflow-y: auto;
  /* Follow the theme's text colour; the global pre style is dark-on-grey in both themes. */
  color: inherit; background: rgba(128, 128, 128, 0.15); box-shadow: none;
  border: 1px solid rgba(128, 128, 128, 0.35); border-radius: 3px; padding: 6px 8px; margin: 4px 0;
}
`
