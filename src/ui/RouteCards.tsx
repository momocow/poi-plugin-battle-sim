/**
 * One card per route, most promising first (see `sortForCards`), in three
 * columns: the route's probability and its reach-boss rate over all its
 * trials; the route as a stepper, one circle per node with the boss marked,
 * the nodes already passed mid-sortie dimmed, and, under each node ahead where
 * trials turned back, its retreat rate; and the
 * boss results among trials that reached the boss.
 */
import React, { useLayoutEffect, useRef, useState } from 'react'

import { t } from '../i18n'
import type { RouteRow } from './state'
import { formatRoute, pct, retreats, routeReach, rowCells, sortForCards, type RateCells } from './views'

/** Circle size, and the room a retreat label like "−14.7%" needs between two node centres. */
const NODE_PX = 21
const LABEL_PX = 44

/** Distance between neighbouring node centres, following the stepper's width. */
function useNodeSpacing(nodeCount: number): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [spacing, setSpacing] = useState(Infinity)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || nodeCount < 2) return undefined
    const measure = () => setSpacing((el.clientWidth - NODE_PX) / (nodeCount - 1))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [nodeCount])
  return [ref, spacing]
}

function Stepper({ route }: { route: RouteRow }) {
  const nodes = route.nodes.slice(1)
  const [ref, spacing] = useNodeSpacing(nodes.length)
  const turnedBack = new Map(route.diag ? retreats(routeReach(route.diag)).map((r) => [r.node, r.rate]) : [])
  // Only when nodes sit too close for side-by-side labels: in a run of them, every other one drops a line.
  const lowered = nodes.map(() => false)
  if (spacing < LABEL_PX) {
    nodes.forEach((node, i) => {
      lowered[i] = i > 0 && turnedBack.has(node) && turnedBack.has(nodes[i - 1]!) && !lowered[i - 1]
    })
  }
  const twoLines = lowered.some(Boolean)
  return (
    <div
      ref={ref}
      className={twoLines ? 'battle-sim-steps battle-sim-steps-two' : 'battle-sim-steps'}
      title={formatRoute(route.nodes, route.reachesBoss)}
    >
      {nodes.map((node, i) => {
        const boss = route.reachesBoss && i === nodes.length - 1
        // Passed mid-sortie: not simulated, so no retreat rate.
        const passed = i + 1 < (route.from ?? 1)
        const retreat = passed ? undefined : turnedBack.get(node)
        return (
          <div key={i} className={passed ? 'battle-sim-step battle-sim-step-passed' : 'battle-sim-step'}>
            <div className={boss ? 'battle-sim-step-node battle-sim-step-boss' : 'battle-sim-step-node'}>{node}</div>
            {retreat !== undefined && (
              <div className={lowered[i] ? 'battle-sim-step-retreat battle-sim-step-low' : 'battle-sim-step-retreat'}>
                −{pct(retreat)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** The boss results; without cells, an invisible stand-in of the same size. */
function Results({ cells }: { cells: RateCells | undefined }) {
  return (
    <div
      className={cells ? 'battle-sim-card-results' : 'battle-sim-card-results battle-sim-hidden'}
      title={t('When the boss is reached')}
    >
      <span className="battle-sim-rank-s">S</span>
      <span className="battle-sim-rank-s">{pct(cells?.sAtBoss)}</span>
      <span className="battle-sim-rank-a">A+</span>
      <span className="battle-sim-rank-a">{pct(cells?.aPlusAtBoss)}</span>
      <span className="battle-sim-rank-b">B+</span>
      <span className="battle-sim-rank-b">{pct(cells?.bPlusAtBoss)}</span>
      <span>{t('Sunk')}</span>
      <span>{pct(cells?.bossSunkAtBoss)}</span>
      {/* Holds the value column at its widest, 100.0%, so cards line up whatever their rates. */}
      <span className="battle-sim-card-results-sizer">{pct(1)}</span>
    </div>
  )
}

function RouteCard({ route }: { route: RouteRow }) {
  const cells = rowCells(route)
  return (
    <div className={route.reachesBoss ? 'battle-sim-card' : 'battle-sim-card battle-sim-card-off'}>
      <div className="battle-sim-card-left">
        <span>{t('Route')}</span>
        <strong>{pct(route.probability)}</strong>
        <span>{t('Reach boss')}</span>
        <span>{cells.kind === 'done' ? pct(cells.reachBoss) : '—'}</span>
      </div>
      <Stepper route={route} />
      {cells.kind === 'not-simulated' ? (
        <div className="battle-sim-card-results-note battle-sim-muted">
          <span title={t('Not simulated (does not reach the boss)')}>{t('Not simulated')}</span>
        </div>
      ) : (
        // A pending card keeps the results' room, hidden under its note, so finishing does not move anything.
        <div className="battle-sim-card-results-area">
          <Results cells={cells.kind === 'done' ? cells : undefined} />
          {cells.kind === 'pending' && (
            <div className="battle-sim-card-results-note battle-sim-muted">{t('Simulating…')}</div>
          )}
        </div>
      )}
    </div>
  )
}

export function RouteCards({ routes }: { routes: RouteRow[] }) {
  return (
    <div className="battle-sim-cards">
      {routes.length > 0 && (
        <div className="battle-sim-cards-head battle-sim-muted">
          <span>{t('When the boss is reached')}</span>
        </div>
      )}
      {sortForCards(routes).map((route) => (
        <RouteCard key={route.nodes.join('-')} route={route} />
      ))}
    </div>
  )
}
