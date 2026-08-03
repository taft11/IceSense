import { Activity, AlertTriangle, CalendarDays, CloudSun, TrendingUp } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useDemandForecast from '../../hooks/useDemandForecast';

const formatKg = (value) => `${Math.round(Number(value || 0)).toLocaleString()} kg`;

export default function DemandForecastPage() {
  const { forecastDays, loading, error, tomorrowForecast } = useDemandForecast();

  const chartData = forecastDays.map((day) => ({
    day: day.label,
    historical: Math.round(day.total_kg_produced || 0),
    predicted: Math.round(day.total_kg_demanded || 0),
  }));

  const driverCards = [
    {
      title: 'Weather Impact',
      badge: 'Heat-driven demand',
      description: `${tomorrowForecast?.avg_temperature_c?.toFixed(1) || '34.5'}°C average temperature is increasing retail bag demand.`,
      accent: 'border-sky-100 bg-sky-50/60',
    },
    {
      title: 'Calendar & Events',
      badge: tomorrowForecast?.is_payday_weekend ? 'Payday weekend' : 'Routine operations',
      description: tomorrowForecast?.event_tag || 'Stable local calendar conditions with moderate weekend activity.',
      accent: 'border-emerald-100 bg-emerald-50/60',
    },
    {
      title: 'Historical Baseline',
      badge: 'Day-of-week trend',
      description: 'Historical patterns show stronger demand on this weekday, supporting a higher bag mix recommendation.',
      accent: 'border-amber-100 bg-amber-50/60',
    },
  ];

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-600">Loading demand forecast...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="rounded-[28px] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-slate-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
              <TrendingUp className="h-3.5 w-3.5" /> Demand Forecast
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Demand spike expected tomorrow</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              A proactive production mix is recommended to keep up with the next-day demand surge while preserving service levels.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Demand Spike (+25%) Expected
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
            <p className="text-sm font-semibold text-slate-500">Predicted demand for tomorrow</p>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-4xl font-bold text-slate-900">{formatKg(tomorrowForecast?.total_kg_demanded || 0)}</p>
              <span className="mb-1 text-sm text-slate-500">total weight</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
            <p className="text-sm font-semibold text-slate-500">Recommended bag mix</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span>5kg</span>
                <span className="font-semibold">{tomorrowForecast?.breakdown?.bags_5kg || 0} bags</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span>35kg</span>
                <span className="font-semibold">{tomorrowForecast?.breakdown?.sacks_35kg || 0} sacks</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span>40kg</span>
                <span className="font-semibold">{tomorrowForecast?.breakdown?.sacks_40kg || 0} sacks</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span>50kg</span>
                <span className="font-semibold">{tomorrowForecast?.breakdown?.sacks_50kg || 0} sacks</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span>70kg</span>
                <span className="font-semibold">{tomorrowForecast?.breakdown?.crates_70kg || 0} crates</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">7-day trend</h3>
            <p className="text-sm text-slate-500">Historical production vs. predicted demand over the next week.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
            <CalendarDays className="h-4 w-4 text-sky-600" /> Next 7 Days
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="historical" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="predicted" stroke="#4091c9" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {driverCards.map((card) => (
          <div key={card.title} className={`rounded-[24px] border p-5 shadow-sm ${card.accent}`}>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-900">{card.title}</h4>
              <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                {card.badge}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{card.description}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {error}
        </div>
      )}
    </div>
  );
}
