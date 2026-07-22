export default function Inventory() {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800">Inventory</h2>
      <p className="mt-2 text-gray-600">Monitor stock levels for all ice products.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
          <p className="font-semibold text-green-800">Tube Ice 50kg</p>
          <p className="mt-1 text-sm text-green-700">124 sacks available</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="font-semibold text-blue-800">Crushed Ice Crates</p>
          <p className="mt-1 text-sm text-blue-700">15 crates in stock</p>
        </div>
      </div>
    </div>
  );
}
