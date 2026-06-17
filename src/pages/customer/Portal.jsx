import { useState } from 'react';
import { ShoppingCart, CheckCircle, Plus, Minus, Snowflake, Info, Package } from 'lucide-react';

export default function CustomerPortal() {
  // Mock Data (Will connect to Firebase later)
  const [availableSacks, setAvailableSacks] = useState(124);
  const pricePerSack = 150; // Set your local currency price here (e.g., PHP 150)
  
  // App States
  const [quantity, setQuantity] = useState(1);
  const [orderStatus, setOrderStatus] = useState('idle'); // 'idle', 'processing', 'success'

  // Handlers for quantity buttons
  const increaseQuantity = () => {
    if (quantity < availableSacks) setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const handleOrder = (e) => {
    e.preventDefault();
    setOrderStatus('processing');

    // Simulate sending data to a backend/Firebase (takes 1.5 seconds)
    setTimeout(() => {
      setAvailableSacks(prev => prev - quantity);
      setOrderStatus('success');
      setQuantity(1); // Reset form
      
      // Return to normal state after 3 seconds
      setTimeout(() => setOrderStatus('idle'), 3000);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4">
      
      {/* Header / Hero Section */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-8 text-white shadow-lg mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Snowflake className="mr-3 h-8 w-8 animate-spin-slow" /> 
            Premium Tube Ice
          </h1>
          <p className="text-blue-100">Order high-quality, filtered ice straight from our facility.</p>
        </div>
        <div className="hidden md:block">
          <Package className="h-16 w-16 text-blue-200 opacity-50" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Product Details & Live Stock */}
        <div className="space-y-6">
          {/* Live Stock Indicator */}
          <div className={`p-6 rounded-xl border shadow-sm flex items-start space-x-4
            ${availableSacks > 20 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            {availableSacks > 20 ? (
              <CheckCircle className="h-8 w-8 text-green-600 mt-1" />
            ) : (
              <Info className="h-8 w-8 text-orange-600 mt-1" />
            )}
            <div>
              <h3 className="text-gray-800 font-bold text-lg">Live Availability</h3>
              <p className={`text-3xl font-black mt-1 ${availableSacks > 20 ? 'text-green-700' : 'text-orange-700'}`}>
                {availableSacks} Sacks
              </p>
              <p className="text-sm text-gray-600 mt-1">Updates instantly from our freezer load cells.</p>
            </div>
          </div>

          {/* Product Description */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Product Details</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center"><CheckCircle className="h-5 w-5 text-blue-500 mr-2"/> 50kg per sack</li>
              <li className="flex items-center"><CheckCircle className="h-5 w-5 text-blue-500 mr-2"/> Purified & UV-Treated Water</li>
              <li className="flex items-center"><CheckCircle className="h-5 w-5 text-blue-500 mr-2"/> Perfect for coolers & events</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Order Form */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Place Your Order</h2>
          
          <form onSubmit={handleOrder}>
            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-3">Quantity</label>
              <div className="flex items-center space-x-4">
                <button 
                  type="button" 
                  onClick={decreaseQuantity}
                  className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 transition"
                >
                  <Minus className="h-5 w-5" />
                </button>
                
                <input 
                  type="number"
                  readOnly
                  value={quantity}
                  className="w-20 text-center text-2xl font-bold p-2 border-b-2 border-blue-500 focus:outline-none"
                />
                
                <button 
                  type="button" 
                  onClick={increaseQuantity}
                  className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 transition"
                  disabled={quantity >= availableSacks}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-100">
              <div className="flex justify-between text-gray-600 mb-2">
                <span>Price per sack</span>
                <span>₱{pricePerSack.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-800 border-t pt-2 mt-2">
                <span>Total Amount</span>
                <span className="text-blue-600">₱{(quantity * pricePerSack).toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={orderStatus !== 'idle' || availableSacks === 0}
              className={`w-full flex justify-center items-center p-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-md
                ${orderStatus === 'idle' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                ${orderStatus === 'processing' ? 'bg-blue-400 text-white cursor-not-allowed' : ''}
                ${orderStatus === 'success' ? 'bg-green-500 text-white' : ''}
                ${availableSacks === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : ''}
              `}
            >
              {orderStatus === 'idle' && <><ShoppingCart className="mr-2 h-6 w-6" /> Confirm Order</>}
              {orderStatus === 'processing' && <><Snowflake className="mr-2 h-6 w-6 animate-spin" /> Processing...</>}
              {orderStatus === 'success' && <><CheckCircle className="mr-2 h-6 w-6" /> Order Successful!</>}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}