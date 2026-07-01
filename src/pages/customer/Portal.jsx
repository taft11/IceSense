import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { ShoppingCart, CheckCircle, Plus, Minus, Snowflake, Info, Package, LogOut, Menu } from 'lucide-react';

// Product Catalog
const PRODUCTS = [
  { id: 'tube-5', name: '5kg Tube Ice', price: 25, image: '/5kg.png', desc: 'Perfect for small coolers and home parties.' },
  { id: 'tube-35', name: '35kg Tube Ice', price: 120, image: '/35kg.png', desc: 'Ideal for medium-sized events and small businesses.' },
  { id: 'tube-50', name: '50kg Tube Ice', price: 150, image: '/50kg.png', desc: 'Wholesale size for restaurants and large scale cooling.' },
  { id: 'crushed-crate', name: 'Crates Crushed Ice', price: 180, image: '/crate.png', desc: 'Premium crushed ice delivered in hygienic crates.' },
  { id: 'crushed-sack', name: 'Crushed Ice on Sack', price: 140, image: '/crushedsack.png', desc: 'Bulk crushed ice packed securely in sacks.' },
];

export default function CustomerPortal() {
  const navigate = useNavigate();

  // Mock Stock Data for all 5 products (Will connect to Firebase later)
  const [stocks, setStocks] = useState({
    'tube-5': 85,
    'tube-35': 42,
    'tube-50': 124,
    'crushed-crate': 15,
    'crushed-sack': 60,
  });

  // App States
  const [selectedProductId, setSelectedProductId] = useState('tube-50'); // Default to 50kg
  const [quantity, setQuantity] = useState(1);
  const [orderStatus, setOrderStatus] = useState('idle'); // 'idle', 'processing', 'success'
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeView, setActiveView] = useState('order');

  // Get the details of the currently selected product
  const activeProduct = PRODUCTS.find(p => p.id === selectedProductId);
  const activeStock = stocks[selectedProductId];

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch (err) {
      setLoggingOut(false);
      console.error('Logout failed', err);
    }
  };

  // Handlers for changing products
  const handleProductSelect = (productId) => {
    setSelectedProductId(productId);
    setQuantity(1); // Reset quantity when they change products
    setOrderStatus('idle');
  };

  const handleViewChange = (view) => {
    if (activeView !== view) {
      setActiveView(view);
      setQuantity(1);
      setOrderStatus('idle');
    }
  };

  // Handlers for quantity buttons
  const increaseQuantity = () => {
    if (quantity < activeStock) setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const handleOrder = (e) => {
    e.preventDefault();
    setOrderStatus('processing');

    // Simulate sending data to Firebase (takes 1.5 seconds)
    setTimeout(() => {
      // Deduct from our mock stock
      setStocks(prev => ({
        ...prev,
        [selectedProductId]: prev[selectedProductId] - quantity
      }));
      setOrderStatus('success');
      setQuantity(1); // Reset form
      
      // Return to normal state after 3 seconds
      setTimeout(() => setOrderStatus('idle'), 3000);
    }, 1500);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-gray-200 bg-white p-6 shadow-sm md:flex">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-gray-800 tracking-tight flex items-center">
             Bella Erin Tube Ice
          </h2>
          <Menu className="h-5 w-5 text-gray-400" />
        </div>

        <nav className="flex-1">
          <ul className="space-y-4">
            <li>
              <button
                type="button"
                onClick={() => handleViewChange('order')}
                disabled={activeView === 'order'}
                className={`w-full flex items-center text-left p-3 rounded-lg transition-colors ${activeView === 'order' ? 'text-[#4091c9] font-bold bg-blue-50 cursor-default' : 'text-gray-600 hover:text-[#4091c9] hover:bg-blue-50/60'}`}
              >
                <ShoppingCart className="mr-3 h-5 w-5" /> Order Ice
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handleViewChange('history')}
                disabled={activeView === 'history'}
                className={`w-full flex items-center text-left p-3 rounded-lg transition-colors ${activeView === 'history' ? 'text-[#4091c9] font-bold bg-blue-50 cursor-default' : 'text-gray-600 hover:text-[#4091c9] hover:bg-blue-50/60'}`}
              >
                <Package className="mr-3 h-5 w-5" /> Order History
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handleViewChange('account')}
                disabled={activeView === 'account'}
                className={`w-full flex items-center text-left p-3 rounded-lg transition-colors ${activeView === 'account' ? 'text-[#4091c9] font-bold bg-blue-50 cursor-default' : 'text-gray-600 hover:text-[#4091c9] hover:bg-blue-50/60'}`}
              >
                <Info className="mr-3 h-5 w-5" /> My Account
              </button>
            </li>
          </ul>
        </nav>

        <div className="mt-6">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center p-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold transition-colors"
          >
            {loggingOut ? 'Logging out...' : <><LogOut className="mr-2 h-5 w-5"/> Sign Out</>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-0 flex-1 p-4 sm:p-8 overflow-x-hidden md:ml-64">
        <div className="max-w-5xl mx-auto pb-8">
          {activeView === 'order' ? (
            <>
              {/* Header / Hero Section */}
              <div className="bg-[#4091c9] rounded-3xl p-8 text-white shadow-lg mb-8 flex items-center justify-between relative overflow-hidden">
                <div className="absolute right-[-5%] top-[-20%] opacity-20">
                  <Snowflake className="w-64 h-64 animate-spin-slow" />
                </div>
                <div className="relative z-10">
                  <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
                    Place Your Order
                  </h1>
                  <p className="text-blue-100 text-lg">Select a product below to check live availability and place an order.</p>
                </div>
              </div>

              {/* PRODUCT SELECTION GRID */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">1. Select Ice Type</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {PRODUCTS.map((product) => (
                    <div 
                      key={product.id}
                      onClick={() => handleProductSelect(product.id)}
                      className={`cursor-pointer rounded-2xl p-4 border-2 transition-all duration-300 text-center flex flex-col items-center shadow-sm bg-white hover:shadow-md
                        ${selectedProductId === product.id ? 'border-[#4091c9] ring-4 ring-[#4091c9]/20 transform -translate-y-1' : 'border-gray-100 hover:border-blue-200'}`}
                    >
                      {/* Product Image */}
                      <div className="mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg p-2">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="h-full w-full object-cover"
                          // Fallback icon if image doesn't exist yet
                          onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
                        />
                        <Package className="h-10 w-10 text-gray-300 hidden" />
                      </div>
                      <h3 className={`font-bold text-sm ${selectedProductId === product.id ? 'text-[#4091c9]' : 'text-gray-700'}`}>
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">₱{product.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Product Details & Live Stock */}
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-800">2. Review Details</h2>

                  {/* Live Stock Indicator */}
                  <div className={`p-6 rounded-2xl border shadow-sm flex items-start space-x-4
                    ${activeStock > 20 ? 'bg-green-50 border-green-200' : activeStock > 0 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
                    {activeStock > 20 ? (
                      <CheckCircle className="h-8 w-8 text-green-600 mt-1" />
                    ) : (
                      <Info className={`h-8 w-8 mt-1 ${activeStock > 0 ? 'text-orange-600' : 'text-red-600'}`} />
                    )}
                    <div>
                      <h3 className="text-gray-800 font-bold text-lg">Live Availability</h3>
                      <p className={`text-3xl font-black mt-1 ${activeStock > 20 ? 'text-green-700' : activeStock > 0 ? 'text-orange-700' : 'text-red-700'}`}>
                        {activeStock} {activeStock === 1 ? 'Unit' : 'Units'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Updates instantly from our freezer load cells.</p>
                    </div>
                  </div>

                  {/* Product Description */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">{activeProduct.name}</h3>
                    <p className="text-gray-600 mb-4">{activeProduct.desc}</p>
                    <ul className="space-y-3 text-gray-600 text-sm">
                      <li className="flex items-center"><CheckCircle className="h-4 w-4 text-[#4091c9] mr-2"/> Purified & UV-Treated Water</li>
                      <li className="flex items-center"><CheckCircle className="h-4 w-4 text-[#4091c9] mr-2"/> Stored at optimal -18°C</li>
                      <li className="flex items-center"><CheckCircle className="h-4 w-4 text-[#4091c9] mr-2"/> Quality guaranteed</li>
                    </ul>
                  </div>
                </div>

                {/* Right Column: Order Form */}
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">3. Finalize Order</h2>
                  
                  <form onSubmit={handleOrder}>
                    {/* Quantity Selector */}
                    <div className="mb-8">
                      <label className="block text-gray-700 font-semibold mb-3">Select Quantity</label>
                      <div className="flex items-center space-x-4 bg-gray-50 p-2 rounded-xl border border-gray-200 w-fit">
                        <button type="button" onClick={decreaseQuantity} className="p-3 rounded-lg bg-white hover:bg-gray-100 text-gray-800 shadow-sm transition border border-gray-100">
                          <Minus className="h-5 w-5" />
                        </button>
                        <input type="number" readOnly value={quantity} className="w-16 bg-transparent text-center text-2xl font-bold focus:outline-none" />
                        <button type="button" onClick={increaseQuantity} className="p-3 rounded-lg bg-white hover:bg-gray-100 text-gray-800 shadow-sm transition border border-gray-100" disabled={quantity >= activeStock}>
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-blue-50 p-6 rounded-2xl mb-8 border border-blue-100">
                      <h4 className="text-sm font-bold text-blue-900 mb-4 uppercase tracking-wider">Order Summary</h4>
                      <div className="flex justify-between text-blue-800 mb-3 text-sm">
                        <span>{activeProduct.name} x {quantity}</span>
                        <span>₱{(activeProduct.price * quantity).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-blue-800 mb-3 text-sm">
                        <span>Delivery Fee</span>
                        <span>Calculated at checkout</span>
                      </div>
                      <div className="flex justify-between text-xl font-black text-blue-900 border-t border-blue-200 pt-4 mt-2">
                        <span>Total Amount</span>
                        <span>₱{(quantity * activeProduct.price).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button type="submit" disabled={orderStatus !== 'idle' || activeStock === 0} className={`w-full flex justify-center items-center p-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-md
                      ${orderStatus === 'idle' && activeStock > 0 ? 'bg-[#4091c9] hover:bg-[#2d75aa] hover:-translate-y-0.5 text-white' : ''}
                      ${orderStatus === 'processing' ? 'bg-[#7aa8d1] text-white cursor-not-allowed' : ''}
                      ${orderStatus === 'success' ? 'bg-green-500 text-white' : ''}
                      ${activeStock === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}
                    `}>
                      {orderStatus === 'idle' && activeStock > 0 && <><ShoppingCart className="mr-2 h-6 w-6" /> Confirm Order</>}
                      {orderStatus === 'processing' && <><Snowflake className="mr-2 h-6 w-6 animate-spin" /> Processing...</>}
                      {orderStatus === 'success' && <><CheckCircle className="mr-2 h-6 w-6" /> Order Successful!</>}
                      {activeStock === 0 && 'Out of Stock'}
                    </button>
                  </form>
                </div>
              </div>
            </>
          ) : activeView === 'history' ? (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Order History</h2>
              <p className="text-gray-600">Your recent orders will appear here soon.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">My Account</h2>
              <p className="text-gray-600">Manage your account and delivery preferences here.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}