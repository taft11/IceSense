import { MapPin, Phone, Radio, UserRound } from 'lucide-react';

const normalize = (value) => String(value || '').trim().toLowerCase();

const getFulfillmentLabel = (order) => (
  normalize(order.fulfillment_type || order.fulfillmentMethod || order.deliveryType).includes('pickup')
    ? 'Pickup'
    : 'Delivery'
);

const formatAddress = (order) => order.shippingAddress || order.address || order.deliveryAddress || 'Address not provided';

export default function OrderDetails({ order, onTrackLive }) {
  const fulfillmentLabel = getFulfillmentLabel(order);
  const deliveryWindow = order.deliveryTimeSlot || order.deliverySlot || 'Time not selected';
  const driverName = order.assignedDriverName || order.driverName || 'Driver not assigned';
  const driverPhone = order.assignedDriverPhone || order.driverPhone || order.assignedDriverContact || '';
  const isDelivery = fulfillmentLabel === 'Delivery';
  const canTrackLive = Boolean(onTrackLive && (order.deliveryLocation || order.driverLocation || order.assignedDriverId));

  return (
    <section className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5" aria-label="Order details">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MapPin className="h-4 w-4 text-[#4091c9]" />
            <span>Target {fulfillmentLabel}</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-800">Estimated window</p>
          <p className="mt-1 text-sm text-slate-600">
            {order.deliveryDate || 'Date not selected'} · {deliveryWindow}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            {isDelivery ? formatAddress(order) : 'Ice plant pickup location'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {isDelivery ? (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <UserRound className="h-4 w-4 text-[#4091c9]" />
                <span>Driver details</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800">{driverName}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                <Phone className="h-3.5 w-3.5" />
                {driverPhone || 'Contact details not available'}
              </p>
              <button
                type="button"
                onClick={() => onTrackLive?.(order)}
                disabled={!canTrackLive}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                title={canTrackLive ? 'Track this delivery live' : 'Live tracking is not available yet'}
              >
                <Radio className="h-4 w-4" />
                Track Live
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MapPin className="h-4 w-4 text-[#4091c9]" />
                <span>Pickup information</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">Bring your order reference when collecting your ice.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}