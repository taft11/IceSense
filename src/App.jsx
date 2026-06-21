import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Snowflake } from 'lucide-react';
import Home from './pages/customer/Home';
import CustomerPortal from './pages/customer/Portal';
import AdminDashboard from './pages/admin/Dashboard';

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
              <Link to="/" className={`flex items-center gap-2 text-2xl font-black tracking-tight hover:opacity-80 transition ${isHome ? 'text-white' : 'text-blue-900'}`}>
                <Snowflake className="h-8 w-8 text-cyan-400" />
                ICE FLOW
              </Link>
            </div>

            {/* Links */}
            <div className="flex items-center space-x-8">
              <Link to="/" className={`font-semibold transition ${isHome ? 'text-gray-200 hover:text-white' : 'text-gray-600 hover:text-blue-600'}`}>Home</Link>
              <Link to="/admin" className={`font-semibold transition ${isHome ? 'text-gray-200 hover:text-white' : 'text-gray-600 hover:text-blue-600'}`}>Admin</Link>
              <Link to="/order" className="bg-cyan-500 hover:bg-cyan-400 text-blue-950 px-6 py-3 rounded-full font-bold transition shadow-lg">
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