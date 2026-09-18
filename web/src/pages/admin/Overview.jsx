import { useState } from 'react';
import { Calendar, ClipboardList, CreditCard, Eye, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useDemandForecast from '../../hooks/useDemandForecast';

const formatKg = (value) => `${Math.round(Number(value || 0)).toLocaleString()} kg`;

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-xs space-y-2">
      <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 font-medium">{entry.name}:</span>
          </div>
          <span className="font-bold text-slate-900">{formatKg(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function Overview({
  iotData,
  todayDate,
  todaysOrdersCount = 0,
  pendingOrders = [],
  verificationLoadingId,
  onApprovePayment,
  onOpenReceiptPreview,
  onOpenRejectModal,
}) {
  const navigate = useNavigate();
  const { forecastDays = [], loading } = useDemandForecast();
  const currentStockKg = Number(iotData?.stockProducedKg || 0);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Water tank calibration constants
  const TANK_TOTAL_HEIGHT = 43; // cm
  const SENSOR_BLIND_ZONE = 25; // cm
  const MAX_MEASURABLE_DEPTH = TANK_TOTAL_HEIGHT - SENSOR_BLIND_ZONE; // 18 cm

  // Raw distance reading from top of tank to water surface (cm)
  const rawDistance = typeof iotData?.waterDistance === 'number' ? iotData.waterDistance : null;

  // Compute water depth (h) and percentage (P)
  let waterDepth = null; // measured liquid height from bottom of sensor's measurable zone
  let waterPercent = null;
  let overflow = false;

  if (rawDistance === null || Number.isNaN(rawDistance)) {
    waterDepth = null;
    waterPercent = null;
  } else {
    // h = total height - distance
    const h = TANK_TOTAL_HEIGHT - rawDistance;

    if (rawDistance < SENSOR_BLIND_ZONE) {
      // Water has entered the blind zone — treat as full (or overflow)
      waterDepth = MAX_MEASURABLE_DEPTH;
      waterPercent = 100;
      overflow = true;
    } else if (rawDistance >= TANK_TOTAL_HEIGHT) {
      // Sensor reads at or beyond tank bottom => empty
      waterDepth = 0;
      waterPercent = 0;
    } else {
      // Normal measurable range
      waterDepth = Math.max(0, Math.min(h, MAX_MEASURABLE_DEPTH));
      waterPercent = Math.max(0, Math.min((waterDepth / MAX_MEASURABLE_DEPTH) * 100, 100));
    }
  }

  const chartData = forecastDays.map((day) => ({
    day: day.label,
    'Historical Production': Math.round(day.total_kg_produced || 0),
    'Predicted Demand': Math.round(day.total_kg_demanded || 0),
  }));

  const getReceiptPreviewUrl = (order) => order?.receiptUrl || order?.paymentReceiptUrl || order?.paymentProofUrl || order?.proofImageUrl || order?.proofUrl || null;
  const getPaymentMethodLabel = (order) => {
    const value = String(order?.paymentMethod || order?.paymentType || '').trim();
    return value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Unspecified';
  };
  const formatOrderItemLabel = (item) => {
    const quantity = Number(item?.quantity || 0);
    const productName = item?.name || item?.productName || 'Ice item';
    const weightLabel = item?.weightKg ? `${item.weightKg}kg ` : '';
    const normalizedName = productName.includes(weightLabel.trim()) ? productName : `${weightLabel}${productName}`;
    return `${normalizedName} × ${quantity}`;
  };

  return (
    <div className="animate-fade-in overview-page">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard Overview</h1>
          <p className="mt-2 text-gray-500 font-medium">Welcome back! Here is what&apos;s happening at the facility today.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm border border-gray-200">
          <Calendar className="h-4 w-4 text-[#4091c9]" />
          {todayDate}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Freezer Temp</h3>
            <span className="rounded-full border border-red-200/60 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">🔴 CRITICAL</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{iotData.temperature}</p>
              <span className="text-sm text-slate-500">/ -18°C Target</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Humidity: {iotData.humidity}</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[88%] rounded-full bg-red-500" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Water Tank Level</h3>
            <span className="rounded-full border border-sky-200/60 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
              {waterPercent !== null ? `${Math.round(waterPercent)}% Full` : 'N/A'}{overflow ? ' • OVERFLOW' : ''}
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">{waterPercent !== null ? `${Math.round(waterPercent)}%` : iotData.waterLevel}</p>
            <p className="mt-1 text-sm text-slate-500">{waterDepth !== null ? `${waterDepth.toFixed(1)} cm / ${MAX_MEASURABLE_DEPTH} cm Max Depth` : 'N/A'}</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-sky-500" style={{ width: `${waterPercent !== null ? Math.round(waterPercent) : 0}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Total Stock on Hand</h3>
            <span className="rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">LIVE</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{currentStockKg.toLocaleString()}</p>
              <span className="text-sm text-slate-500">kg</span>
            </div>
            <p className="mt-3 text-sm text-slate-500">Current inventory available in the facility.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Total Orders Today</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> LIVE
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{todaysOrdersCount}</p>
              <span className="text-sm text-slate-500">Orders</span>
            </div>
            <p className="mt-3 text-sm text-slate-500">Orders scheduled for today.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm lg:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Production vs Demand</h3>
              <p className="text-sm text-gray-500 mt-1">Weekly volume analysis</p>
            </div>
            <select className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 outline-none">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="h-56 w-full rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-slate-500 text-sm font-medium">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#4091c9] border-t-transparent" />
                  <span>Loading demand forecast data...</span>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="Historical Production"
                    fill="#c7d9f5"
                    stroke="#4091c9"
                    strokeWidth={2}
                    fillOpacity={0.22}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Predicted Demand"
                    stroke="#0f172a"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#0f172a' }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="flex-1 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center text-lg font-bold text-gray-900">
                  <ClipboardList className="mr-2 h-5 w-5 text-[#4091c9]" /> Dispatch Queue
                </h3>
                <p className="mt-1 text-xs text-gray-500">Incoming orders waiting for payment approval.</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{pendingOrders.length} pending</span>
            </div>

            <div className="mt-5 space-y-3">
              {pendingOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-500">
                  No orders waiting for approval.
                </div>
              ) : pendingOrders.slice(0, 4).map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const isBusy = verificationLoadingId === order.id;
                const receiptUrl = getReceiptPreviewUrl(order);

                return (
                  <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">#{order.id?.slice(0, 8).toUpperCase()} · {order.customerName || 'Unknown customer'}</p>
                        <p className="mt-1 text-xs text-slate-500">{(order.items || []).length} item{(order.items || []).length === 1 ? '' : 's'} · ₱{Number(order.total || 0).toFixed(2)}</p>
                      </div>
                      <button type="button" onClick={() => setExpandedOrderId(isExpanded ? null : order.id)} className="shrink-0 text-xs font-semibold text-[#2d75aa] hover:underline">
                        {isExpanded ? 'Hide details' : 'View details'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
                        <p className="font-semibold text-slate-800">Ordered items</p>
                        {(order.items || []).map((item, index) => <p key={`${order.id}-item-${index}`}>{formatOrderItemLabel(item)}</p>)}
                        <div className="flex items-center gap-2 pt-1 font-medium">
                          <CreditCard className="h-3.5 w-3.5 text-[#4091c9]" />
                          <span>{getPaymentMethodLabel(order)} · Payment verification required</span>
                        </div>
                        {receiptUrl ? (
                          <button type="button" onClick={() => onOpenReceiptPreview(receiptUrl)} className="inline-flex items-center gap-1 font-semibold text-[#2d75aa] hover:underline">
                            <Eye className="h-3.5 w-3.5" /> View payment proof
                          </button>
                        ) : <p className="text-amber-700">No payment proof uploaded.</p>}
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" disabled={isBusy} onClick={() => onApprovePayment(order)} className="rounded-xl bg-[#4091c9] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#2d75aa] disabled:cursor-not-allowed disabled:opacity-50">{isBusy ? 'Updating...' : 'Approve'}</button>
                      <button type="button" disabled={isBusy} onClick={() => onOpenRejectModal(order)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"><X className="h-3.5 w-3.5" /> Reject</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {pendingOrders.length > 4 && <p className="mt-4 text-center text-xs text-slate-500">Showing 4 of {pendingOrders.length} pending orders.</p>}
            <button type="button" onClick={() => navigate('/admin/orders')} className="mt-5 w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-[#2d75aa] transition hover:bg-sky-50">View all orders</button>
          </div>
        </div>
      </div>
    </div>
  );
}
