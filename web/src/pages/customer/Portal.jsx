import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { PRODUCTS } from './data/products';
import HeaderNav from './components/HeaderNav';
import OrderView from './components/OrderView';
import OrderHistoryView from './components/OrderHistoryView';
import AccountView from './components/AccountView';
import CartSidebar from './components/CartSidebar';

export default function CustomerPortal() {
  const navigate = useNavigate();
  const location = useLocation();

  const [stocks, setStocks] = useState({
    'tube-5': 85,
    'tube-35': 42,
    'tube-50': 124,
    'crushed-crate': 15,
    'crushed-sack': 60,
  });

  const [selectedProductId, setSelectedProductId] = useState('tube-50');
  const [quantity, setQuantity] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [orderStatus, setOrderStatus] = useState('idle');
  const [loggingOut, setLoggingOut] = useState(false);
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

  const activeProduct = PRODUCTS.find((product) => product.id === selectedProductId);
  const activeStock = Math.max(0, (stocks[selectedProductId] || 0) - cartItems.filter((item) => item.productId === selectedProductId).reduce((sum, item) => sum + item.quantity, 0));
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const getRemainingStockForProduct = (productId) => {
    const currentCartQty = cartItems
      .filter((item) => item.productId === productId)
      .reduce((total, item) => total + item.quantity, 0);

    return stocks[productId] - currentCartQty;
  };

  // Determine active view from URL path
  const getActiveViewFromPath = () => {
    const path = location.pathname;
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/account')) return 'account';
    return 'order';
  };

  const activeView = getActiveViewFromPath();

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
    } catch (error) {
      setLoggingOut(false);
      console.error('Logout failed', error);
    }
  };

  const handleProductSelect = (productId) => {
    setSelectedProductId(productId);
    setQuantity(1);
    setOrderStatus('idle');
  };

  const handleViewChange = (view) => {
    const viewPaths = {
      order: '/portal',
      orders: '/portal/orders',
      account: '/portal/account',
    };
    navigate(viewPaths[view] || '/portal');
    setQuantity(1);
    setOrderStatus('idle');
    setAccountMenuOpen(false);
  };

  const handleToggleAccountMenu = () => {
    setAccountMenuOpen((prev) => !prev);
    navigate('/portal/account');
  };

  const handleSelectAccountSection = (section) => {
    setAccountSection(section);
    navigate('/portal/account');
    setAccountMenuOpen(false);
  };

  const increaseQuantity = () => {
    if (quantity < activeStock) setQuantity((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity((prev) => prev - 1);
  };

  const addToCart = (event) => {
    event.preventDefault();
    if (!activeProduct) return;

    const remainingStock = getRemainingStockForProduct(selectedProductId);
    const qtyToAdd = Math.min(quantity, Math.max(remainingStock, 0));

    if (qtyToAdd <= 0) return;

    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.productId === selectedProductId);

      if (existingItem) {
        return prev.map((item) =>
          item.productId === selectedProductId ? { ...item, quantity: item.quantity + qtyToAdd } : item
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
      ...accountInfo,
      email: currentUser.email || accountInfo.email || '',
      gender: accountInfo.gender || '',
      dateOfBirth: accountInfo.dateOfBirth || '',
      addresses: normalizedAddresses,
      defaultAddressId: resolvedDefaultAddressId,
      updatedAt: serverTimestamp(),
    };

    const userDoc = doc(db, 'users', currentUser.uid);
    await setDoc(userDoc, payload, { merge: true });
    return payload;
  };

  const handleOrder = (event) => {
    event.preventDefault();
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

  const handleAddressSave = async (event) => {
    event.preventDefault();
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

  const handleAccountSave = async (event) => {
    event.preventDefault();
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

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
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
      <HeaderNav
        activeView={activeView}
        onViewChange={handleViewChange}
        accountMenuOpen={accountMenuOpen}
        onToggleAccountMenu={handleToggleAccountMenu}
        onSelectAccountSection={handleSelectAccountSection}
        onOpenCart={() => setIsCartOpen(true)}
        cartItemCount={cartItemCount}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl pb-8">
          {activeView === 'order' ? (
            <OrderView
              products={PRODUCTS}
              selectedProductId={selectedProductId}
              onSelect={handleProductSelect}
              activeProduct={activeProduct}
              activeStock={activeStock}
              quantity={quantity}
              onDecrease={decreaseQuantity}
              onIncrease={increaseQuantity}
              onAddToCart={addToCart}
              orderStatus={orderStatus}
              remainingStock={getRemainingStockForProduct(selectedProductId)}
            />
          ) : activeView === 'orders' ? (
            <OrderHistoryView
              orders={orders}
              ordersLoading={ordersLoading}
              ordersError={ordersError}
            />
          ) : (
            <AccountView
              accountSection={accountSection}
              onSetAccountSection={setAccountSection}
              accountInfo={accountInfo}
              onAccountChange={handleAccountChange}
              onAccountSave={handleAccountSave}
              accountSaving={accountSaving}
              accountError={accountError}
              accountMessage={accountMessage}
              addresses={addresses}
              addressForm={addressForm}
              onAddressChange={handleAddressChange}
              addressEditingId={addressEditingId}
              onResetAddressForm={resetAddressForm}
              onAddressSave={handleAddressSave}
              onSetDefaultAddress={handleSetDefaultAddress}
              onRemoveAddress={handleRemoveAddress}
              onStartEditingAddress={startEditingAddress}
              passwordForm={passwordForm}
              onPasswordChange={handlePasswordChange}
              onPasswordSubmit={handlePasswordSubmit}
              passwordSaving={passwordSaving}
              passwordError={passwordError}
              passwordMessage={passwordMessage}
            />
          )}
        </div>
      </main>

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        cartSubtotal={cartSubtotal}
        cartItemCount={cartItemCount}
        orderStatus={orderStatus}
        onUpdateQuantity={updateCartItemQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={handleOrder}
        getRemainingStock={getRemainingStockForProduct}
      />
    </div>
  );
}