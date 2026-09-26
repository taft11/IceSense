import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlertTransitionEvents } from './notificationTransitions.js';

const makeAlert = (isCritical, title = 'Low stock: Tube Ice (9 sacks left)') => ({
  id: 'low-stock-tube-ice',
  isCritical,
  title,
  detail: 'Restock soon.',
  resolvedDetail: 'Stock is above the low-stock threshold.',
  category: 'critical',
});

const makeIdGenerator = () => {
  let sequence = 0;
  return () => `event-${++sequence}`;
};

const transition = (alerts, activeEvents, createEventId, createdAt) => createAlertTransitionEvents({
  alerts,
  activeEvents,
  deletedEventIds: new Set(),
  createdAt,
  createEventId,
});

test('creates one alert and one separate resolved event for each occurrence', () => {
  const createEventId = makeIdGenerator();
  let activeEvents = {};

  let result = transition([makeAlert(false)], activeEvents, createEventId, 100);
  assert.equal(result.newEvents.length, 0);
  activeEvents = result.nextActiveEvents;

  result = transition([makeAlert(true)], activeEvents, createEventId, 200);
  assert.equal(result.newEvents.length, 1);
  assert.equal(result.newEvents[0].id, 'event-1');
  assert.equal(result.newEvents[0].resolved, false);
  activeEvents = result.nextActiveEvents;

  result = transition([makeAlert(true)], activeEvents, createEventId, 300);
  assert.equal(result.newEvents.length, 0);
  assert.equal(result.updates[0].id, 'event-1');
  activeEvents = result.nextActiveEvents;

  result = transition([makeAlert(false)], activeEvents, createEventId, 400);
  assert.equal(result.updates[0].id, 'event-1');
  assert.equal(result.updates[0].resolved, true);
  assert.equal(result.newEvents.length, 1);
  assert.equal(result.newEvents[0].id, 'event-2');
  assert.match(result.newEvents[0].title, /^Resolved:/);
  activeEvents = result.nextActiveEvents;

  result = transition([makeAlert(true)], activeEvents, createEventId, 500);
  assert.equal(result.newEvents.length, 1);
  assert.equal(result.newEvents[0].id, 'event-3');
  assert.equal(result.newEvents[0].resolved, false);
});

test('does not resolve an active alert while its reading is unavailable', () => {
  const createEventId = makeIdGenerator();
  const raised = transition([makeAlert(true)], {}, createEventId, 100);
  const missingReading = transition([], raised.nextActiveEvents, createEventId, 200);

  assert.deepEqual(missingReading.newEvents, []);
  assert.deepEqual(missingReading.nextActiveEvents, raised.nextActiveEvents);
});