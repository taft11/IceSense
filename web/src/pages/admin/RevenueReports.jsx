import { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Download, RefreshCw } from 'lucide-react';
import { getIdToken } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { auth, db } from '../../services/firebase';

const API_URL = import.meta.env.VITE_REVENUE_REPORTS_API_URL || '/api/revenue-reports';
const CURRENCY = 'PHP';

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetDates = (preset) => {
  const endDate = new Date();
  const startDate = new Date(endDate);

  if (preset === 'last7') startDate.setDate(startDate.getDate() - 6);
  if (preset === 'month') startDate.setDate(1);

  return { startDate: toDateInputValue(startDate), endDate: toDateInputValue(endDate) };
};

const formatCurrency = (value) => new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const formatNumber = (value, digits = 0) => Number(value || 0).toLocaleString('en-PH', {
  maximumFractionDigits: digits,
});

const formatDateLabel = (value) => new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
}).format(new Date(`${value}T00:00:00`));

const escapeCsvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const downloadCsv = (rows) => {
  const headers = ['Delivery Date', 'Orders', 'Gross Revenue', 'Net Sales', 'Kilograms Sold', 'Average Order Value'];
  const csv = [
    headers,
    ...rows.map((row) => [
      row.date,
      row.orders,
      row.grossRevenue,
      row.netSales,
      row.kgSold,
      row.averageOrderValue,
    ]),
  ].map((line) => line.map(escapeCsvValue).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'revenue-report.csv';
  link.click();
  URL.revokeObjectURL(url);
};

const requestReport = async (dates) => {
  const token = auth.currentUser ? await getIdToken(auth.currentUser) : null;
  const query = new URLSearchParams(dates).toString();
  const response = await fetch(`${API_URL}?${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Revenue API is not configured.');
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || 'Unable to load the revenue report.');
  return payload;
};

const getOrderDate = (order) => {
  if (!order.deliveryDate) return null;
  const value = new Date(`${order.deliveryDate}T00:00:00`);
  if (Number.isNaN(value.getTime())) return null;
  return order.deliveryDate;
};

const getItemWeightKg = (item) => {
  const storedWeight = Number(item?.weightKg);
  if (storedWeight > 0) return storedWeight;

  const nameWeight = String(item?.name || item?.productName || '').match(/(\d+(?:\.\d+)?)\s*kg\b/i);
  return nameWeight ? Number(nameWeight[1]) : 0;
};

const buildFirestoreReport = async (dates) => {
  const snapshot = await getDocs(collection(db, 'orders'));
  const daily = new Map();

  snapshot.docs.forEach((orderSnapshot) => {
    const order = orderSnapshot.data();
    const paymentStatus = String(order.paymentStatus || '').toLowerCase();
    const status = String(order.status || '').toLowerCase();
    const pickupStatus = String(order.pickupStatus || '').toLowerCase();
    const date = getOrderDate(order);
    const isCompleted = status === 'delivered'
      || paymentStatus === 'delivered'
      || status === 'picked up'
      || pickupStatus === 'picked up';
    const isRejected = paymentStatus === 'rejected' || status === 'cancelled' || status === 'rejected';

    if (!date || date < dates.startDate || date > dates.endDate || !isCompleted || isRejected) return;

    const current = daily.get(date) || { date, orders: 0, grossRevenue: 0, netSales: 0, kgSold: 0, averageOrderValue: 0 };
    const total = Number(order.total || 0);
    const kgSold = (order.items || []).reduce((sum, item) => sum + (getItemWeightKg(item) * Number(item.quantity || 0)), 0);
    current.orders += 1;
    current.grossRevenue += total;
    current.netSales += total;
    current.kgSold += kgSold;
    daily.set(date, current);
  });

  const dailyRows = [...daily.values()].sort((first, second) => first.date.localeCompare(second.date)).map((row) => ({
    ...row,
    averageOrderValue: row.orders ? row.netSales / row.orders : 0,
  }));
  const summary = dailyRows.reduce((result, row) => ({
    grossRevenue: result.grossRevenue + row.grossRevenue,
    netSales: result.netSales + row.netSales,
    kgSold: result.kgSold + row.kgSold,
    orderCount: result.orderCount + row.orders,
  }), { grossRevenue: 0, netSales: 0, kgSold: 0, orderCount: 0 });

  return {
    startDate: dates.startDate,
    endDate: dates.endDate,
    summary: { ...summary, averageOrderValue: summary.orderCount ? summary.netSales / summary.orderCount : 0 },
    daily: dailyRows,
  };
};

function MetricCard({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

export default function RevenueReports({ userRole }) {
  const [preset, setPreset] = useState('last7');
  const [dates, setDates] = useState(getPresetDates('last7'));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    if (userRole !== 'owner') return;
    setLoading(true);
    setError('');

    try {
      try {
        setReport(await requestReport(dates));
      } catch (apiError) {
        if (apiError.message !== 'Revenue API is not configured.') throw apiError;
        setReport(await buildFirestoreReport(dates));
      }
    } catch (fetchError) {
      setError(fetchError.message || 'Unable to load the revenue report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole !== 'owner') return undefined;

    let cancelled = false;
    const loadInitialReport = async () => {
      setLoading(true);
      setError('');
      try {
        let payload;
        try {
          payload = await requestReport(dates);
        } catch (apiError) {
          if (apiError.message !== 'Revenue API is not configured.') throw apiError;
          payload = await buildFirestoreReport(dates);
        }
        if (!cancelled) setReport(payload);
      } catch (fetchError) {
        if (!cancelled) setError(fetchError.message || 'Unable to load the revenue report.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadInitialReport();
    return () => {
      cancelled = true;
    };
  }, [userRole, dates]);

  const updatePreset = (nextPreset) => {
    setPreset(nextPreset);
    if (nextPreset !== 'custom') setDates(getPresetDates(nextPreset));
  };

  if (userRole === null) {
    return <div className="flex min-h-[32rem] items-center justify-center text-sm text-slate-500">Checking report access...</div>;
  }

  if (userRole !== 'owner') {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">You do not have permission to view revenue reports.</div>;
  }

  const summary = report?.summary || {};
  const dailyRows = report?.daily || [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-sky-700">Owner view</p>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Revenue Reports</h1>
          <p className="mt-2 text-sm text-slate-500">Track paid sales performance across your selected period.</p>
        </div>
        <button type="button" onClick={() => downloadCsv(dailyRows)} disabled={!dailyRows.length} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap gap-2">
          {[['today', 'Today'], ['last7', 'Last 7 Days'], ['month', 'This Month'], ['custom', 'Custom']].map(([value, label]) => (
            <button key={value} type="button" onClick={() => updatePreset(value)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${preset === value ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
            <label className="text-sm font-semibold text-slate-600">Start date<input type="date" value={dates.startDate} onChange={(event) => setDates((current) => ({ ...current, startDate: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 font-normal text-slate-800" /></label>
            <label className="text-sm font-semibold text-slate-600">End date<input type="date" value={dates.endDate} onChange={(event) => setDates((current) => ({ ...current, endDate: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 font-normal text-slate-800" /></label>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {dates.startDate} to {dates.endDate}</span>
          <button type="button" onClick={fetchReport} disabled={loading} className="inline-flex items-center gap-2 font-semibold text-sky-700 hover:text-sky-900 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Apply filters</button>
        </div>
      </section>

      {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Could not load revenue data</p><p className="mt-1">{error}</p></div></div>}
      {loading && <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-500 shadow-sm"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />Loading revenue report...</div>}

      {!loading && report && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Gross Revenue" value={formatCurrency(summary.grossRevenue)} detail="Before discounts and adjustments" />
          <MetricCard label="Net Sales" value={formatCurrency(summary.netSales)} detail="After discounts and adjustments" />
          <MetricCard label="Volume Sold" value={`${formatNumber(summary.kgSold)} kg`} detail="Total ice weight scheduled for delivery" />
          <MetricCard label="Average Order Value" value={formatCurrency(summary.averageOrderValue)} detail={`${formatNumber(summary.orderCount)} paid orders`} />
        </div>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Daily sales trend</h2>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyRows} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                <XAxis dataKey="date" tickFormatter={formatDateLabel} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tickFormatter={(value) => `₱${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={formatDateLabel} />
                <Line type="monotone" dataKey="netSales" name="Net sales" stroke="#0c7c8c" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-5"><h2 className="text-lg font-bold text-slate-900">Daily breakdown</h2><span className="text-sm text-slate-500">{dailyRows.length} days</span></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Delivery Date</th><th className="px-5 py-3 font-semibold">Orders</th><th className="px-5 py-3 font-semibold">Gross Revenue</th><th className="px-5 py-3 font-semibold">Net Sales</th><th className="px-5 py-3 font-semibold">Kilograms</th><th className="px-5 py-3 font-semibold">AOV</th></tr></thead><tbody className="divide-y divide-slate-100">{dailyRows.map((row) => <tr key={row.date} className="text-slate-700"><td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-900">{formatDateLabel(row.date)}</td><td className="px-5 py-3">{formatNumber(row.orders)}</td><td className="px-5 py-3">{formatCurrency(row.grossRevenue)}</td><td className="px-5 py-3 font-semibold">{formatCurrency(row.netSales)}</td><td className="px-5 py-3">{formatNumber(row.kgSold)}</td><td className="px-5 py-3">{formatCurrency(row.averageOrderValue)}</td></tr>)}</tbody></table>
          </div>
        </section>
      </>}
    </div>
  );
}