import { Thermometer, Droplets, Package, Truck } from 'lucide-react';

export default function AdminDashboard() {
  // Mock IoT Data: This will later stream live from Firebase Realtime DB
  const iotData = {
    temperature: "-18°C",
    humidity: "40%",
    waterLevel: "85%",
    sacksProduced: 124,
    activeTrucks: 3
  };

  return (
    <div className="max-w-6xl mx-auto mt-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">System Dashboard</h1>
      
      {/* Real-Time IoT Monitoring Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Storage and Environment Unit (DHT22) */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-500 font-semibold">Freezer Temp</h3>
            <Thermometer className="text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{iotData.temperature}</p>
          <p className="text-sm text-gray-500 mt-2">Humidity: {iotData.humidity}</p>
        </div>

        {/* Water Supply Unit (Ultrasonic) */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-500 font-semibold">Water Tank Level</h3>
            <Droplets className="text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{iotData.waterLevel}</p>
          <p className="text-sm text-green-500 mt-2">Pump Status: Normal</p>
        </div>

        {/* Inventory Unit (Load Cells) */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-500 font-semibold">Current Stock</h3>
            <Package className="text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{iotData.sacksProduced}</p>
          <p className="text-sm text-gray-500 mt-2">Calculated via Load Cell</p>
        </div>

        {/* Logistics Monitoring */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-500 font-semibold">Active Deliveries</h3>
            <Truck className="text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{iotData.activeTrucks}</p>
          <p className="text-sm text-gray-500 mt-2">Live GPS Tracking</p>
        </div>

      </div>

      {/* Lower section for Trends / Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md h-64 flex items-center justify-center text-gray-400 border border-dashed border-gray-300">
          [ Production Trends Chart Placeholder ]
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md h-64">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Alerts</h3>
          <ul className="space-y-3">
             <li className="p-3 bg-yellow-50 text-yellow-700 rounded text-sm">⚠️ Water level approaching 20% limit.</li>
             <li className="p-3 bg-green-50 text-green-700 rounded text-sm">✅ Target weight of 5000kg (100 sacks) reached.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}