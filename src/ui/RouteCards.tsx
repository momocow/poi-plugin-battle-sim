/**
 * One card per route, most promising first (see `sortForCards`), in three
 * columns: the route's probability and its reach-target rate over all its
 * trials; the route as a stepper, one circle per node with the boss or the
 * node target marked, the nodes already passed mid-sortie dimmed, and, under
 * each node ahead where trials turned back, its retreat rate; and the results
 * among trials that reached the target, A and B on their own or as A+ and B+
 * by the rank display. Labels name the run's target (`targetLabels`). Past
 * the target mid-sortie, the card shows the route up to it as passed and says
 * the target has been reached. On a finished card, each simulated node has a
 * tooltip: its type and reach rate, and for a battle node the formation fought in, the
 * special attack that can fire there, and S, A and B among the trials that
 * fought there.
 */
import { Tooltip } from '@blueprintjs/core'
import React, { useLayoutEffect, useRef, useState } from 'react'

import { t } from '../i18n'
import type { RankDisplay } from './inputs'
import type { RouteRow } from './state'
import {
  FORMATION_NAMES,
  formatRoute,
  nodeTooltip,
  pct,
  rankCells,
  retreats,
  routeReach,
  rowCells,
  sortForCards,
  SPECIAL_NAMES,
  targetLabels,
  type NodeTooltip,
  type RateCells,
} from './views'

type Labels = ReturnType<typeof targetLabels>

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

function NodeTooltipContent({ tip, mode }: { tip: NodeTooltip; mode: RankDisplay }) {
  const { info } = tip
  const special = info ? (info.special === null ? t('None') : t(SPECIAL_NAMES[info.special])) : '—'
  return (
    <div>
      <div className="battle-sim-node-tip-type">{tip.type ? t(tip.type) : '—'}</div>
      <div className="battle-sim-node-tip">
        <span>{t('Reach')}</span>
        <span>{pct(tip.reach)}</span>
        {/* A node without a battle has only its type and reach. */}
        {tip.battle && (
          <>
            <span>{t('Formation')}</span>
            <span>{info ? t(FORMATION_NAMES[info.formation]) : '—'}</span>
            <span>{t('Special attack')}</span>
            <span>{special}</span>
            {/* Uncoloured: the tooltip's background is the theme's opposite, so the card's rank colours would not read. */}
            {rankCells(tip.ranks, mode).map(({ label, value }) => (
              <React.Fragment key={label}>
                <span>{label}</span>
                <span>{pct(value)}</span>
              </React.Fragment>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function Stepper({ route, mode }: { route: RouteRow; mode: RankDisplay }) {
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
      title={formatRoute(route.nodes, route.endsAtBoss)}
    >
      {nodes.map((node, i) => {
        const last = i === nodes.length - 1
        const mark = last && route.endsAtBoss ? ' battle-sim-step-boss' : last && route.reachesTarget ? ' battle-sim-step-target' : ''
        // Passed mid-sortie: not simulated, so no retreat rate.
        const passed = i + 1 < (route.from ?? 1)
        const retreat = passed ? undefined : turnedBack.get(node)
        const tip = nodeTooltip(route, i)
        const circle = <div className={`battle-sim-step-node${mark}`}>{node}</div>
        return (
          <div key={i} className={passed ? 'battle-sim-step battle-sim-step-passed' : 'battle-sim-step'}>
            {tip ? (
              // An empty title keeps the stepper's route text from showing over the tooltip.
              <Tooltip content={<NodeTooltipContent tip={tip} mode={mode} />} placement="top" targetTagName="div" targetProps={{ title: '' }}>
                {circle}
              </Tooltip>
            ) : (
              circle
            )}
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

/** The results at the target; without cells, an invisible stand-in of the same size. */
function Results({ cells, mode, labels }: { cells: RateCells | undefined; mode: RankDisplay; labels: Labels }) {
  const plus = mode === 'cumulative' ? '+' : ''
  return (
    <div
      className={cells ? 'battle-sim-card-results' : 'battle-sim-card-results battle-sim-hidden'}
      title={labels.whenReached}
    >
      <span className="battle-sim-rank-s">S</span>
      <span className="battle-sim-rank-s">{pct(cells?.sAtTarget)}</span>
      <span className="battle-sim-rank-a">A{plus}</span>
      <span className="battle-sim-rank-a">{pct(cells?.aAtTarget)}</span>
      <span className="battle-sim-rank-b">B{plus}</span>
      <span className="battle-sim-rank-b">{pct(cells?.bAtTarget)}</span>
      <span title={labels.sunk}>{t('Sunk')}</span>
      <span>{pct(cells?.targetSunkAtTarget)}</span>
      {/* Holds the value column at its widest, 100.0%, so cards line up whatever their rates. */}
      <span className="battle-sim-card-results-sizer">{pct(1)}</span>
    </div>
  )
}

function RouteCard({ route, mode, labels }: { route: RouteRow; mode: RankDisplay; labels: Labels }) {
  const cells = rowCells(route, mode)
  return (
    <div className={route.reachesTarget ? 'battle-sim-card' : 'battle-sim-card battle-sim-card-off'}>
      <div className="battle-sim-card-left">
        <span>{t('Route')}</span>
        <strong>{pct(route.probability)}</strong>
        <span>{labels.reach}</span>
        <span>{cells.kind === 'done' ? pct(cells.reachTarget) : cells.kind === 'passed' ? pct(1) : '—'}</span>
      </div>
      <Stepper route={route} mode={mode} />
      {cells.kind === 'not-simulated' ? (
        <div className="battle-sim-card-results-note battle-sim-muted">
          <span title={labels.notSimulated}>{t('Not simulated')}</span>
        </div>
      ) : cells.kind === 'passed' ? (
        <div className="battle-sim-card-results-note battle-sim-muted">{t('Target reached')}</div>
      ) : (
        // A pending card keeps the results' room, hidden under its note, so finishing does not move anything.
        <div className="battle-sim-card-results-area">
          <Results cells={cells.kind === 'done' ? cells : undefined} mode={mode} labels={labels} />
          {cells.kind === 'pending' && (
            <div className="battle-sim-card-results-note battle-sim-muted">{t('Simulating…')}</div>
          )}
        </div>
      )}
    </div>
  )
}

/** `target` is the run's, undefined for the boss. */
export function RouteCards({
  routes,
  mode,
  target,
}: {
  routes: RouteRow[]
  mode: RankDisplay
  target: string | undefined
}) {
  const labels = targetLabels(target)
  return (
    <div className="battle-sim-cards">
      {routes.length > 0 && (
        <div className="battle-sim-cards-head battle-sim-muted">
          <span>{labels.whenReached}</span>
        </div>
      )}
      {sortForCards(routes).map((route) => (
        <RouteCard key={route.nodes.join('-')} route={route} mode={mode} labels={labels} />
      ))}
    </div>
  )
}
