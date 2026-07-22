import { Bell } from 'lucide-react';

export default function Alerts() {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800">System Alerts</h2>
      <p className="mt-2 text-gray-600">All live alerts and operational notices appear here.</p>
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          <div className="flex items-center gap-2 font-semibold mb-2">
            <Bell className="h-4 w-4" /> Live data stream connected
          </div>
          IoT system connected and streaming live data.
        </div>
      </div>
    </div>
  );
}
