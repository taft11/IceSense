import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Snowflake } from 'lucide-react';
import Home from './pages/customer/Home';
import CustomerPortal from './pages/customer/Portal';
import AdminDashboard from './pages/admin/Dashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans">
        
        {/* Professional Navigation Bar */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20">
              
              {/* Logo */}
              <div className="flex items-center">
                <Link to="/" className="flex items-center gap-2 text-2xl font-black text-blue-900 tracking-tight hover:opacity-80 transition">
                  <Snowflake className="h-8 w-8 text-cyan-500" />
                  ICE FLOW
                </Link>
              </div>

              {/* Links */}
              <div className="flex items-center space-x-8">
                <Link to="/" className="text-gray-600 hover:text-blue-600 font-semibold transition">Home</Link>
                <Link to="/admin" className="text-gray-600 hover:text-blue-600 font-semibold transition">Admin</Link>
                <Link to="/order" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-bold transition shadow-md">
                  Order Ice
                </Link>
              </div>

            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-grow bg-gray-50 pb-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/order" element={<CustomerPortal />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;