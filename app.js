const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  scenario: 'baseline',
  event: null,
  compare: false,
  paused: false,
  speed: 1,
  seconds: (14 * 60 + 27) * 60 + 36,
  zoom: 100,
  applied: false,
};

const events = {
  machine: {
    title: 'CNC-04 offline · 42 min',
    subtitle: 'Machine outage · three downstream jobs affected',
    summary: 'CNC-04 is unavailable. The recovery sequence reroutes three active jobs and preserves the rush-order deadline.',
    impact: '3 jobs at risk · 42 min recovery window',
    base: { throughput: 154, recovery: 42, idle: 46, orders: 10, total: 12 },
    plan: { throughput: 179, recovery: 12, idle: 16, orders: 12, total: 12 },
    steps: [
      ['Reroute CNC-04 jobs', 'Send affected jobs to CNC-02 and CNC-03 with adjusted routing and tools.', '2 MIN'],
      ['Rebalance downstream', 'Adjust assembly and inspection sequences to remove the new bottleneck.', '8 MIN'],
      ['Expedite rush order', 'Reserve materials and protect the six-hour delivery commitment.', '12 MIN'],
    ],
  },
  rush: {
    title: 'Rush order · 180 units',
    subtitle: 'Priority order · due in six hours',
    summary: 'A priority order entered the queue. The planner moves a flexible batch and reserves assembly capacity without delaying committed orders.',
    impact: '1 new priority order · due in 6 hours',
    base: { throughput: 171, recovery: 31, idle: 35, orders: 12, total: 13 },
    plan: { throughput: 194, recovery: 14, idle: 22, orders: 13, total: 13 },
    steps: [
      ['Reserve assembly capacity', 'Move the flexible analytics batch to the next open window.', '1 MIN'],
      ['Prioritize order #1048', 'Split the 180-unit lot across Assembly A and B.', '7 MIN'],
      ['Confirm material availability', 'Hold the required stock before the rush order enters finishing.', '11 MIN'],
    ],
  },
  supplier: {
    title: 'Material delay · 90 min',
    subtitle: 'Inbound supplier slip · two jobs at risk',
    summary: 'Inbound material is delayed by 90 minutes. The plan sequences available work first and limits idle time while the shipment catches up.',
    impact: '2 jobs at risk · 90 min inbound slip',
    base: { throughput: 149, recovery: 62, idle: 51, orders: 9, total: 12 },
    plan: { throughput: 169, recovery: 25, idle: 23, orders: 11, total: 12 },
    steps: [
      ['Resequence stocked jobs', 'Move work that does not depend on the delayed component forward.', '3 MIN'],
      ['Protect the critical order', 'Reserve the arriving material for the earliest confirmed due date.', '10 MIN'],
      ['Reduce idle station time', 'Shift inspection and finishing to the open capacity window.', '25 MIN'],
    ],
  },
};

function setText(selector, value) { $(selector).textContent = value; }

