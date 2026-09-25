import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, Check, CircleAlert, FileText } from 'lucide-react';

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

export default function AdminNotificationBell({ iotData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('critical');
  const [readIds, setReadIds] = useState(new Set());
  const [now, setNow] = useState(Date.now());
  const bellRef = useRef(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const notifications = useMemo(() => {
    const waterLevel = formatSensorValue(iotData?.waterLevel, '0%');
    const temperature = formatSensorValue(iotData?.temperature, 'Threshold warning');
    const waterLevelTimestamp = formatRelativeTime(iotData?.waterLevelUpdatedAt, now);
    const temperatureTimestamp = formatRelativeTime(iotData?.temperatureUpdatedAt, now);
    const temperatureValue = Number.parseFloat(iotData?.temperature);
    const waterDistance = Number(iotData?.waterDistance);
    const isTemperatureCritical = Number.isFinite(temperatureValue) && temperatureValue > -15;
    const isWaterLevelCritical = Number.isFinite(waterDistance) && waterDistance >= 58;

    return {
      critical: [
        isWaterLevelCritical && {
          id: 'water-tank-level',
          title: `Water tank level ${waterLevel}`,
          detail: 'Water supply requires attention.',
          timestamp: waterLevelTimestamp,
          icon: CircleAlert,
          urgent: true,
        },
        isTemperatureCritical && {
          id: 'freezer-temperature',
          title: `Freezer temperature: ${temperature}`,
          detail: `Latest critical reading received ${temperatureTimestamp.toLowerCase()}. Check freezer conditions immediately.`,
          timestamp: temperatureTimestamp,
          icon: AlertTriangle,
          urgent: true,
        },
      ].filter(Boolean),
      system: [
        {
          id: 'scale-sync',
          title: 'Automatic scale sync completed',
          detail: 'ESP32_Scale_01 reported the latest inventory event.',
          timestamp: '38m ago',
          icon: FileText,
          urgent: false,
        },
        {
          id: 'order-log',
          title: 'Order activity recorded',
          detail: 'A new customer order is waiting for review.',
          timestamp: '1h ago',
          icon: FileText,
          urgent: false,
        },
      ],
    };
  }, [iotData, now]);

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
                {tab === 'critical' && <span className="ml-1 text-red-500">{notifications.critical.length}</span>}
              </button>
            ))}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {visibleNotifications.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Check className="mx-auto h-6 w-6 text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-slate-700">No critical alerts</p>
                <p className="mt-1 text-xs text-slate-500">All monitored readings are within safe limits.</p>
              </div>
            )}
            {visibleNotifications.map((notification) => {
              const Icon = notification.icon;
              const isRead = readIds.has(notification.id);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => setReadIds((current) => new Set([...current, notification.id]))}
                  className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${isRead ? 'opacity-60' : ''}`}
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${notification.urgent ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-[#4091c9]'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">{notification.title}</span>
                      {!isRead && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{notification.detail}</span>
                    <span className="mt-1 block text-[11px] font-medium text-slate-400">{notification.timestamp}</span>
                  </span>
                </button>
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