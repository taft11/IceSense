import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AlertTriangle, Bell, Check, CircleAlert, Package, Trash2 } from 'lucide-react';
import { createAlertTransitionEvents } from './notificationTransitions.js';

const PENDING_APPROVAL_NOTIFICATION_THRESHOLD = 5;
const UNASSIGNED_DELIVERY_NOTIFICATION_THRESHOLD = 3;
const LOW_STOCK_THRESHOLD_SACKS = 10;
const LOW_WATER_THRESHOLD_PERCENT = 25;
const READ_NOTIFICATION_STORAGE_KEY = 'icesense-admin-read-notifications-v1';
const monitoredIceProducts = [
  { id: 'tube-5', name: 'Tube Ice 5kg' },
  { id: 'tube-35', name: 'Tube Ice 35kg' },
  { id: 'tube-50', name: 'Tube Ice 50kg' },
  { id: 'crushed-crate', name: 'Crushed Ice 5kg' },
  { id: 'crushed-sack', name: 'Crushed Ice 35kg' },
  { id: 'crushed-50', name: 'Crushed Ice 50kg' },
];

const formatSensorValue = (value, fallback) => {
  if (value === undefined || value === null || value === '' || value === 'Loading...') return fallback;
  return value;
};

const formatRelativeTime = (timestamp, now = Date.now()) => {
  if (!timestamp) return 'Waiting for the latest reading';

  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (elapsedSeconds < 60) return 'Just now';

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  return `${Math.floor(elapsedHours / 24)}d ago`;
};

const notificationIcons = {
  'water-tank-level': CircleAlert,
  'freezer-temperature': AlertTriangle,
  'system-pending-approvals': CircleAlert,
  'system-unassigned-deliveries': AlertTriangle,
  'system-processing-pickups': CircleAlert,
};

