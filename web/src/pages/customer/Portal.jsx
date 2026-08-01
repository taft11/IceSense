import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { ref as storageRef, getDownloadURL, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../../services/firebase';
import { PRODUCTS } from './data/products';
import HeaderNav from './components/HeaderNav';
import OrderView from './components/OrderView';
import OrderHistoryView from './components/OrderHistoryView';
import AccountView from './components/AccountView';
import CartSidebar from './components/CartSidebar';
import PendingOrderConfirmationModal from './components/PendingOrderConfirmationModal';
import LocationPicker from './components/LocationPicker';

const CART_STORAGE_KEY = 'icesense-cart-v1';
const DELIVERY_STORAGE_KEY = 'icesense-delivery-v1';

const DELIVERY_TIME_SLOTS = [
  { id: 'morning', label: '8:00 AM - 11:00 AM' },
  { id: 'midday', label: '11:00 AM - 2:00 PM' },
  { id: 'afternoon', label: '2:00 PM - 5:00 PM' },
];

const getStoredCartItems = () => {
  if (typeof window === 'undefined') return [];

  try {
    const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsedCart = savedCart ? JSON.parse(savedCart) : [];
    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch (error) {
    console.error('Failed to restore cart from local storage', error);
    return [];
  }
};

const getStoredDeliverySettings = () => {
  if (typeof window === 'undefined') return null;

  try {
    const savedSettings = window.localStorage.getItem(DELIVERY_STORAGE_KEY);
    return savedSettings ? JSON.parse(savedSettings) : null;
  } catch (error) {
    console.error('Failed to restore delivery settings from local storage', error);
    return null;
  }
};

const addDays = (date, daysToAdd) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  return nextDate;
};

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatReadableDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const getEarliestDeliveryDate = (referenceDate = new Date()) => {
  const currentDate = new Date(referenceDate);
  currentDate.setHours(0, 0, 0, 0);

  if (referenceDate.getHours() >= 20) {
    return addDays(currentDate, 2);
  }

  return addDays(currentDate, 1);
};

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

  const [selectedIceType, setSelectedIceType] = useState('tube');
  const [selectedProductId, setSelectedProductId] = useState('tube-50');
  const [quantity, setQuantity] = useState(1);
  const [cartItems, setCartItems] = useState(() => getStoredCartItems());
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [orderStatus, setOrderStatus] = useState('idle');
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [isPendingOrderModalOpen, setIsPendingOrderModalOpen] = useState(false);
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
    latitude: null,
    longitude: null,
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
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const savedSettings = getStoredDeliverySettings();
    return savedSettings?.deliveryDate || toDateInputValue(getEarliestDeliveryDate());
  });
  const [deliverySlot, setDeliverySlot] = useState(() => {
    const savedSettings = getStoredDeliverySettings();
    return savedSettings?.deliverySlot || DELIVERY_TIME_SLOTS[0].id;
  });
  const [isDeliveryExpanded, setIsDeliveryExpanded] = useState(false);
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptError, setReceiptError] = useState('');

  const earliestDeliveryDate = useMemo(() => getEarliestDeliveryDate(), []);
  const maxDeliveryDate = useMemo(() => addDays(new Date(), 14), []);
  const deliveryQuickOptions = useMemo(() => {
    return [
      { value: toDateInputValue(earliestDeliveryDate), label: 'Tomorrow' },
      { value: toDateInputValue(addDays(earliestDeliveryDate, 1)), label: 'Day After Tomorrow' },
    ];
  }, [earliestDeliveryDate]);
  const deliveryDateHeading = useMemo(() => formatReadableDate(new Date(`${deliveryDate}T00:00:00`)), [deliveryDate]);

  const activeProduct = PRODUCTS.find((product) => product.id === selectedProductId);
  const filteredProducts = PRODUCTS.filter((product) => product.id.startsWith(`${selectedIceType}-`));
  const activeStock = Math.max(0, (stocks[selectedProductId] || 0) - cartItems.filter((item) => item.productId === selectedProductId).reduce((sum, item) => sum + item.quantity, 0));
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const hasSavedAddress = addresses.length > 0;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    }
  }, [cartItems]);

  useEffect(() => {
    if (!toast.visible) return;

    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [toast.visible]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        DELIVERY_STORAGE_KEY,
        JSON.stringify({
          deliveryDate,
          deliverySlot,
        })
      );
    }
  }, [deliveryDate, deliverySlot]);

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

  const handleIceTypeSelect = (iceType) => {
    setSelectedIceType(iceType);
    const fallbackProduct = PRODUCTS.find((product) => product.id.startsWith(`${iceType}-`));
    setSelectedProductId(fallbackProduct?.id || 'tube-50');
    setQuantity(1);
    setOrderStatus('idle');
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

  const handleQuantityChange = (event) => {
    const nextQuantity = Number(event.target.value);
    if (Number.isNaN(nextQuantity)) return;
    if (nextQuantity <= 0) {
      setQuantity(1);
      return;
    }
    setQuantity(Math.min(nextQuantity, activeStock));
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
    setToast({ visible: true, message: `${qtyToAdd} ${activeProduct.name} added to cart.` });
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

  const reorderFromOrder = (order) => {
    const normalizedItems = (order.items || []).map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));

    if (!normalizedItems.length) return;

    setCartItems((prev) => {
      const merged = [...prev];

      normalizedItems.forEach((item) => {
        const existingIndex = merged.findIndex((entry) => entry.productId === item.productId);
        if (existingIndex >= 0) {
          merged[existingIndex] = {
            ...merged[existingIndex],
            quantity: merged[existingIndex].quantity + item.quantity,
            price: item.price,
            name: item.name,
          };
        } else {
          merged.push(item);
        }
      });

      return merged;
    });

    setIsCartOpen(true);
    setOrderStatus('idle');
  };

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
      role: 'customer',
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

  const redirectToAddressSetup = (message = 'Please add a delivery address before placing your order.') => {
    setAccountSection('addresses');
    setAccountMessage(message);
    setAccountError('');
    setIsCheckoutConfirmOpen(false);
    setIsCartOpen(false);
    navigate('/portal/account');
  };

