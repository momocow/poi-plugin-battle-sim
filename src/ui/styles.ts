/** Panel styles: one top-down column that fits poi's narrow plugin area (400px) without sideways scrolling. */
export const PANEL_CSS = `
.battle-sim { display: flex; flex-direction: column; gap: 8px; padding: 8px; min-width: 0; overflow-x: hidden; }
.battle-sim * { box-sizing: border-box; }
.battle-sim-muted { opacity: 0.65; }
.battle-sim-controls, .battle-sim-control-row { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
.battle-sim-controls { flex-direction: column; align-items: stretch; }
.battle-sim-trials { width: 7em; }
.battle-sim-status { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.battle-sim-section-head { display: flex; gap: 6px; align-items: center; cursor: pointer; user-select: none; }
.battle-sim-fleet-summary { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 4px 0; }
.battle-sim-hover { text-decoration: underline dotted; cursor: help; }
.battle-sim-popover { padding: 8px 10px; }
.battle-sim-ships { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px 16px; margin-top: 8px; }
.battle-sim-ship { min-width: 0; }
.battle-sim-ship-name { font-size: 1.25em; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.battle-sim-ship-detail { display: flex; justify-content: space-around; gap: 8px; margin-bottom: 2px; }
.battle-sim-slots { min-width: 0; }
.battle-sim-slot { display: flex; gap: 4px; align-items: center; min-width: 0; line-height: 24px; }
.battle-sim-ex-mark { flex: none; width: 0.8em; text-align: center; }
.battle-sim-slot-icon { width: 22px; height: 22px; flex: none; }
.battle-sim-slot-name-target { display: flex; min-width: 0; }
.battle-sim-slot-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.battle-sim-star { color: #45a9a5; flex: none; }
.battle-sim-alv { height: 16px; flex: none; }
.battle-sim-summary { display: flex; flex-direction: column; gap: 2px; }
.battle-sim-kv { display: flex; justify-content: space-between; gap: 8px; }
.battle-sim-table { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.battle-sim-row { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; text-align: right; }
.battle-sim-header { font-size: 11px; opacity: 0.8; }
.battle-sim-header .battle-sim-cell { overflow-wrap: anywhere; }
.battle-sim-route-text { overflow-wrap: anywhere; font-weight: bold; }
.battle-sim-span { grid-column: 2 / span 6; text-align: left; }
.battle-sim-error pre {
  white-space: pre-wrap; overflow-wrap: anywhere; max-height: 240px; overflow-y: auto;
  /* Follow the theme's text colour; the global pre style is dark-on-grey in both themes. */
  color: inherit; background: rgba(128, 128, 128, 0.15); box-shadow: none;
  border: 1px solid rgba(128, 128, 128, 0.35); border-radius: 3px; padding: 6px 8px; margin: 4px 0;
}
`
