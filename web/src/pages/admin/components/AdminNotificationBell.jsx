import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AlertTriangle, Bell, Check, CircleAlert, Trash2 } from 'lucide-react';

const PENDING_APPROVAL_NOTIFICATION_THRESHOLD = 5;
const UNASSIGNED_DELIVERY_NOTIFICATION_THRESHOLD = 3;

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
};

const getStoredCriticalNotifications = () => {
  if (typeof window === 'undefined') return [];

  try {
    const saved = JSON.parse(window.localStorage.getItem('icesense-admin-critical-notifications-v1') || '[]');
    return Array.isArray(saved)
      ? saved.map((notification) => ({
        ...notification,
        icon: notificationIcons[notification.id],
      })).filter((notification) => notification.icon)
      : [];
  } catch {
    return [];
  }
};

const criticalNotificationsReducer = (current, action) => {
  if (action.type === 'delete') {
    return current.filter((notification) => notification.id !== action.notificationId);
  }

  if (action.type !== 'sync') return current;

  const next = [...current];
  action.alerts.forEach(({ id, isCritical, ...alert }) => {
    const existingIndex = next.findIndex((notification) => notification.id === id);

    if (existingIndex >= 0) {
      next[existingIndex] = isCritical
        ? { ...next[existingIndex], ...alert, resolved: false }
        : { ...next[existingIndex], resolved: true, detail: 'Reading is back within the safe range. Delete this notification when it is no longer needed.' };
    } else if (isCritical) {
      next.push({ ...alert, id, resolved: false });
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
  const [dismissedSystemIds, setDismissedSystemIds] = useState(new Set());
  const [readIds, setReadIds] = useState(new Set());
  const [now, setNow] = useState(() => Date.now());
  const bellRef = useRef(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const waterLevel = formatSensorValue(iotData?.waterLevel, '0%');
    const temperature = formatSensorValue(iotData?.temperature, 'Threshold warning');
    const waterLevelTimestamp = formatRelativeTime(iotData?.waterLevelUpdatedAt, now);
    const temperatureTimestamp = formatRelativeTime(iotData?.temperatureUpdatedAt, now);
    const temperatureValue = Number.parseFloat(iotData?.temperature);
    const waterDistance = Number(iotData?.waterDistance);
    const isTemperatureCritical = Number.isFinite(temperatureValue) && temperatureValue > -15;
    const isWaterLevelCritical = Number.isFinite(waterDistance) && waterDistance >= 58;

    dispatchCriticalNotifications({
      type: 'sync',
      alerts: [
        {
          id: 'water-tank-level',
          isCritical: isWaterLevelCritical,
          title: `Water tank level ${waterLevel}`,
          detail: 'Water supply requires attention.',
          timestamp: waterLevelTimestamp,
          icon: CircleAlert,
          urgent: true,
        },
        {
          id: 'freezer-temperature',
          isCritical: isTemperatureCritical,
          title: `Freezer temperature: ${temperature}`,
          detail: `Latest critical reading received ${temperatureTimestamp.toLowerCase()}. Check freezer conditions immediately.`,
          timestamp: temperatureTimestamp,
          icon: AlertTriangle,
          urgent: true,
        },
      ],
    });
  }, [iotData, now]);

  useEffect(() => {
    const serializableNotifications = criticalNotifications.map((notification) => {
      const serializableNotification = { ...notification };
      delete serializableNotification.icon;
      return serializableNotification;
    });
    window.localStorage.setItem('icesense-admin-critical-notifications-v1', JSON.stringify(serializableNotifications));
  }, [criticalNotifications]);

  const notifications = useMemo(() => ({
    critical: criticalNotifications,
    system: [
      pendingOrders >= PENDING_APPROVAL_NOTIFICATION_THRESHOLD && {
        id: 'system-pending-approvals',
        title: `${pendingOrders} orders awaiting approval`,
        detail: 'There are too many payment-verification orders waiting for review.',
        timestamp: 'Current workload',
        icon: CircleAlert,
        urgent: true,
      },
      unassignedDeliveries >= UNASSIGNED_DELIVERY_NOTIFICATION_THRESHOLD && {
        id: 'system-unassigned-deliveries',
        title: `${unassignedDeliveries} deliveries need drivers`,
        detail: 'Several approved delivery orders do not have a driver assigned.',
        timestamp: 'Current workload',
        icon: AlertTriangle,
        urgent: true,
      },
      processingPickupOrders >= 1 && {
        id: 'system-processing-pickups',
        title: `${processingPickupOrders} pickup order${processingPickupOrders === 1 ? '' : 's'} processing`,
        detail: 'Pickup orders are still waiting to be prepared or marked ready for pickup.',
        timestamp: 'Current workload',
        icon: CircleAlert,
        urgent: true,
      },
    ].filter(Boolean).filter((notification) => !dismissedSystemIds.has(notification.id)),
  }), [criticalNotifications, dismissedSystemIds, pendingOrders, unassignedDeliveries, processingPickupOrders]);

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
    if (notificationId.startsWith('system-')) {
      setDismissedSystemIds((current) => new Set([...current, notificationId]));
      return;
    }

    dispatchCriticalNotifications({ type: 'delete', notificationId });
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
              <p className="text-sm font-bold text-slate-900">Notifications</p>
              <p className="mt-0.5 text-xs text-slate-500">Stay on top of dashboard activity</p>
            </div>
            <button type="button" onClick={markAllAsRead} className="text-xs font-semibold text-[#2d75aa] hover:text-[#205a82]">
              Mark all as read
            </button>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-100 p-1">
            {[
              ['critical', 'Critical Alerts'],
              ['system', 'System Logs'],
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
                    {notification.resolved && <span className="mt-1 inline-block text-[11px] font-bold uppercase tracking-wide text-emerald-600">Resolved</span>}
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{notification.detail}</span>
                    <span className="mt-1 block text-[11px] font-medium text-slate-400">{notification.timestamp}</span>
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
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            Click an alert to mark it as read
          </div>
        </div>
      )}
    </div>
  );
}