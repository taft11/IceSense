import { Calendar, Activity, Bell, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Overview({ iotData, todayDate }) {
  const navigate = useNavigate();
  const tomorrowDemandKg = 780;
  const dailyTargetKg = 100;
  const stockProducedKg = Number(iotData?.stockProducedKg || 0);
  const productionTargetPercent = stockProducedKg > 0 ? Math.round((stockProducedKg / dailyTargetKg) * 100) : 0;

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
            <span className="rounded-full border border-sky-200/60 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">88% Full</span>
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">{iotData.waterLevel}</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-sky-500" style={{ width: '88%' }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Total Stock Produced</h3>
            <span className="rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">+12%</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{stockProducedKg.toFixed(2)}</p>
              <span className="text-sm text-slate-500">kg</span>
            </div>
            <p className="mt-3 text-sm text-slate-500">🟢 {productionTargetPercent}% of daily target ({dailyTargetKg} kg)</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Active Deliveries</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> LIVE
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{iotData.activeTrucks}</p>
              <span className="text-sm text-slate-500">On Route</span>
            </div>
            <p className="mt-3 text-sm text-slate-500">2 Scheduled • 1 In Transit</p>
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
          <div className="flex h-56 items-end justify-between gap-2 sm:gap-6">
            {[45, 65, 35, 80, 55, 90, 100].map((height, i) => (
              <div key={i} className="group relative flex w-full flex-col justify-end h-full">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs font-bold py-1 px-2 rounded">
                  {height}k
                </div>
                <div className="w-full rounded-t-lg bg-[#4091c9]/10 relative h-full">
                  <div
                    style={{ height: `${height}%` }}
                    className="absolute bottom-0 w-full rounded-t-lg bg-[#4091c9] transition-all duration-700 group-hover:bg-[#2d75aa]"
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-xs font-bold text-gray-400">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4091c9] to-[#205a82] p-8 text-white shadow-lg">
            <div className="absolute -right-4 -top-4 opacity-10">
              <Activity className="h-32 w-32" />
            </div>
            <div className="relative z-10">
              <div className="mb-4 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-md border border-white/10">
                📈 Demand Advisory
              </div>
              <h3 className="mb-2 text-xl font-bold">Demand Spike Alert</h3>
              <p className="mb-2 text-sm text-blue-100 leading-relaxed">
                Tomorrow&apos;s demand is forecast at <strong className="text-white">{tomorrowDemandKg} kg</strong>.
              </p>
              <p className="mb-6 text-sm text-blue-100 leading-relaxed">
                A strong increase is expected due to weather and weekend activity patterns.
              </p>
              <button
                onClick={() => navigate('/admin/forecast')}
                className="w-full rounded-xl bg-white text-[#205a82] py-3 text-sm font-bold shadow-md hover:bg-gray-50 transition-colors"
              >
                View Full Forecast →
              </button>
            </div>
          </div>

          <div className="flex-1 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center text-lg font-bold text-gray-900">
              <Bell className="mr-2 h-5 w-5 text-gray-400" /> Recent Alerts
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 border border-red-100">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800">Freezer Warning</p>
                  <p className="text-xs text-red-600 mt-1">Temperature has risen above -5°C. Check door seals.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 border border-gray-100">
                <div className="h-2 w-2 mt-1.5 rounded-full bg-blue-500 shrink-0"></div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Target Reached</p>
                  <p className="text-xs text-gray-500 mt-1">Production hit daily goal of 100 sacks.</p>
                  <p className="text-[10px] text-gray-400 mt-2 font-semibold uppercase">2 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
