import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Snowflake } from 'lucide-react';
import Home from './pages/customer/Home';
import CustomerPortal from './pages/customer/Portal';
import AdminDashboard from './pages/admin/Dashboard';
import Login from './pages/customer/Login';

// We create a Layout component so we can use the useLocation hook
function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      
      {/* 
        Dynamic Navigation Bar: 
        If on Home -> Transparent, floating on top of video. 
        If on other pages -> Solid white, sticky.
      */}
      <nav className={`w-full z-50 transition-all duration-300 ${isHome ? 'absolute top-0 bg-transparent' : 'sticky top-0 bg-white border-b border-gray-200 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-24">
            
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center hover:opacity-80 transition">
                <img 
                  src={isHome ? '/logo-white.png' : '/logo.png'} 
                  alt="Bella Erin Tube Ice Logo" 
                  className="h-20 w-auto" 
                />
              </Link>
            </div>

            {/* Links */}
            <div className="flex items-center space-x-8">
              <Link to="/" className={`font-semibold transition ${isHome ? 'text-gray-200 hover:text-white' : 'text-gray-600 hover:text-blue-600'}`}>Home</Link>
              <Link to="/login" className={`font-semibold transition ${isHome ? 'text-gray-200 hover:text-white' : 'text-gray-600 hover:text-blue-600'}`}>Login</Link>
              <Link to="/order" className="bg-[#4091c9] hover:bg-[#2d75aa] text-white px-6 py-3 rounded-[28px_8px_28px_8px] font-bold transition shadow-lg">
                Order Ice
              </Link>
            </div>

          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={`flex-grow ${isHome ? '' : 'bg-gray-50 pb-10'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/order" element={<CustomerPortal />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>

    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}