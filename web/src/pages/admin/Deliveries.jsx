export default function Deliveries() {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800">Deliveries</h2>
      <p className="mt-2 text-gray-600">Track active routes and delivery status.</p>
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
          <p className="font-semibold text-purple-800">Route 01</p>
          <p className="mt-1 text-sm text-purple-700">On the way to Barangay San Pedro.</p>
        </div>
        <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4">
          <p className="font-semibold text-yellow-800">Route 02</p>
          <p className="mt-1 text-sm text-yellow-700">Scheduled for departure in 20 minutes.</p>
        </div>
      </div>
    </div>
  );
}
