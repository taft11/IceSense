import { useMemo, useState } from 'react';
import { Bell, Check, CircleCheck, PackageCheck } from 'lucide-react';

const getStatusLabel = (order) => {
  const status = String(order?.status || '').trim().toLowerCase();
  const paymentStatus = String(order?.paymentStatus || '').trim().toLowerCase();
  const deliveryStatus = String(order?.deliveryStatus || '').trim().toLowerCase();

  if (
    ['delivered', 'completed', 'done', 'finished', 'delivery completed'].includes(status)
    || paymentStatus === 'delivered'
    || ['delivered', 'completed', 'done', 'finished', 'delivery completed'].includes(deliveryStatus)
  ) return 'Delivered';

  if (['cancelled', 'rejected'].includes(status) || paymentStatus === 'rejected') return 'Cancelled';
  if (
    ['attempting', 'out for delivery', 'in transit', 'on the way'].includes(status)
    || ['attempting', 'out for delivery', 'in transit', 'on the way'].includes(deliveryStatus)
  ) return 'Out for Delivery';
  if (['pending_payment_verification', 'pending', 'awaiting_verification'].includes(paymentStatus)) {
    return 'Pending Payment Verification';
  }
  if (status === 'processing' || paymentStatus === 'paid') return 'Processing';

  return order?.status || order?.deliveryStatus || 'Placed';
};

const getOrderSignature = (order) => [
  order.id,
  order.status,
  order.paymentStatus,
  order.deliveryStatus,
  order.updatedAt?.toMillis?.() || order.updatedAt || '',
].join('|');

const formatNotificationDate = (order) => {
  const value = order.updatedAt || order.createdAt;
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value || 0);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const getStoredReadSignatures = (storageKey) => {
  if (!storageKey || typeof window === 'undefined') return new Set();

  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
};

export default function CustomerNotifications({ orders, userId, onViewOrders }) {
  const storageKey = userId ? `icesense-notifications-v1-${userId}` : null;
  const [readState, setReadState] = useState(() => ({
    storageKey,
    signatures: getStoredReadSignatures(storageKey),
  }));
  const [isOpen, setIsOpen] = useState(false);

  const notifications = useMemo(() => orders.slice(0, 12).map((order) => {
    const statusLabel = getStatusLabel(order);
    return {
      id: order.id,
      signature: getOrderSignature(order),
      statusLabel,
      isDelivered: statusLabel === 'Delivered',
      isNewOrder: statusLabel === 'Pending Payment Verification',
      dateLabel: formatNotificationDate(order),
    };
  }), [orders]);

  const readSignatures = readState.storageKey === storageKey
    ? readState.signatures
    : getStoredReadSignatures(storageKey);

  const persistReadSignatures = (nextSignatures) => {
    setReadState({ storageKey, signatures: nextSignatures });
    if (storageKey) window.localStorage.setItem(storageKey, JSON.stringify([...nextSignatures].slice(-50)));
  };

  const unreadCount = notifications.filter(({ signature }) => !readSignatures.has(signature)).length;

  const markAsRead = (signature) => {
    const nextSignatures = new Set(readSignatures);
    nextSignatures.add(signature);
    persistReadSignatures(nextSignatures);
  };

  const markAllAsRead = () => {
    persistReadSignatures(new Set(notifications.map(({ signature }) => signature)));
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.signature);
    setIsOpen(false);
    onViewOrders();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${isOpen ? 'bg-[#4091c9] text-white shadow-sm' : 'text-slate-700 hover:bg-sky-50 hover:text-[#4091c9]'}`}
      >
        <Bell className="h-4 w-4" />
        Notifications
        {unreadCount > 0 && (
          <span className="min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-1.5rem)] rounded-[24px] border border-slate-200 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between gap-3 px-2 py-1">
            <div>
              <p className="text-sm font-bold text-slate-900">Order notifications</p>
              <p className="text-xs text-slate-500">Status and delivery updates</p>
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllAsRead} className="text-xs font-semibold text-[#4091c9] hover:text-[#2d75aa]">
                Mark all read
              </button>
            )}
          </div>

          <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No order updates yet.</div>
            ) : notifications.map((notification) => {
              const isUnread = !readSignatures.has(notification.signature);
              return (
                <button
                  key={notification.signature}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition hover:bg-sky-50 ${isUnread ? 'bg-sky-50/70' : 'bg-white'}`}
                >
                  <span className={`mt-0.5 rounded-full p-2 ${notification.isDelivered ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-[#4091c9]'}`}>
                    {notification.isDelivered ? <PackageCheck className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {notification.isDelivered ? 'Order delivered' : notification.isNewOrder ? 'Order placed' : 'Order status updated'}
                      </span>
                      {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-600">
                      {notification.isDelivered
                        ? `Your order #${notification.id.slice(0, 6).toUpperCase()} has been delivered.`
                        : notification.isNewOrder
                        ? `Your order #${notification.id.slice(0, 6).toUpperCase()} was submitted and is awaiting payment verification.`
                        : `Order #${notification.id.slice(0, 6).toUpperCase()} is ${notification.statusLabel}.`}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                      {isUnread ? <Bell className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                      {notification.dateLabel || 'Recently updated'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}