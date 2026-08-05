import React from 'react';
import { 
  AlertTriangle, 
  CalendarDays, 
  CloudRain, 
  CloudSun, 
  Factory, 
  Layers, 
  Package, 
  ShieldAlert, 
  Thermometer, 
  TrendingUp, 
  Truck, 
  Zap 
} from 'lucide-react';
import { 
  Area, 
  CartesianGrid, 
  ComposedChart, 
  Legend, 
  Line, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from 'recharts';
import useDemandForecast from '../../hooks/useDemandForecast';

// Helper for KG formatting
const formatKg = (value) => `${Math.round(Number(value || 0)).toLocaleString()} kg`;

// Custom Recharts Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-xs space-y-2">
        <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-600 font-medium">{entry.name}:</span>
            </div>
            <span className="font-bold text-slate-900">{formatKg(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DemandForecastPage() {
  const { forecastDays = [], loading, error, tomorrowForecast } = useDemandForecast();

  // Prepare chart data
  const chartData = forecastDays.map((day) => ({
    day: day.label,
    'Historical Production': Math.round(day.total_kg_produced || 0),
    'Predicted Demand': Math.round(day.total_kg_demanded || 0),
  }));

  // Forecast Metrics
  const breakdown = tomorrowForecast?.breakdown || {};
  const targetDemandKg = tomorrowForecast?.total_kg_demanded || 0;
  
  const avgHistoricalOutput = forecastDays.length 
    ? forecastDays.reduce((acc, curr) => acc + (curr.total_kg_produced || 0), 0) / forecastDays.length 
    : 0;

  const productionGap = targetDemandKg - avgHistoricalOutput;
  const isOverCapacity = productionGap > 0;

  const rainProb = tomorrowForecast?.rain_probability ?? 0;
  const tempC = tomorrowForecast?.avg_temperature_c ?? 30;

  // -------------------------------------------------------------
  // NORMALIZED PACKAGING MIX BREAKDOWN (Fixes "Too Much" Issue)
  // -------------------------------------------------------------
  const bagTypesRaw = [
    { label: '5kg Bags', count: breakdown.bags_5kg || 0, unitKg: 5, color: 'bg-sky-500', hex: '#0284c7' },
    { label: '35kg Sacks', count: breakdown.sacks_35kg || 0, unitKg: 35, color: 'bg-indigo-500', hex: '#6366f1' },
    { label: '40kg Sacks', count: breakdown.sacks_40kg || 0, unitKg: 40, color: 'bg-emerald-500', hex: '#10b981' },
    { label: '50kg Sacks', count: breakdown.sacks_50kg || 0, unitKg: 50, color: 'bg-amber-500', hex: '#f59e0b' },
    { label: '70kg Crates', count: breakdown.crates_70kg || 0, unitKg: 70, color: 'bg-rose-500', hex: '#f43f5e' },
  ];

  // Calculate actual total weight derived from unit breakdown
  const totalBreakdownKg = bagTypesRaw.reduce((acc, item) => acc + item.count * item.unitKg, 0) || 1;

  // Normalize percentages so they strictly sum to 100%
  const bagTypes = bagTypesRaw.map((item) => {
    const totalItemKg = item.count * item.unitKg;
    const pct = Math.round((totalItemKg / totalBreakdownKg) * 100);
    return { ...item, totalItemKg, pct };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px] rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-sm font-medium">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#4091c9] border-t-transparent" />
          <span>Processing historical logs, weather metrics & calendar events...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: HEADER & HIGH-LEVEL PREDICTIVE BANNER */}
      <div className="rounded-[28px] border border-gray-200 bg-white p-6 sm:p-8 text-slate-900 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c7d9f5] bg-[#eff6ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#0f172a]">
              <Zap className="h-3.5 w-3.5 text-[#4091c9]" /> AI Demand Engine
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900">
              Tomorrow's Operational Forecast
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 leading-relaxed">
              Real-time predictive output blending weather forecasts, local calendar spikes, and historical distribution patterns.
            </p>
          </div>

          {/* Dynamic Operational Risk Alerts */}
          <div className="flex flex-col sm:flex-row gap-3">
            {tomorrowForecast?.is_spike && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Demand Surge Expected</p>
                  <p className="text-xs text-amber-600">Projected volume spike (+25%).</p>
                </div>
              </div>
            )}

            {rainProb > 50 && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 flex items-center gap-3">
                <CloudRain className="h-6 w-6 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Rain Impact Expected</p>
                  <p className="text-xs text-blue-600">{rainProb}% rain chance may lower retail demand.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: TOP METRICS DASHBOARD */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Total Target Demand */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Projected Target</p>
            <p className="mt-1 text-3xl font-extrabold text-slate-900">{formatKg(targetDemandKg)}</p>
            <p className="mt-2 text-xs text-[#4091c9] flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Calculated target volume
            </p>
          </div>

          {/* Capacity Variance */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Variance vs Avg Output</p>
            <p className={`mt-1 text-3xl font-extrabold ${isOverCapacity ? 'text-amber-500' : 'text-emerald-500'}`}>
              {isOverCapacity ? `+${formatKg(productionGap)}` : `-${formatKg(Math.abs(productionGap))}`}
            </p>
            <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
              <Factory className="h-3.5 w-3.5 text-slate-500" /> {isOverCapacity ? 'Requires extra shift / overtime' : 'Normal shift capacity'}
            </p>
          </div>

          {/* Temperature Index */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Temperature Index</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-slate-900">{tempC.toFixed(1)}°C</p>
              <span className={`text-xs font-bold ${tempC > 32 ? 'text-rose-500' : 'text-slate-500'}`}>
                {tempC > 32 ? 'High Heat' : 'Moderate'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5 text-rose-500" /> Meltdown / Consumption factor
            </p>
          </div>

          {/* Rain & Calendar Factor */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Calendar & Event Tag</p>
            <p className="mt-1 text-lg font-bold text-slate-900 truncate">
              {tomorrowForecast?.is_payday_weekend ? 'Payday Active' : 'Regular Cycle'}
            </p>
            <p className="mt-2 text-xs text-slate-500 truncate">
              {tomorrowForecast?.event_tag || 'Routine Operations'}
            </p>
          </div>

        </div>
      </div>

      {/* SECTION 3: CHARTS & RECOMMENDED MIX SHIFT */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Recharts Historical vs Demand Trend (2 Cols) */}
        <div className="lg:col-span-2 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">7-Day Demand vs Production Trend</h3>
                <p className="text-xs text-slate-500">Comparing actual historical output against target demand markers.</p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                <CalendarDays className="h-3.5 w-3.5 text-[#4091c9]" /> 7-Day Window
              </div>
            </div>

            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }} />
                  
                  {/* Historical Production Area */}
                  <Area
                    name="Historical Production"
                    type="monotone"
                    dataKey="Historical Production"
                    fill="#bfdbfe"
                    stroke="#4091c9"
                    strokeWidth={2}
                  />

                  {/* Forecast Line */}
                  <Line
                    name="Predicted Demand"
                    type="monotone"
                    dataKey="Predicted Demand"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 5, fill: '#f59e0b' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700 flex items-center justify-between">
            <span className="font-semibold">Insight:</span>
            <span>Dashed line signifies AI target orders derived from ambient temp, rain risk, and payday calendars.</span>
          </div>
        </div>

        {/* CLEAN & NORMALIZED RECOMMENDED MIX SHIFT (1 Col) */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Recommended Mix</h3>
                <p className="text-xs text-slate-500">Volume distribution normalized to 100%.</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <Layers className="h-5 w-5" />
              </div>
            </div>

            {/* Total Weight Header */}
            <div className="mt-2 text-xs font-semibold text-slate-500 flex justify-between">
              <span>Packaging Volume:</span>
              <span className="text-slate-900 font-bold">{Math.round(totalBreakdownKg).toLocaleString()} kg</span>
            </div>

            {/* Single Normalized Stacked Progress Bar */}
            <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden flex my-3 shadow-inner">
              {bagTypes.map((item) =>
                item.pct > 0 ? (
                  <div
                    key={item.label}
                    className={`h-full ${item.color} transition-all`}
                    style={{ width: `${item.pct}%` }}
                    title={`${item.label}: ${item.pct}%`}
                  />
                ) : null
              )}
            </div>

            {/* Clean Grid Breakdown */}
            <div className="mt-4 space-y-2">
              {bagTypes.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    <span className="font-semibold text-slate-700">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900">{item.count.toLocaleString()} units</span>
                    <span className="text-[10px] text-slate-400 block">({item.pct}% / {item.totalItemKg.toLocaleString()} kg)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Total Units to Pack:</span>
            <span className="font-bold text-slate-800">
              {bagTypes.reduce((acc, curr) => acc + curr.count, 0).toLocaleString()} SKUs
            </span>
          </div>
        </div>

      </div>

      {/* SECTION 4: ACTIONABLE OPERATIONAL DIRECTIVES */}
      <div className="grid gap-4 sm:grid-cols-3">
        
        {/* Logistics Directive */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <Truck className="h-4 w-4" />
            </div>
            Logistics & Route Dispatch
          </div>
          <p className="mt-3 text-xs text-slate-600 leading-relaxed">
            {tomorrowForecast?.is_payday_weekend
              ? 'Payday demand surge active. Prioritize early delivery routes to high-volume commercial accounts and restock retail partners by 08:00 AM.'
              : 'Standard route dispatch. Maintain baseline distribution cycles for commercial sacks.'}
          </p>
        </div>

        {/* Inventory Staging Directive */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Package className="h-4 w-4" />
            </div>
            Packaging & Bay Staging
          </div>
          <p className="mt-3 text-xs text-slate-600 leading-relaxed">
            Pre-bag <strong>{(breakdown.bags_5kg || 0).toLocaleString()} units of 5kg bags</strong> and stage <strong>{(breakdown.sacks_50kg || 0).toLocaleString()} units of 50kg sacks</strong> in the primary loading bay for fast truck loading.
          </p>
        </div>

        {/* Temperature & Melt Mitigation */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CloudSun className="h-4 w-4" />
            </div>
            Cold Room Temperature Advisory
          </div>
          <p className="mt-3 text-xs text-slate-600 leading-relaxed">
            {tempC > 32
              ? `High temperature forecasted (${tempC.toFixed(1)}°C). Set cold room sub-cooling to max to prevent meltage loss during staging and transport.`
              : 'Ambient temperature within normal limits. Baseline cold room refrigeration settings are sufficient.'}
          </p>
        </div>

      </div>

      {/* Error State Banner */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span><strong>Error loading forecast metrics:</strong> {error}</span>
        </div>
      )}

    </div>
  );
}