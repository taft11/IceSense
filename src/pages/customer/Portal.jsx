import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { ShoppingCart, CheckCircle, Plus, Minus, Snowflake, Info, Package, LogOut, Menu, Clock3, ReceiptText } from 'lucide-react';

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
  const [cartItems, setCartItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [orderStatus, setOrderStatus] = useState('idle'); // 'idle', 'processing', 'success'
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeView, setActiveView] = useState('order');

  // Get the details of the currently selected product
  const activeProduct = PRODUCTS.find((p) => p.id === selectedProductId);
  const activeStock = Math.max(0, (stocks[selectedProductId] || 0) - cartItems.filter((item) => item.productId === selectedProductId).reduce((sum, item) => sum + item.quantity, 0));
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const getRemainingStockForProduct = (productId) => {
    const currentCartQty = cartItems
      .filter((item) => item.productId === productId)
      .reduce((total, item) => total + item.quantity, 0);

    return stocks[productId] - currentCartQty;
  };

  useEffect(() => {
    let unsubscribeOrders = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeOrders) {
        unsubscribeOrders();
        unsubscribeOrders = null;
      }

      if (!user) {
        setOrders([]);
        setOrdersLoading(false);
        setOrdersError('');
        return;
      }

      setOrdersLoading(true);
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('userId', '==', user.uid));
      unsubscribeOrders = onSnapshot(
        q,
        (snapshot) => {
          const parsedOrders = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (b.createdAt?.toMillis?.() || b.createdAt || 0) - (a.createdAt?.toMillis?.() || a.createdAt || 0));

          setOrders(parsedOrders);
          setOrdersLoading(false);
          setOrdersError('');
        },
        (error) => {
          console.error('Unable to load orders', error);
          setOrdersError('Unable to load your orders right now.');
          setOrdersLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
      unsubscribeAuth();
    };
  }, []);

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

  const addToCart = (e) => {
    e.preventDefault();
    if (!activeProduct) return;

    const remainingStock = getRemainingStockForProduct(selectedProductId);
    const qtyToAdd = Math.min(quantity, Math.max(remainingStock, 0));

    if (qtyToAdd <= 0) return;

    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.productId === selectedProductId);

      if (existingItem) {
        return prev.map((item) =>
          item.productId === selectedProductId
            ? { ...item, quantity: item.quantity + qtyToAdd }
            : item
        );
      }

      return [
        ...prev,
        {
          productId: selectedProductId,
          name: activeProduct.name,
          price: activeProduct.price,
          quantity: qtyToAdd,
        },
      ];
    });

    setQuantity(1);
    setOrderStatus('idle');
  };

  const updateCartItemQuantity = (productId, delta) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.productId === productId);
      if (!existingItem) return prev;

      if (delta < 0) {
        if (existingItem.quantity <= 1) {
          return prev.filter((item) => item.productId !== productId);
        }

        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }

      const remainingStock = getRemainingStockForProduct(productId);
      if (remainingStock <= 0) return prev;

      return prev.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
      );
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleOrder = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setOrdersError('Please sign in to place an order.');
      return;
    }

    setOrderStatus('processing');

    setTimeout(async () => {
      try {
        const ordersRef = collection(db, 'orders');
        const orderPayload = {
          userId: currentUser.uid,
          items: cartItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          total: cartSubtotal,
          status: 'Placed',
          createdAt: serverTimestamp(),
          customerName: currentUser.displayName || currentUser.email || 'Customer',
          customerEmail: currentUser.email || '',
        };

        await addDoc(ordersRef, orderPayload);

        setStocks((prev) => {
          const nextStocks = { ...prev };

          cartItems.forEach((item) => {
            nextStocks[item.productId] = Math.max(0, prev[item.productId] - item.quantity);
          });

          return nextStocks;
        });

        setCartItems([]);
        setOrderStatus('success');
        setQuantity(1);
        setOrdersError('');

        setTimeout(() => setOrderStatus('idle'), 3000);
      } catch (error) {
        console.error('Order submission failed', error);
        setOrdersError('Your order could not be saved. Please try again.');
        setOrderStatus('idle');
      }
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
               Order Ice
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handleViewChange('orders')}
                disabled={activeView === 'orders'}
                className={`w-full flex items-center text-left p-3 rounded-lg transition-colors ${activeView === 'orders' ? 'text-[#4091c9] font-bold bg-blue-50 cursor-default' : 'text-gray-600 hover:text-[#4091c9] hover:bg-blue-50/60'}`}
              >
                My Orders
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handleViewChange('account')}
                disabled={activeView === 'account'}
                className={`w-full flex items-center text-left p-3 rounded-lg transition-colors ${activeView === 'account' ? 'text-[#4091c9] font-bold bg-blue-50 cursor-default' : 'text-gray-600 hover:text-[#4091c9] hover:bg-blue-50/60'}`}
              >
                My Account
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
            {loggingOut ? 'Logging out...' : <> Sign Out</>}
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
                </div>
                <div className="relative z-10">
                  <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
                    Place Your Order
                  </h1>
                  <p className="text-blue-100 text-lg">Select a product below to place an order.</p>
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

                {/* Right Column: Cart Builder */}
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">3. Build Your Cart</h2>

                  <form onSubmit={addToCart}>
                    <div className="mb-6">
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

                    <button type="submit" disabled={orderStatus !== 'idle' || activeStock === 0 || getRemainingStockForProduct(selectedProductId) <= 0} className={`w-full flex justify-center items-center p-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-md mb-6
                      ${orderStatus === 'idle' && activeStock > 0 && getRemainingStockForProduct(selectedProductId) > 0 ? 'bg-[#4091c9] hover:bg-[#2d75aa] hover:-translate-y-0.5 text-white' : ''}
                      ${orderStatus === 'processing' ? 'bg-[#7aa8d1] text-white cursor-not-allowed' : ''}
                      ${orderStatus === 'success' ? 'bg-green-500 text-white' : ''}
                      ${activeStock === 0 || getRemainingStockForProduct(selectedProductId) <= 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}
                    `}>
                      {orderStatus === 'idle' && activeStock > 0 && getRemainingStockForProduct(selectedProductId) > 0 && <><ShoppingCart className="mr-2 h-6 w-6" /> Add to Cart</>}
                      {orderStatus === 'processing' && <><Snowflake className="mr-2 h-6 w-6 animate-spin" /> Processing...</>}
                      {orderStatus === 'success' && <><CheckCircle className="mr-2 h-6 w-6" /> Added to Cart</>}
                      {(activeStock === 0 || getRemainingStockForProduct(selectedProductId) <= 0) && 'Out of Stock'}
                    </button>
                  </form>

                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Cart Summary</h4>
                        <p className="text-sm text-blue-700">{cartItemCount} item{cartItemCount === 1 ? '' : 's'} selected</p>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#4091c9]">
                        {cartItems.length} {cartItems.length === 1 ? 'product' : 'products'}
                      </div>
                    </div>

                    {cartItems.length === 0 ? (
                      <p className="text-sm text-blue-800">Your cart is empty. Add a product to start building your order.</p>
                    ) : (
                      <div className="space-y-3">
                        {cartItems.map((item) => {
                          const product = PRODUCTS.find((entry) => entry.id === item.productId);
                          return (
                            <div key={item.productId} className="rounded-xl bg-white p-3 shadow-sm border border-blue-100">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-gray-800">{product?.name}</p>
                                  <p className="text-sm text-gray-500">₱{(product?.price ?? 0).toFixed(2)} each</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => updateCartItemQuantity(item.productId, -1)} className="h-8 w-8 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
                                    <Minus className="h-4 w-4 mx-auto" />
                                  </button>
                                  <span className="w-8 text-center font-semibold text-gray-800">{item.quantity}</span>
                                  <button type="button" onClick={() => updateCartItemQuantity(item.productId, 1)} className="h-8 w-8 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition" disabled={getRemainingStockForProduct(item.productId) <= 0}>
                                    <Plus className="h-4 w-4 mx-auto" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span className="font-semibold text-gray-800">₱{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                              <button type="button" onClick={() => removeFromCart(item.productId)} className="mt-2 text-sm font-semibold text-red-600 hover:text-red-700">
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex justify-between text-xl font-black text-blue-900 border-t border-blue-200 pt-4 mt-4">
                      <span>Total</span>
                      <span>₱{cartSubtotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button type="button" onClick={handleOrder} disabled={orderStatus !== 'idle' || cartItems.length === 0} className={`mt-6 w-full flex justify-center items-center p-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-md
                    ${orderStatus === 'idle' && cartItems.length > 0 ? 'bg-[#4091c9] hover:bg-[#2d75aa] hover:-translate-y-0.5 text-white' : ''}
                    ${orderStatus === 'processing' ? 'bg-[#7aa8d1] text-white cursor-not-allowed' : ''}
                    ${orderStatus === 'success' ? 'bg-green-500 text-white' : ''}
                    ${cartItems.length === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}
                  `}>
                    {orderStatus === 'idle' && cartItems.length > 0 && <><ShoppingCart className="mr-2 h-6 w-6" /> Place Order</>}
                    {orderStatus === 'processing' && <><Snowflake className="mr-2 h-6 w-6 animate-spin" /> Processing...</>}
                    {orderStatus === 'success' && <><CheckCircle className="mr-2 h-6 w-6" /> Order Successful!</>}
                    {cartItems.length === 0 && 'Add Items to Cart'}
                  </button>
                </div>
              </div>
            </>
          ) : activeView === 'orders' ? (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">My Orders</h2>
                  <p className="text-gray-600">View every order you have placed through the portal.</p>
                </div>
                <div className="rounded-full bg-blue-50 p-3 text-[#4091c9]">
                  <ReceiptText className="h-6 w-6" />
                </div>
              </div>

              {ordersError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {ordersError}
                </div>
              )}

              {ordersLoading ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                  Loading your orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
                  <p className="font-semibold text-gray-800">No orders yet</p>
                  <p className="mt-2">Your recent orders will appear here after you place your first one.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-[#4091c9]" />
                            <p className="text-sm font-semibold text-gray-700">
                              {new Date(order.createdAt?.toMillis?.() || order.createdAt || 0).toLocaleString()}
                            </p>
                          </div>
                          <p className="mt-2 text-lg font-bold text-gray-900">Order #{order.id?.slice(0, 6).toUpperCase()}</p>
                          <p className="text-sm text-gray-600">Status: {order.status || 'Placed'}</p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-sm text-gray-500">Total</p>
                          <p className="text-xl font-black text-[#4091c9]">₱{Number(order.total || 0).toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {(order.items || []).map((item, index) => (
                          <div key={`${order.id}-${index}`} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                            <span>{item.name} × {item.quantity}</span>
                            <span>₱{Number(item.price * item.quantity || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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