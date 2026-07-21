import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth';
import { addDoc, collection, deleteField, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { ShoppingCart, CheckCircle, Plus, Minus, Snowflake, Info, Package, LogOut, Clock3, ReceiptText, X, ChevronDown, MapPin, ShieldCheck, Trash2 } from 'lucide-react';

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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountSection, setAccountSection] = useState('profile');
  const [accountInfo, setAccountInfo] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    gender: '',
    dateOfBirth: '',
  });
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState({
    id: null,
    label: 'Home',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    isDefault: false,
  });
  const [addressEditingId, setAddressEditingId] = useState(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMessage, setAccountMessage] = useState('');
  const [accountError, setAccountError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

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

    const loadUserAccount = async (userId, userEmail) => {
      try {
        const userDoc = doc(db, 'users', userId);
        const snapshot = await getDoc(userDoc);
        if (snapshot.exists()) {
          const data = snapshot.data();
          const loadedAddresses = Array.isArray(data.addresses) ? data.addresses : [];
          setAccountInfo({
            firstName: data.firstName || '',
            middleName: data.middleName || '',
            lastName: data.lastName || '',
            email: data.email || userEmail || '',
            contactNumber: data.contactNumber || '',
            gender: data.gender || '',
            dateOfBirth: data.dateOfBirth || '',
          });
          setAddresses(loadedAddresses);
        } else {
          setAccountInfo({
            firstName: '',
            middleName: '',
            lastName: '',
            email: userEmail || '',
            contactNumber: '',
            gender: '',
            dateOfBirth: '',
          });
          setAddresses([]);
        }
      } catch (error) {
        console.error('Failed to load account info', error);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeOrders) {
        unsubscribeOrders();
        unsubscribeOrders = null;
      }

      if (!user) {
        setOrders([]);
        setOrdersLoading(false);
        setOrdersError('');
        navigate('/login', { replace: true });
        return;
      }

      loadUserAccount(user.uid, user.email);

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
  }, [navigate]);

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
    setAccountMenuOpen(false);
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

  const getFullName = () => [accountInfo.firstName, accountInfo.middleName, accountInfo.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

  const persistAccountData = async (nextAddresses = addresses, nextDefaultAddressId = null) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Please sign in before saving account details.');
    }

    const normalizedAddresses = (nextAddresses || []).map((address) => ({
      ...address,
      id: address.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }));
    const resolvedDefaultAddressId = nextDefaultAddressId || normalizedAddresses.find((address) => address.isDefault)?.id || null;

    const payload = {
      firstName: accountInfo.firstName || '',
      middleName: accountInfo.middleName || '',
      lastName: accountInfo.lastName || '',
      email: currentUser.email || accountInfo.email || '',
      contactNumber: accountInfo.contactNumber || '',
      gender: accountInfo.gender || '',
      dateOfBirth: accountInfo.dateOfBirth || '',
      addresses: normalizedAddresses,
      defaultAddressId: resolvedDefaultAddressId,
      updatedAt: serverTimestamp(),
    };

    if (accountInfo.address) {
      payload.address = accountInfo.address;
    } else {
      payload.address = deleteField();
    }

    const userDoc = doc(db, 'users', currentUser.uid);
    await setDoc(userDoc, payload, { merge: true });
    return payload;
  };

  const handleOrder = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setOrdersError('Please sign in to place an order.');
      return;
    }

    const fullName = getFullName();

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
          customerName: fullName || currentUser.displayName || currentUser.email || 'Customer',
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

  const handleAccountChange = (field, value) => {
    setAccountInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, value) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetAddressForm = () => {
    setAddressEditingId(null);
    setAddressForm({
      id: null,
      label: 'Home',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      isDefault: false,
    });
  };

  const startEditingAddress = (address) => {
    setAddressEditingId(address.id);
    setAddressForm({ ...address });
  };

  const handleAddressSave = async (e) => {
    e.preventDefault();
    if (!addressForm.street.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.postalCode.trim()) {
      setAccountError('Please fill out the street, city, state, and postal code for the address.');
      setAccountMessage('');
      return;
    }

    setAccountSaving(true);
    setAccountError('');
    setAccountMessage('');

    try {
      const nextAddresses = [...addresses];
      const normalizedAddress = {
        ...addressForm,
        id: addressForm.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        street: addressForm.street.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        postalCode: addressForm.postalCode.trim(),
        country: addressForm.country.trim(),
        label: addressForm.label.trim() || 'Home',
      };

      if (normalizedAddress.isDefault) {
        nextAddresses.forEach((address) => {
          address.isDefault = false;
        });
      }

      const existingIndex = nextAddresses.findIndex((address) => address.id === normalizedAddress.id);
      if (existingIndex >= 0) {
        nextAddresses[existingIndex] = normalizedAddress;
      } else {
        nextAddresses.push(normalizedAddress);
      }

      const nextDefaultAddressId = normalizedAddress.isDefault ? normalizedAddress.id : null;
      setAddresses(nextAddresses);
      await persistAccountData(nextAddresses, nextDefaultAddressId);
      setAccountMessage(addressEditingId ? 'Address updated successfully.' : 'Address added successfully.');
      resetAddressForm();
    } catch (error) {
      console.error('Failed to save address', error);
      setAccountError('Unable to save the address right now.');
    } finally {
      setAccountSaving(false);
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    const nextAddresses = addresses.map((address) => ({
      ...address,
      isDefault: address.id === addressId,
    }));

    setAddresses(nextAddresses);
    try {
      await persistAccountData(nextAddresses, addressId);
      setAccountMessage('Default address updated.');
      setAccountError('');
    } catch (error) {
      console.error('Failed to set default address', error);
      setAccountError('Unable to update the default address.');
    }
  };

  const handleRemoveAddress = async (addressId) => {
    const nextAddresses = addresses.filter((address) => address.id !== addressId);
    const fallbackDefault = nextAddresses[0]?.id || null;
    setAddresses(nextAddresses);
    try {
      await persistAccountData(nextAddresses, fallbackDefault);
      setAccountMessage('Address removed.');
      setAccountError('');
    } catch (error) {
      console.error('Failed to remove address', error);
      setAccountError('Unable to remove the address.');
    }
  };

  const handleAccountSave = async (e) => {
    e.preventDefault();
    setAccountSaving(true);
    setAccountMessage('');
    setAccountError('');

    try {
      await persistAccountData(addresses);
      setAccountMessage('Profile saved successfully. You can come back anytime to update it.');
      setAccountError('');
    } catch (error) {
      console.error('Failed to save account info', error);
      setAccountError(error.message || 'Unable to save account information. Please try again.');
      setAccountMessage('');
    } finally {
      setAccountSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;

    if (!currentUser?.email) {
      setPasswordError('Please sign in again before changing your password.');
      setPasswordMessage('');
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Please complete all password fields.');
      setPasswordMessage('');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Your new password must be at least 6 characters long.');
      setPasswordMessage('');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      setPasswordMessage('');
      return;
    }

    setPasswordSaving(true);
    setPasswordError('');
    setPasswordMessage('');

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage('Password changed successfully.');
    } catch (error) {
      console.error('Password change failed', error);
      if (error?.code === 'auth/wrong-password') {
        setPasswordError('Your current password is incorrect.');
      } else if (error?.code === 'auth/requires-recent-login') {
        setPasswordError('Please sign in again and try changing your password.');
      } else {
        setPasswordError('Unable to change your password right now.');
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Bella Erin Tube Ice Logo"
              className="h-14 w-auto"
            />
          </div>

          <nav className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleViewChange('order')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeView === 'order' ? 'bg-[#4091c9] text-white shadow-sm' : 'text-gray-700 hover:bg-blue-50 hover:text-[#4091c9]'}`}
            >
              Order Ice
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('orders')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeView === 'orders' ? 'bg-[#4091c9] text-white shadow-sm' : 'text-gray-700 hover:bg-blue-50 hover:text-[#4091c9]'}`}
            >
              My Orders
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen((prev) => !prev);
                  setActiveView('account');
                  setAccountSection('profile');
                }}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${activeView === 'account' ? 'bg-[#4091c9] text-white shadow-sm' : 'text-gray-700 hover:bg-blue-50 hover:text-[#4091c9]'}`}
              >
                My Account
                <ChevronDown className="h-4 w-4" />
              </button>
              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountSection('profile');
                      setActiveView('account');
                      setAccountMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-[#4091c9]"
                  >
                    <Info className="h-4 w-4" /> Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountSection('addresses');
                      setActiveView('account');
                      setAccountMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-[#4091c9]"
                  >
                    <MapPin className="h-4 w-4" /> Addresses
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountSection('password');
                      setActiveView('account');
                      setAccountMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-[#4091c9]"
                  >
                    <ShieldCheck className="h-4 w-4" /> Change Password
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#4091c9] hover:text-[#4091c9]"
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cartItemCount > 0 && (
                <span className="rounded-full bg-[#4091c9] px-2 py-0.5 text-xs text-white">
                  {cartItemCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl pb-8">
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
                <h2 className="text-xl font-bold text-gray-800 mb-4">Select Ice Type</h2>
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
                  <h2 className="text-xl font-bold text-gray-800">Review Details</h2>

                  

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
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Quantity</h2>

                  <form onSubmit={addToCart}>
                    <div className="mb-6">
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
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">My Account</h2>
                  <p className="text-gray-600">Manage your profile, delivery addresses, and password from one place.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountSection('profile')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${accountSection === 'profile' ? 'bg-[#4091c9] text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-[#4091c9]'}`}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountSection('addresses')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${accountSection === 'addresses' ? 'bg-[#4091c9] text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-[#4091c9]'}`}
                  >
                    Addresses
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountSection('password')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${accountSection === 'password' ? 'bg-[#4091c9] text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-[#4091c9]'}`}
                  >
                    Change Password
                  </button>
                </div>
              </div>

              {accountError && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {accountError}
                </div>
              )}
              {accountMessage && (
                <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                  {accountMessage}
                </div>
              )}

              {accountSection === 'profile' && (
                <form onSubmit={handleAccountSave} className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <label className="block">
                      <span className="text-gray-700 font-semibold">First Name</span>
                      <input
                        value={accountInfo.firstName}
                        onChange={(e) => handleAccountChange('firstName', e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                        placeholder="Jane"
                      />
                    </label>

                    <label className="block">
                      <span className="text-gray-700 font-semibold">Middle Name</span>
                      <input
                        value={accountInfo.middleName}
                        onChange={(e) => handleAccountChange('middleName', e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                        placeholder="A."
                      />
                    </label>

                    <label className="block">
                      <span className="text-gray-700 font-semibold">Last Name</span>
                      <input
                        value={accountInfo.lastName}
                        onChange={(e) => handleAccountChange('lastName', e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                        placeholder="Doe"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block">
                      <span className="text-gray-700 font-semibold">Email</span>
                      <input
                        value={accountInfo.email}
                        onChange={(e) => handleAccountChange('email', e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                        placeholder="you@example.com"
                      />
                    </label>

                    <label className="block">
                      <span className="text-gray-700 font-semibold">Phone Number</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={accountInfo.contactNumber}
                        onChange={(e) => handleAccountChange('contactNumber', e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                        placeholder="09XXXXXXXXX"
                        autoComplete="tel"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block">
                      <span className="text-gray-700 font-semibold">Gender</span>
                      <select
                        value={accountInfo.gender}
                        onChange={(e) => handleAccountChange('gender', e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                      >
                        <option value="">Select gender</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-gray-700 font-semibold">Date of Birth</span>
                      <input
                        type="date"
                        value={accountInfo.dateOfBirth}
                        onChange={(e) => handleAccountChange('dateOfBirth', e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={accountSaving}
                    className={`inline-flex items-center justify-center rounded-2xl px-6 py-4 text-white font-bold transition ${accountSaving ? 'bg-[#7aa8d1] cursor-not-allowed' : 'bg-[#4091c9] hover:bg-[#2d75aa]'}`}
                  >
                    {accountSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </form>
              )}

              {accountSection === 'addresses' && (
                <div className="space-y-6">
                  <form onSubmit={handleAddressSave} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-800">{addressEditingId ? 'Edit address' : 'Add a new address'}</h3>
                      {addressEditingId && (
                        <button type="button" onClick={resetAddressForm} className="text-sm font-semibold text-[#4091c9]">
                          Cancel edit
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-semibold text-gray-700">Label</span>
                        <input
                          value={addressForm.label}
                          onChange={(e) => handleAddressChange('label', e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                          placeholder="Home, Office, etc."
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-gray-700">Street / Building</span>
                        <input
                          value={addressForm.street}
                          onChange={(e) => handleAddressChange('street', e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                          placeholder="123 Sample Street"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-gray-700">City</span>
                        <input
                          value={addressForm.city}
                          onChange={(e) => handleAddressChange('city', e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                          placeholder="Quezon City"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-gray-700">State / Province</span>
                        <input
                          value={addressForm.state}
                          onChange={(e) => handleAddressChange('state', e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                          placeholder="Metro Manila"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-gray-700">Postal Code</span>
                        <input
                          value={addressForm.postalCode}
                          onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                          placeholder="1111"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-gray-700">Country</span>
                        <input
                          value={addressForm.country}
                          onChange={(e) => handleAddressChange('country', e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                          placeholder="Philippines"
                        />
                      </label>
                    </div>

                    <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={addressForm.isDefault}
                        onChange={(e) => handleAddressChange('isDefault', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#4091c9] focus:ring-[#4091c9]"
                      />
                      Set as default address
                    </label>

                    <button
                      type="submit"
                      disabled={accountSaving}
                      className={`mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition ${accountSaving ? 'bg-[#7aa8d1] cursor-not-allowed' : 'bg-[#4091c9] hover:bg-[#2d75aa]'}`}
                    >
                      <Plus className="h-4 w-4" /> {addressEditingId ? 'Update Address' : 'Add Address'}
                    </button>
                  </form>

                  <div className="space-y-3">
                    {addresses.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                        No addresses yet. Add your first delivery location above.
                      </div>
                    ) : (
                      addresses.map((address) => (
                        <div key={address.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-800">{address.label || 'Address'}</p>
                                {address.isDefault && (
                                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-sm text-gray-600">{address.street}</p>
                              <p className="text-sm text-gray-600">{[address.city, address.state, address.postalCode, address.country].filter(Boolean).join(', ')}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {!address.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(address.id)}
                                  className="rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-[#4091c9] hover:text-[#4091c9]"
                                >
                                  Set as default
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => startEditingAddress(address)}
                                className="rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-[#4091c9] hover:text-[#4091c9]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveAddress(address.id)}
                                className="rounded-full border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="mr-1 inline h-4 w-4" /> Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {accountSection === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="max-w-xl rounded-2xl border border-gray-200 bg-gray-50 p-6">
                  {passwordError && (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {passwordError}
                    </div>
                  )}
                  {passwordMessage && (
                    <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                      {passwordMessage}
                    </div>
                  )}

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Current Password</span>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="text-sm font-semibold text-gray-700">New Password</span>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="text-sm font-semibold text-gray-700">Confirm New Password</span>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className={`mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition ${passwordSaving ? 'bg-[#7aa8d1] cursor-not-allowed' : 'bg-[#4091c9] hover:bg-[#2d75aa]'}`}
                  >
                    <ShieldCheck className="h-4 w-4" /> {passwordSaving ? 'Updating...' : 'Change Password'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      <div className={`fixed inset-0 z-40 transition ${isCartOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/50 transition ${isCartOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsCartOpen(false)}
        />
        <aside className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Your Cart</h3>
              <p className="text-sm text-gray-500">{cartItemCount} item{cartItemCount === 1 ? '' : 's'} ready for checkout</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {cartItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
                <p className="font-semibold text-gray-800">Your cart is empty</p>
                <p className="mt-2">Add some ice products first, then come back here to review and place your order.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => {
                  const product = PRODUCTS.find((entry) => entry.id === item.productId);
                  return (
                    <div key={item.productId} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-800">{product?.name}</p>
                          <p className="text-sm text-gray-500">₱{(product?.price ?? 0).toFixed(2)} each</p>
                        </div>
                        <button type="button" onClick={() => removeFromCart(item.productId)} className="text-sm font-semibold text-red-600 hover:text-red-700">
                          Remove
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => updateCartItemQuantity(item.productId, -1)} className="h-8 w-8 rounded-full bg-white text-gray-700 shadow-sm transition hover:bg-gray-100">
                            <Minus className="mx-auto h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-semibold text-gray-800">{item.quantity}</span>
                          <button type="button" onClick={() => updateCartItemQuantity(item.productId, 1)} className="h-8 w-8 rounded-full bg-white text-gray-700 shadow-sm transition hover:bg-gray-100" disabled={getRemainingStockForProduct(item.productId) <= 0}>
                            <Plus className="mx-auto h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">₱{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-6 py-5">
            <div className="mb-4 flex items-center justify-between text-lg font-bold text-gray-800">
              <span>Total</span>
              <span>₱{cartSubtotal.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={handleOrder}
              disabled={orderStatus !== 'idle' || cartItems.length === 0}
              className={`flex w-full items-center justify-center rounded-2xl p-4 font-bold text-lg transition ${orderStatus === 'idle' && cartItems.length > 0 ? 'bg-[#4091c9] text-white hover:bg-[#2d75aa]' : ''} ${orderStatus === 'processing' ? 'cursor-not-allowed bg-[#7aa8d1] text-white' : ''} ${orderStatus === 'success' ? 'bg-green-500 text-white' : ''} ${cartItems.length === 0 ? 'cursor-not-allowed bg-gray-200 text-gray-500' : ''}`}
            >
              {orderStatus === 'idle' && cartItems.length > 0 && <><ShoppingCart className="mr-2 h-5 w-5" /> Check Out</>}
              {orderStatus === 'processing' && <><Snowflake className="mr-2 h-5 w-5 animate-spin" /> Processing...</>}
              {orderStatus === 'success' && <><CheckCircle className="mr-2 h-5 w-5" /> Order Successful!</>}
              {cartItems.length === 0 && 'Add Items to Cart'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}