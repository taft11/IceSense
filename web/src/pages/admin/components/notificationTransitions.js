const getResolvedDetail = (alert) => alert.resolvedDetail || 'Reading is back within the safe range.';

export const createAlertTransitionEvents = ({
  alerts,
  activeEvents,
  deletedEventIds,
  createdAt,
  createEventId,
}) => {
  const nextActiveEvents = { ...activeEvents };
  const updates = [];
  const newEvents = [];

  alerts.forEach(({ id: conditionId, isCritical, ...alert }) => {
    const activeEventId = nextActiveEvents[conditionId];

    if (isCritical) {
      if (activeEventId) {
        if (!deletedEventIds.has(activeEventId)) {
          updates.push({ ...alert, id: activeEventId, conditionId, resolved: false });
        }
        return;
      }

      const eventId = createEventId();
      nextActiveEvents[conditionId] = eventId;
      newEvents.push({
        ...alert,
        id: eventId,
        conditionId,
        resolved: false,
        createdAt,
      });
      return;
    }

    if (!activeEventId) return;

    if (!deletedEventIds.has(activeEventId)) {
      updates.push({
        id: activeEventId,
        conditionId,
        resolved: true,
        detail: getResolvedDetail(alert),
        resolvedAt: createdAt,
      });
    }

    newEvents.push({
      ...alert,
      id: createEventId(),
      conditionId,
      title: `Resolved: ${alert.title}`,
      detail: getResolvedDetail(alert),
      isCritical: false,
      resolved: true,
      eventType: 'resolved',
      urgent: false,
      createdAt,
    });
    delete nextActiveEvents[conditionId];
  });

  return { updates, newEvents, nextActiveEvents };
};