function openDialog(selector) {
  const dialog = $(selector);
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog(selector) {
  const dialog = $(selector);
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function fmtClock(total) {
  const seconds = ((total % 86400) + 86400) % 86400;
  const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function renderPlan() {
  const active = state.event ? events[state.event] : null;
  const eventScenario = Boolean(active);
  const plan = active?.plan;
  const base = active?.base;
  const metrics = state.compare && base ? base : plan;

  setText('#scenarioTitle', active?.title || 'Baseline scenario');
  setText('#scenarioSubtitle', active?.subtitle || 'All production lines operating normally');
  $('#scenarioTitle').parentElement.previousElementSibling?.classList.toggle('is-event', eventScenario);
  $('#factoryStage').classList.toggle('has-event', eventScenario);
  $('#machineCnc').classList.toggle('is-down', state.event === 'machine');
  $('#floorAlert').classList.toggle('hidden-alert', !eventScenario);
  $('#outageBlock').classList.toggle('hidden-job', state.event !== 'machine');
  $('#rerouteBlock').classList.toggle('hidden-job', !eventScenario);
  $('#cncTimelineRow').classList.toggle('event-row', eventScenario);
  $('#cncTag').querySelector('text').textContent = state.event === 'machine' ? 'CNC-04 · OFFLINE' : 'CNC-04 · WATCH';
  const alertCopy = state.event === 'machine'
    ? ['CNC-04 offline', '42 min · jobs rerouted']
    : state.event === 'rush'
      ? ['Priority order received', '180 units · due in six hours']
      : state.event === 'supplier'
        ? ['Material arrival delayed', 'Inbound slip · 90 minutes']
        : ['CNC-04 offline', '42 min · jobs rerouted'];
  $('#floorAlert b').textContent = alertCopy[0];
  $('#floorAlert small').textContent = alertCopy[1];
  $('.tag-reroute text').textContent = state.event === 'machine' ? 'REROUTED JOBS' : state.event === 'rush' ? 'PRIORITY FLOW' : 'RESEQUENCED';
  $('#applyPlan').innerHTML = state.applied ? `<span>✓</span> ${eventScenario ? 'Plan applied to simulation' : 'Baseline running'}` : `<span>▶</span> ${eventScenario ? 'Apply recovery plan' : 'Run baseline'}`;
  $('#applyPlan').disabled = state.applied;
  $('#replanButton').disabled = !eventScenario;
  $('#replanButton').style.opacity = eventScenario ? '1' : '.55';

  if (active) {
    setText('#planSummary', state.compare ? 'Current plan before the disruption. Compare these metrics with the optimized recovery plan.' : active.summary);
    const steps = active.steps;
    $('#planSteps').innerHTML = steps.map((step, index) => `<li class="plan-step ${state.compare ? '' : 'active'}"><span class="step-number">${index + 1}</span><div><b>${step[0]}</b><small>${step[1]}</small></div><span class="step-time">${step[2]}</span></li>`).join('');
  } else {
    setText('#planSummary', 'No disruption active. The baseline schedule is stable across all production lines.');
    $('#planSteps').innerHTML = '<li class="plan-step"><span class="step-number">1</span><div><b>Monitor machine health</b><small>All critical stations reporting nominal.</small></div><span class="step-time">NOW</span></li><li class="plan-step"><span class="step-number">2</span><div><b>Keep current job sequence</b><small>No downstream bottlenecks detected.</small></div><span class="step-time">—</span></li><li class="plan-step"><span class="step-number">3</span><div><b>Hold capacity buffer</b><small>Reserve one assembly lane for recovery.</small></div><span class="step-time">READY</span></li>';
  }

  const output = metrics?.throughput ?? 186;
  setText('#metricThroughput', String(output));
  setText('#metricRecovery', metrics ? String(metrics.recovery) : '—');
  setText('#metricIdle', String(metrics?.idle ?? 28));
  setText('#metricOrders', `${metrics?.orders ?? 12}`);
  $('#metricOrders').insertAdjacentHTML('beforeend', `<span class="metric-denom">/${metrics?.total ?? 12}</span>`);
  const outputChange = plan && base ? Math.round((plan.throughput - base.throughput) / base.throughput * 100) : 0;
  const idleChange = plan && base ? Math.round((plan.idle - base.idle) / base.idle * 100) : 0;
  const recoveryChange = plan && base ? Math.round((plan.recovery - base.recovery) / base.recovery * 100) : 0;
  setText('#throughputChange', state.compare ? 'BASELINE' : plan ? `↑ ${outputChange}%` : '↑ 0%');
  setText('#recoveryChange', state.compare ? 'BASELINE' : plan ? `↓ ${Math.abs(recoveryChange)}%` : 'No active event');
  setText('#idleChange', state.compare ? 'BASELINE' : plan ? `↓ ${Math.abs(idleChange)}%` : 'Baseline');
  setText('#ordersChange', metrics ? `${Math.round(metrics.orders / metrics.total * 100)}%` : '100%');
  setText('#metricMode', state.compare ? 'current plan' : eventScenario ? 'recovery plan' : 'baseline');
  setText('#outputRate', `${output} units / hr`);
  setText('#utilization', `${Math.min(98, 64 + Math.round(output / 10))}%`);

  const isRush = state.event === 'rush';
  setText('.order-status', eventScenario ? (state.compare && plan?.orders < plan?.total ? 'AT RISK' : 'ON TRACK') : 'ON TRACK');
  $('.order-status').style.color = state.compare && plan?.orders < plan?.total ? 'var(--amber)' : '';
  $('.order-progress span').style.width = isRush ? '58%' : '72%';
  $('.order-meta span:last-child').textContent = isRush ? 'New priority order' : '72% complete';
}

function toast(title = 'Scenario updated', message = 'New plan is ready for review.') {
  const box = $('#toast');
  box.querySelector('b').textContent = title;
  box.querySelector('small').textContent = message;
  box.classList.add('show');
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => box.classList.remove('show'), 3200);
}

function injectEvent() {
  state.event = $('#eventType').value;
  state.scenario = state.event;
  state.compare = false;
  state.applied = false;
  closeDialog('#disruptionDialog');
  renderPlan();
  toast('Recovery plan ready', 'Review the proposed changes before applying.');
}

function replan() {
  if (!state.event) return;
  state.compare = false;
  state.applied = false;
  renderPlan();
  toast('Plan recalculated', 'The local optimizer found a new recovery sequence.');
}

function toggleCompare() {
  if (!state.event) {
    toast('Add a disruption first', 'Plan comparison needs an active scenario.');
    openDialog('#disruptionDialog');
    return;
  }
  state.compare = !state.compare;
  $('#compareButton').classList.toggle('button-selected', state.compare);
  renderPlan();
  toast(state.compare ? 'Current plan shown' : 'Recovery plan shown', state.compare ? 'Compare baseline metrics against the proposed plan.' : 'Optimized scenario metrics are back in view.');
}

function applyPlan() {
  if (state.applied && state.event) return;
  state.applied = true;
  state.compare = false;
  renderPlan();
  toast('Plan applied to simulation', 'The digital twin is now showing the recovered production state.');
}

function updateEventImpact() {
  const copy = {
    machine: '3 jobs at risk · 42 min recovery window',
    rush: '1 new priority order · due in 6 hours',
    supplier: '2 jobs at risk · 90 min inbound slip',
  };
  $('#eventImpact small').textContent = copy[$('#eventType').value];
}

$('#openDisruption').addEventListener('click', () => openDialog('#disruptionDialog'));
$('#confirmDisruption').addEventListener('click', injectEvent);
$('#eventType').addEventListener('change', updateEventImpact);
$('#compareButton').addEventListener('click', toggleCompare);
$('#replanButton').addEventListener('click', replan);
$('#applyPlan').addEventListener('click', applyPlan);
$('#premiumButton').addEventListener('click', () => openDialog('#premiumDialog'));
$('#aboutLink').addEventListener('click', (event) => { event.preventDefault(); openDialog('#aboutDialog'); });

$('#playButton').addEventListener('click', () => {
  state.paused = !state.paused;
  $('#playButton').textContent = state.paused ? '▶' : 'Ⅱ';
  $('#playButton').setAttribute('aria-label', state.paused ? 'Resume simulation' : 'Pause simulation');
  document.body.classList.toggle('motion-pause', state.paused);
});

$('#speedButton').addEventListener('click', () => {
  const speeds = [1, 2, 4];
  state.speed = speeds[(speeds.indexOf(state.speed) + 1) % speeds.length];
  $('#speedButton').innerHTML = `${state.speed}× <span>⌄</span>`;
});

setInterval(() => {
  if (state.paused) return;
  state.seconds += state.speed;
  setText('#clockReadout', fmtClock(state.seconds));
}, 1000);

$('#zoomIn').addEventListener('click', () => {
  state.zoom = Math.min(120, state.zoom + 10);
  $('#zoomLabel').textContent = `${state.zoom}%`;
  $('#factoryStage').classList.toggle('zoomed', state.zoom > 100);
  $('#factoryStage').classList.toggle('zoomed-out', state.zoom < 100);
});
$('#zoomOut').addEventListener('click', () => {
  state.zoom = Math.max(80, state.zoom - 10);
  $('#zoomLabel').textContent = `${state.zoom}%`;
  $('#factoryStage').classList.toggle('zoomed', state.zoom > 100);
  $('#factoryStage').classList.toggle('zoomed-out', state.zoom < 100);
});
$('#centerView').addEventListener('click', () => {
  state.zoom = 100;
  $('#zoomLabel').textContent = '100%';
  $('#factoryStage').classList.remove('zoomed', 'zoomed-out');
});
$('#viewFullTimeline').addEventListener('click', () => $('#timeline').scrollIntoView({ behavior: 'smooth', block: 'center' }));

$('#lineFilter').addEventListener('click', () => {
  const onlyCritical = $('#lineFilter').dataset.mode !== 'critical';
  $('#lineFilter').dataset.mode = onlyCritical ? 'critical' : 'all';
  $('#lineFilter').innerHTML = `${onlyCritical ? 'Critical lines' : 'All lines'} <span>⌄</span>`;
  $$('.timeline-row').forEach((row) => {
    const critical = row.id === 'cncTimelineRow' || /CNC-0[234]/.test(row.querySelector('b')?.textContent || '');
    row.classList.toggle('filtered-out', onlyCritical && !critical);
  });
});

$('#speedButton').title = 'Cycle simulation speed';
$('#factoryStage').addEventListener('dblclick', () => $('#centerView').click());
$$('.nav-item[href^="#"]').forEach((link) => link.addEventListener('click', (event) => {
  const target = document.querySelector(link.getAttribute('href'));
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}));

$$('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
}));

renderPlan();
