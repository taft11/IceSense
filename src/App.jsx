import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CustomerPortal from './pages/customer/Portal';
import AdminDashboard from './pages/admin/Dashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        {/* Temporary Navigation for development purposes */}
        <nav className="bg-blue-600 text-white p-4 shadow-md flex justify-between">
          <div className="font-bold text-xl">❄️ Ice Flow System</div>
          <div className="space-x-4">
            <Link to="/" className="hover:underline">Customer Portal</Link>
            <Link to="/admin" className="hover:underline">Admin Dashboard</Link>
          </div>
        </nav>

        <main className="p-4">
          <Routes>
            <Route path="/" element={<CustomerPortal />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;