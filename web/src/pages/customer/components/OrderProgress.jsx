import { Check } from 'lucide-react';

export const DELIVERY_STEPS = [
  'Pending Payment Verification',
  'Order Confirmed',
  'Processing',
  'Out for Delivery',
  'Delivered',
];

export const PICKUP_STEPS = [
  'Pending Payment Verification',
  'Order Confirmed',
  'Processing',
  'Ready for Pickup',
  'Picked Up',
];

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/_/g, ' ');

const getFulfillmentType = (order) => (
  normalize(order?.fulfillment_type || order?.fulfillmentMethod || order?.deliveryType).includes('pickup')
    ? 'pickup'
    : 'delivery'
);

const getCurrentStatus = (order, fulfillmentType) => {
  const status = normalize(order?.status);
  const paymentStatus = normalize(order?.paymentStatus);
  const deliveryStatus = normalize(order?.deliveryStatus);

  if (['delivered', 'completed', 'done', 'finished', 'delivery completed'].includes(status) || paymentStatus === 'delivered') {
    return fulfillmentType === 'pickup' ? 'Picked Up' : 'Delivered';
  }

  if (
    (fulfillmentType === 'pickup' && ['ready for pickup', 'ready'].includes(status))
    || (fulfillmentType === 'delivery' && ['out for delivery', 'assigned', 'in transit'].includes(status))
    || (fulfillmentType === 'delivery' && ['out for delivery', 'assigned', 'in transit'].includes(deliveryStatus))
    || (fulfillmentType === 'delivery' && order?.assignedDriverId)
  ) {
    return fulfillmentType === 'pickup' ? 'Ready for Pickup' : 'Out for Delivery';
  }

  if (['processing', 'preparing'].includes(status) || ['paid', 'approved', 'payment verified'].includes(paymentStatus)) {
    return 'Processing';
  }

  if (['confirmed', 'order confirmed'].includes(status)) return 'Order Confirmed';

  return 'Pending Payment Verification';
};

const getActiveStepIndex = (currentStatus, steps) => {
  const normalizedStatus = normalize(currentStatus);
  const statusAliases = {
    pending: 'Pending Payment Verification',
    'pending payment': 'Pending Payment Verification',
    confirmed: 'Order Confirmed',
    preparing: 'Processing',
    processed: 'Processing',
    'out for delivery': 'Out for Delivery',
    assigned: 'Out for Delivery',
    'in transit': 'Out for Delivery',
    delivered: 'Delivered',
    completed: 'Delivered',
    done: 'Delivered',
    'ready for pickup': 'Ready for Pickup',
    'picked up': 'Picked Up',
  };
  const resolvedStatus = statusAliases[normalizedStatus] || currentStatus;

  return steps.findIndex((step) => normalize(step) === normalize(resolvedStatus));
};

export default function OrderProgress({ order, fulfillment_type, currentStatus }) {
  const fulfillmentType = fulfillment_type || getFulfillmentType(order);
  const steps = fulfillmentType === 'pickup' ? PICKUP_STEPS : DELIVERY_STEPS;
  const resolvedStatus = currentStatus || getCurrentStatus(order, fulfillmentType);
  const activeIndex = getActiveStepIndex(resolvedStatus, steps);
  const completedIndex = Math.max(activeIndex, 0);
  const progressPercent = completedIndex / (steps.length - 1) * 100;

  return (
    <div className="relative mt-6" aria-label="Order progress">
      <div className="absolute left-[10%] right-[10%] top-4 h-0.5 bg-slate-200" aria-hidden="true">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="relative grid grid-cols-5 gap-1 sm:gap-2">
        {steps.map((step, index) => {
          const isComplete = activeIndex >= index;
          const isCurrent = activeIndex === index;

          return (
            <div key={step} className="text-center">
              <div className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                isComplete
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-slate-300 bg-white text-slate-400'
              } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}>
                {isComplete ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <p className={`mt-2 text-[10px] font-semibold leading-4 sm:text-xs ${isComplete ? 'text-slate-800' : 'text-slate-400'}`}>
                {step}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}