const handleOrder = async () => {
    if (cartItems.length === 0) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setOrdersError('Please sign in to place an order.');
      return;
    }

    if (!hasSavedAddress) {
      redirectToAddressSetup();
      return;
    }

    if (!receiptFile) {
      setReceiptError('Please upload a GCash receipt screenshot before placing your order.');
      return;
    }

    const fullName = getFullName();
    const normalizedDeliveryDate = deliveryDate || toDateInputValue(earliestDeliveryDate);
    const normalizedDeliverySlot = DELIVERY_TIME_SLOTS.find((slot) => slot.id === deliverySlot)?.label || DELIVERY_TIME_SLOTS[0].label;
    const defaultAddress = addresses.find((address) => address.isDefault) || addresses[0] || null;
    const shippingAddress = defaultAddress
      ? `${defaultAddress.street || ''}, ${defaultAddress.city || ''}, ${defaultAddress.state || ''} ${defaultAddress.postalCode || ''}`.replace(/,\s*,/g, ',').replace(/\s+,/g, ',').trim()
      : 'Address not provided yet';
    const landmark = defaultAddress?.landmark || 'Not provided';
    const paymentMethod = 'GCash';

    setOrderStatus('processing');
    setReceiptError('');

    try {
      const ordersRef = collection(db, 'orders');

      const receiptRef = storageRef(storage, `payment_receipts/${currentUser.uid}/${Date.now()}-${receiptFile.name}`);
      await uploadBytes(receiptRef, receiptFile);
      const receiptUrl = await getDownloadURL(receiptRef);

      const orderPayload = {
        userId: currentUser.uid,
        items: cartItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        total: cartSubtotal,
        status: 'Pending Payment Verification',
        paymentMethod,
        paymentStatus: 'PENDING_PAYMENT_VERIFICATION',
        receiptUrl,
        adminNotes: '',
        verifiedAt: null,
        verifiedBy: null,
        createdAt: serverTimestamp(),
        customerName: fullName || currentUser.displayName || currentUser.email || 'Customer',
        customerEmail: currentUser.email || '',
        deliveryDate: normalizedDeliveryDate,
        deliveryTimeSlot: normalizedDeliverySlot,
        deliverySlot: normalizedDeliverySlot,
        shippingAddress,
        landmark,
        deliveryLatitude: defaultAddress?.latitude ?? null,
        deliveryLongitude: defaultAddress?.longitude ?? null,
        deliveryLocation:
          defaultAddress?.latitude != null && defaultAddress?.longitude != null
            ? {
                latitude: defaultAddress.latitude,
                longitude: defaultAddress.longitude,
              }
            : null,
      };

      const orderDocRef = await addDoc(ordersRef, orderPayload);

      setStocks((prev) => {
        const nextStocks = { ...prev };
        cartItems.forEach((item) => {
          nextStocks[item.productId] = Math.max(0, prev[item.productId] - item.quantity);
        });
        return nextStocks;
      });

      setCartItems([]);
      setReceiptFile(null);
      setOrderStatus('success');
      setPendingOrderId(orderDocRef.id);
      setIsCartOpen(false);
      setIsPendingOrderModalOpen(true);
      setQuantity(1);
      setOrdersError('');

      setTimeout(() => setOrderStatus('idle'), 3000);
    } catch (error) {
      console.error('Order submission failed', error);
      setOrdersError('Your order could not be saved. Please try again.');
      setOrderStatus('idle');
    }
  };

  const openCheckoutConfirmation = () => {
    if (cartItems.length === 0) return;
    if (!hasSavedAddress) {
      redirectToAddressSetup();
      return;
    }
    setReceiptError('');
    setIsCheckoutConfirmOpen(true);
  };

  const confirmCheckoutOrder = () => {
    setIsCheckoutConfirmOpen(false);
    handleOrder();
  };

  const closePendingOrderModal = () => {
    setIsPendingOrderModalOpen(false);
  };

  const handleViewOrders = () => {
    setIsPendingOrderModalOpen(false);
    navigate('/portal/orders');
  };

  const handleBackHome = () => {
    setIsPendingOrderModalOpen(false);
    navigate('/portal');
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
      latitude: null,
      longitude: null,
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
        latitude: addressForm.latitude ?? null,
        longitude: addressForm.longitude ?? null,
        label: addressForm.label.trim() || 'Home',
      };

      const hasExistingDefault = nextAddresses.some((address) => address.isDefault);
      const shouldSetAsDefault = normalizedAddress.isDefault || nextAddresses.length === 0 || !hasExistingDefault;

      if (shouldSetAsDefault) {
        nextAddresses.forEach((address) => {
          address.isDefault = false;
        });
        normalizedAddress.isDefault = true;
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
              products={filteredProducts}
              selectedIceType={selectedIceType}
              onSelectIceType={handleIceTypeSelect}
              selectedProductId={selectedProductId}
              onSelect={handleProductSelect}
              activeProduct={activeProduct}
              activeStock={activeStock}
              quantity={quantity}
              onDecrease={decreaseQuantity}
              onIncrease={increaseQuantity}
              onQuantityChange={handleQuantityChange}
              onAddToCart={addToCart}
              orderStatus={orderStatus}
              remainingStock={getRemainingStockForProduct(selectedProductId)}
            />
          ) : activeView === 'orders' ? (
            <OrderHistoryView
              orders={orders}
              ordersLoading={ordersLoading}
              ordersError={ordersError}
              onReorder={reorderFromOrder}
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

      <div className={`pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 transition-opacity duration-300 ${toast.visible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="pointer-events-auto max-w-md rounded-3xl border border-[#4091c9]/15 bg-white/95 px-5 py-4 shadow-xl shadow-slate-900/10 backdrop-blur-sm">
          <p className="text-sm font-semibold text-[#205a82]">{toast.message}</p>
        </div>
      </div>

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        cartSubtotal={cartSubtotal}
        cartItemCount={cartItemCount}
        orderStatus={orderStatus}
        onUpdateQuantity={updateCartItemQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={openCheckoutConfirmation}
        onConfirmCheckout={confirmCheckoutOrder}
        onCancelCheckout={() => {
          setIsCheckoutConfirmOpen(false);
          setReceiptFile(null);
        }}
        getRemainingStock={getRemainingStockForProduct}
        deliveryDate={deliveryDate}
        onDeliveryDateChange={setDeliveryDate}
        deliverySlot={deliverySlot}
        onDeliverySlotChange={setDeliverySlot}
        deliveryQuickOptions={deliveryQuickOptions}
        earliestDeliveryDate={toDateInputValue(earliestDeliveryDate)}
        maxDeliveryDate={toDateInputValue(maxDeliveryDate)}
        deliveryDateHeading={deliveryDateHeading}
        isDeliveryExpanded={isDeliveryExpanded}
        onToggleDelivery={() => setIsDeliveryExpanded((prev) => !prev)}
        isCheckoutConfirmOpen={isCheckoutConfirmOpen}
        hasAddress={hasSavedAddress}
        receiptFile={receiptFile}
        onReceiptFileChange={setReceiptFile}
        receiptError={receiptError}
      />

      <PendingOrderConfirmationModal
        isOpen={isPendingOrderModalOpen}
        orderId={pendingOrderId}
        onViewOrders={handleViewOrders}
        onBackHome={handleBackHome}
        onClose={closePendingOrderModal}
      />
    </div>
  );
}