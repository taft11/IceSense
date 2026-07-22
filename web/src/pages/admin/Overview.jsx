import { Thermometer, Droplets, Package, Truck, TrendingUp, Calendar, Activity, Bell, AlertTriangle } from 'lucide-react';

export default function Overview({ iotData, todayDate }) {
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
        <div className="group rounded-3xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500 group-hover:scale-110 transition-transform">
              <Thermometer className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">Live</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Freezer Temp</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-gray-900">{iotData.temperature}</p>
              <span className="text-sm font-medium text-gray-400">/ -18°C Target</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <Droplets className="h-4 w-4" />
              <span>Humidity: {iotData.humidity}</span>
            </div>
          </div>
        </div>

        <div className="group rounded-3xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 group-hover:scale-110 transition-transform">
              <Droplets className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">Live</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Water Tank Level</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-gray-900">{iotData.waterLevel}</p>
            </div>
          </div>
        </div>

        <div className="group rounded-3xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 group-hover:scale-110 transition-transform">
              <Package className="h-6 w-6" />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-500"><TrendingUp className="w-3 h-3 mr-1" /> +12%</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total Stock Produced</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-gray-900">{iotData.sacksProduced}</p>
              <span className="text-sm font-medium text-gray-400">Sacks</span>
            </div>
          </div>
        </div>

        <div className="group rounded-3xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-500 group-hover:scale-110 transition-transform">
              <Truck className="h-6 w-6" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Active Deliveries</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-gray-900">{iotData.activeTrucks}</p>
              <span className="text-sm font-medium text-gray-400">On Route</span>
            </div>
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
                ✨ AI Forecast
              </div>
              <h3 className="mb-2 text-xl font-bold">Demand Spike Alert</h3>
              <p className="mb-6 text-sm text-blue-100 leading-relaxed">
                Based on incoming weather data, ice demand is predicted to rise by <strong className="text-white">25%</strong> this weekend.
              </p>
              <button className="w-full rounded-xl bg-white text-[#205a82] py-3 text-sm font-bold shadow-md hover:bg-gray-50 transition-colors">
                Adjust Production
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
