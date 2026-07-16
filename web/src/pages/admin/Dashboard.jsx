import { useState, useEffect } from 'react';
import { Thermometer, Droplets, Package, Truck } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../services/firebase'; // Importing your DB connection

export default function AdminDashboard() {
  // State to hold our live data. It starts with "Loading..."
  const [iotData, setIotData] = useState({
    temperature: "Loading...",
    humidity: "Loading...",
    waterLevel: "Loading...",
    sacksProduced: 124, // Still mock data until you build the load-cell ESP32
    activeTrucks: 3     // Still mock data for now
  });

  // useEffect runs once when the dashboard opens to establish the Firebase connection
  useEffect(() => {
    // 1. Tell Firebase exactly which folder to look at (/IoT)
    const iotRef = ref(database, 'IoT');

    // 2. Listen for any live changes in that folder
    const unsubscribe = onValue(iotRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Safely extract the numbers (if they exist)
        const temp = data.Environment?.temperature;
        const hum = data.Environment?.humidity;
        const dist = data.WaterLevel?.distance;

        // Update the React State with the new live numbers!
        setIotData(prev => ({
          ...prev,
          temperature: temp !== undefined ? `${temp.toFixed(1)}°C` : "N/A",
          humidity: hum !== undefined ? `${hum.toFixed(1)}%` : "N/A",
          waterLevel: dist !== undefined ? `${dist.toFixed(1)} cm` : "N/A",
        }));
      }
    });

    // 3. Clean up the listener if the user leaves the page
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-6xl mx-auto mt-6 px-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">System Dashboard</h1>
      
      {/* Real-Time IoT Monitoring Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Storage and Environment Unit (DHT22) */}
        <div className="bg-white p-6 rounded-xl shadow-md border-b-4 border-red-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-500 font-semibold">Freezer Temp</h3>
            <Thermometer className="text-red-500 h-6 w-6" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{iotData.temperature}</p>
          <p className="text-sm text-gray-500 mt-2">Humidity: {iotData.humidity}</p>
        </div>

        {/* Water Supply Unit (Ultrasonic) */}
        <div className="bg-white p-6 rounded-xl shadow-md border-b-4 border-blue-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-500 font-semibold">Water Level (Dist)</h3>
            <Droplets className="text-blue-500 h-6 w-6" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{iotData.waterLevel}</p>
          <p className="text-sm text-green-500 mt-2">Sensor Active</p>
        </div>

        {/* Inventory Unit (Load Cells) */}
        <div className="bg-white p-6 rounded-xl shadow-md border-b-4 border-green-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-500 font-semibold">Current Stock</h3>
            <Package className="text-green-500 h-6 w-6" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{iotData.sacksProduced}</p>
          <p className="text-sm text-gray-500 mt-2">Calculated via Load Cell</p>
        </div>

        {/* Logistics Monitoring */}
        <div className="bg-white p-6 rounded-xl shadow-md border-b-4 border-purple-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-500 font-semibold">Active Deliveries</h3>
            <Truck className="text-purple-500 h-6 w-6" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{iotData.activeTrucks}</p>
          <p className="text-sm text-gray-500 mt-2">Live GPS Tracking</p>
        </div>

      </div>

      {/* Lower section for Trends / Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md h-64 flex items-center justify-center text-gray-400 border border-dashed border-gray-300">
          [ Production Trends Chart Placeholder ]
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md h-64 overflow-y-auto">
          <h3 className="text-xl font-bold text-gray-800 mb-4">System Alerts</h3>
          <ul className="space-y-3">
             <li className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
                ℹ️ IoT System Connected. Live streaming active.
             </li>
             {/* If temp goes above 0, show a warning! */}
             {parseFloat(iotData.temperature) > -5 && (
               <li className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-start">
                  ⚠️ WARNING: Freezer Temperature is getting too warm!
               </li>
             )}
          </ul>
        </div>
      </div>
    </div>
  );
}