const getNotificationIcon = (id) => (id.startsWith('low-stock-') ? Package : notificationIcons[id]);
const ACTIVE_NOTIFICATION_STORAGE_KEY = 'icesense-admin-active-alert-events-v1';
const createNotificationEventId = () => {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getStoredCriticalNotifications = () => {
  if (typeof window === 'undefined') return [];

  try {
    const saved = JSON.parse(window.localStorage.getItem('icesense-admin-critical-notifications-v1') || '[]');
    return Array.isArray(saved)
      ? saved.map((notification) => ({
        ...notification,
        icon: getNotificationIcon(notification.conditionId || notification.id),
      })).filter((notification) => notification.icon)
      : [];
  } catch {
    return [];
  }
};

const getStoredReadNotificationIds = () => {
  if (typeof window === 'undefined') return new Set();

  try {
    const saved = JSON.parse(window.localStorage.getItem(READ_NOTIFICATION_STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? new Set(saved.filter((id) => typeof id === 'string')) : new Set();
  } catch {
    return new Set();
  }
};

const getStoredDeletedNotificationIds = () => {
  if (typeof window === 'undefined') return new Set();

  try {
    const saved = JSON.parse(window.localStorage.getItem('icesense-admin-deleted-notifications-v1') || '[]');
    return Array.isArray(saved) ? new Set(saved.filter((id) => typeof id === 'string')) : new Set();
  } catch {
    return new Set();
  }
};

const getStoredActiveAlertEvents = () => {
  if (typeof window === 'undefined') return {};

  try {
    const saved = JSON.parse(window.localStorage.getItem(ACTIVE_NOTIFICATION_STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
  } catch {
    return {};
  }

  return Object.fromEntries(
    getStoredCriticalNotifications()
      .filter((notification) => !notification.resolved)
      .map((notification) => [notification.conditionId || notification.id, notification.id])
  );
};

const criticalNotificationsReducer = (current, action) => {
  if (action.type === 'delete') {
    return current.filter((notification) => notification.id !== action.notificationId);
  }

  if (action.type !== 'apply-events') return current;

  const next = [...current];
  [...action.updates, ...action.newEvents].forEach((event) => {
    const existingIndex = next.findIndex((notification) => notification.id === event.id);
    if (existingIndex >= 0) {
      next[existingIndex] = { ...next[existingIndex], ...event };
    } else {
      next.push(event);
    }
  });

  return next;
};

export default function AdminNotificationBell({
  iotData,
  pendingOrders = 0,
  unassignedDeliveries = 0,
  processingPickupOrders = 0,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('critical');
  const [criticalNotifications, dispatchCriticalNotifications] = useReducer(criticalNotificationsReducer, undefined, getStoredCriticalNotifications);
  const [readIds, setReadIds] = useState(getStoredReadNotificationIds);
  const [now, setNow] = useState(() => Date.now());
  const bellRef = useRef(null);
  const deletedNotificationIdsRef = useRef(getStoredDeletedNotificationIds());
  const activeAlertEventsRef = useRef(getStoredActiveAlertEvents());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const temperature = formatSensorValue(iotData?.temperature, 'Threshold warning');
    const waterLevelTimestamp = formatRelativeTime(iotData?.waterLevelUpdatedAt, now);
    const temperatureTimestamp = formatRelativeTime(iotData?.temperatureUpdatedAt, now);
    const temperatureValue = Number.parseFloat(iotData?.temperature);
    const waterPercent = typeof iotData?.waterPercent === 'number' ? iotData.waterPercent : null;
    const isTemperatureCritical = Number.isFinite(temperatureValue) && temperatureValue > -15;
    const isWaterLevelCritical = Number.isFinite(waterPercent) && waterPercent <= LOW_WATER_THRESHOLD_PERCENT;
    const waterLevelLabel = Number.isFinite(waterPercent) ? `${Math.round(waterPercent)}%` : 'unknown';
    const alerts = [];

    if (Number.isFinite(waterPercent)) {
      alerts.push({
        id: 'water-tank-level',
        isCritical: isWaterLevelCritical,
        title: `Water tank low: ${waterLevelLabel} remaining`,
        detail: `Refill the tank soon. Low-water alert threshold: ${LOW_WATER_THRESHOLD_PERCENT}%.`,
        resolvedDetail: `Water level is above the ${LOW_WATER_THRESHOLD_PERCENT}% low-water threshold.`,
        timestamp: waterLevelTimestamp,
        icon: CircleAlert,
        urgent: true,
      });
    }

    if (Number.isFinite(temperatureValue)) {
      alerts.push({
        id: 'freezer-temperature',
        isCritical: isTemperatureCritical,
        title: `Freezer temperature: ${temperature}`,
        detail: `Latest critical reading received ${temperatureTimestamp.toLowerCase()}. Check freezer conditions immediately.`,
        timestamp: temperatureTimestamp,
        icon: AlertTriangle,
        urgent: true,
      });
    }

    const inventoryAlerts = monitoredIceProducts
      .filter(({ id }) => Number.isFinite(iotData?.inventoryCounts?.[id]))
      .map(({ id, name }) => {
        const count = Number(iotData.inventoryCounts[id]);
        return {
          id: `low-stock-${id}`,
          isCritical: count <= LOW_STOCK_THRESHOLD_SACKS,
          category: 'critical',
          title: `Low stock: ${name} (${count} ${count === 1 ? 'sack' : 'sacks'} left)`,
          detail: `Restock soon. Low-stock alert threshold: ${LOW_STOCK_THRESHOLD_SACKS} sacks.`,
          resolvedDetail: `Stock is above the ${LOW_STOCK_THRESHOLD_SACKS}-sack low-stock threshold.`,
          timestamp: 'Current inventory',
          icon: Package,
          urgent: true,
        };
      });

    alerts.push(...inventoryAlerts);
    alerts.push(
      {
        id: 'system-pending-approvals',
        category: 'system',
        isCritical: pendingOrders >= PENDING_APPROVAL_NOTIFICATION_THRESHOLD,
        title: `${pendingOrders} orders awaiting approval`,
        detail: 'There are too many payment-verification orders waiting for review.',
        resolvedDetail: 'Pending approvals are back below the alert threshold.',
        timestamp: 'Current workload',
        icon: CircleAlert,
        urgent: true,
      },
      {
        id: 'system-unassigned-deliveries',
        category: 'system',
        isCritical: unassignedDeliveries >= UNASSIGNED_DELIVERY_NOTIFICATION_THRESHOLD,
        title: `${unassignedDeliveries} deliveries need drivers`,
        detail: 'Several approved delivery orders do not have a driver assigned.',
        resolvedDetail: 'Unassigned deliveries are back below the alert threshold.',
        timestamp: 'Current workload',
        icon: AlertTriangle,
        urgent: true,
      },
      {
        id: 'system-processing-pickups',
        category: 'system',
        isCritical: processingPickupOrders >= 1,
        title: `${processingPickupOrders} pickup order${processingPickupOrders === 1 ? '' : 's'} processing`,
        detail: 'Pickup orders are still waiting to be prepared or marked ready for pickup.',
        resolvedDetail: 'There are no pickup orders waiting to be prepared.',
        timestamp: 'Current workload',
        icon: CircleAlert,
        urgent: true,
      },
    );

    const transition = createAlertTransitionEvents({
      alerts,
      activeEvents: activeAlertEventsRef.current,
      deletedEventIds: deletedNotificationIdsRef.current,
      createdAt: Date.now(),
      createEventId: createNotificationEventId,
    });
    activeAlertEventsRef.current = transition.nextActiveEvents;
    window.localStorage.setItem(ACTIVE_NOTIFICATION_STORAGE_KEY, JSON.stringify(transition.nextActiveEvents));
    dispatchCriticalNotifications({
      type: 'apply-events',
      updates: transition.updates,
      newEvents: transition.newEvents,
    });
  }, [iotData, now, pendingOrders, unassignedDeliveries, processingPickupOrders]);

  useEffect(() => {
    const serializableNotifications = criticalNotifications.map((notification) => {
      const serializableNotification = { ...notification };
      delete serializableNotification.icon;
      return serializableNotification;
    });
    window.localStorage.setItem('icesense-admin-critical-notifications-v1', JSON.stringify(serializableNotifications));
  }, [criticalNotifications]);

  useEffect(() => {
    window.localStorage.setItem(READ_NOTIFICATION_STORAGE_KEY, JSON.stringify([...readIds]));
  }, [readIds]);

  const notifications = useMemo(() => ({
    critical: criticalNotifications.filter((notification) => notification.category !== 'system')
      .sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0)),
    system: criticalNotifications.filter((notification) => notification.category === 'system')
      .sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0)),
  }), [criticalNotifications]);

  const allNotifications = [...notifications.critical, ...notifications.system];
  const unreadCount = allNotifications.filter((notification) => !readIds.has(notification.id)).length;
  const visibleNotifications = activeTab === 'critical' ? notifications.critical : notifications.system;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const markAllAsRead = () => setReadIds(new Set(allNotifications.map((notification) => notification.id)));

  const deleteNotification = (notificationId) => {
    dispatchCriticalNotifications({ type: 'delete', notificationId });
    deletedNotificationIdsRef.current.add(notificationId);
    window.localStorage.setItem('icesense-admin-deleted-notifications-v1', JSON.stringify([...deletedNotificationIdsRef.current]));
    setReadIds((current) => {
      const next = new Set(current);
      next.delete(notificationId);
      return next;
    });
  };

  return (
    <div ref={bellRef} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-xl p-2 text-gray-400 transition hover:bg-sky-50 hover:text-[#4091c9]"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-12 z-[90] w-[min(22rem,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-start justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Notification history</p>
              <p className="mt-0.5 text-xs text-slate-500">Alerts stay here until deleted</p>
            </div>
            <button type="button" onClick={markAllAsRead} className="text-xs font-semibold text-[#2d75aa] hover:text-[#205a82]">
              Mark all as read
            </button>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-100 p-1">
            {[
              ['critical', 'Critical Alerts'],
              ['system', 'System History'],
            ].map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${activeTab === tab ? 'bg-sky-50 text-[#2d75aa]' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {label}
                <span className={`ml-1 ${tab === 'critical' ? 'text-red-500' : 'text-slate-400'}`}>
                  {notifications[tab].length}
                </span>
              </button>
            ))}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {visibleNotifications.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Check className="mx-auto h-6 w-6 text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {activeTab === 'critical' ? 'No critical alerts' : 'No system alerts'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {activeTab === 'critical' ? 'All monitored readings are within safe limits.' : 'Current order and delivery workloads are within normal limits.'}
                </p>
              </div>
            )}
            {visibleNotifications.map((notification) => {
              const Icon = notification.icon;
              const isRead = readIds.has(notification.id);

              return (
                <div
                  key={notification.id}
                  className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${isRead ? 'opacity-60' : ''}`}
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${notification.urgent ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-[#4091c9]'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <button
                    type="button"
                    onClick={() => setReadIds((current) => new Set([...current, notification.id]))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">{notification.title}</span>
                      {!isRead && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{notification.detail}</span>
                    <span className="mt-1 block text-[11px] font-medium text-slate-400">
                      {notification.createdAt ? formatRelativeTime(notification.createdAt, now) : notification.timestamp}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${notification.title}`}
                    title="Delete notification"
                    onClick={() => deleteNotification(notification.id)}
                    className="mt-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 text-[11px] text-slate-500"> 
            
          </div>
        </div>
      )}
    </div>
  );
}