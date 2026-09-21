import { useEffect, useState } from 'react';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, deleteUser, getAuth, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { db } from '../../services/firebase';

const driverAccountApp = getApps().find((app) => app.name === 'driver-account-creation')
  || initializeApp(getApp().options, 'driver-account-creation');
const driverAuth = getAuth(driverAccountApp);

const DRIVER_ROLES = ['driver', 'delivery', 'deliverer'];
const FILTERS = {
  all: 'All orders',
  unassigned: 'Unassigned',
  assigned: 'Assigned',
};

const PHONE_NUMBER_PATTERN = /^09\d{9}$/;
const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { label: '1 uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: '1 lowercase letter', test: (value) => /[a-z]/.test(value) },
  { label: '1 number', test: (value) => /\d/.test(value) },
  { label: '1 special character', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

const getDriverValidationErrors = ({ fullName, email, contactNumber, password }, isEditing) => {
  const errors = [];

  if (!fullName.trim()) errors.push('Full name is required.');
  if (!email.trim()) errors.push('Email is required.');
  if (!PHONE_NUMBER_PATTERN.test(contactNumber)) {
    errors.push('Phone number must start with 09 and contain exactly 11 digits.');
  }

  if (!isEditing && !password) {
    errors.push('Password is required when creating a driver account.');
  }

  if (password && PASSWORD_REQUIREMENTS.some(({ test }) => !test(password))) {
    errors.push('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.');
  }

  return errors;
};

export default function Deliveries() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState('');
  const [confirmAssignment, setConfirmAssignment] = useState(null);
  const [confirmDriverDelete, setConfirmDriverDelete] = useState(null);
  const [driverForm, setDriverForm] = useState({ fullName: '', email: '', contactNumber: '09', password: '' });
  const [driverPasswordFocused, setDriverPasswordFocused] = useState(false);
  const [phoneValidationAttempted, setPhoneValidationAttempted] = useState(false);
  const [phoneInputTooLong, setPhoneInputTooLong] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [savingDriver, setSavingDriver] = useState(false);
  const [deletingDriverId, setDeletingDriverId] = useState(null);
  const [driverMessage, setDriverMessage] = useState('');
  const [driverError, setDriverError] = useState('');
  const [showDriverManagement, setShowDriverManagement] = useState(false);
  const ORDERS_PER_PAGE = 6;

  useEffect(() => {
    const unsubscribeOrders = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const parsedOrders = snapshot.docs
          .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || b.createdAt || 0) - (a.createdAt?.toMillis?.() || a.createdAt || 0));

        setOrders(parsedOrders);
        setLoading(false);
      },
      (err) => {
        console.error('Unable to load orders', err);
        setError('Unable to load orders right now.');
        setLoading(false);
      }
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const parsedUsers = snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
        const profilesMap = parsedUsers.reduce((accumulator, user) => {
          accumulator[user.id] = user;
          return accumulator;
        }, {});
        const parsedDrivers = parsedUsers.filter((user) => DRIVER_ROLES.includes((user.role || '').toLowerCase().trim()));

        setUserProfiles(profilesMap);
        setDrivers(parsedDrivers);
      },
      (err) => {
        console.error('Unable to load drivers', err);
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeUsers();
    };
  }, []);

  useEffect(() => {
    if (!driverMessage && !driverError) return undefined;

    const feedbackTimer = window.setTimeout(() => {
      setDriverMessage('');
      setDriverError('');
    }, 4000);

    return () => window.clearTimeout(feedbackTimer);
  }, [driverMessage, driverError]);

  const openAssignConfirm = (orderId, driverId) => {
    const selectedDriver = drivers.find((driver) => driver.id === driverId);
    setConfirmAssignment({ orderId, driverId, selectedDriver });
  };

  const closeAssignConfirm = () => {
    setConfirmAssignment(null);
  };

  const handleAssignDriver = async () => {
    if (!confirmAssignment?.orderId) return;

    const { orderId, driverId, selectedDriver } = confirmAssignment;

    try {
      setSavingOrderId(orderId);
      setError('');

      await updateDoc(doc(db, 'orders', orderId), {
        assignedDriverId: driverId || null,
        assignedDriverName: selectedDriver?.fullName || selectedDriver?.name || selectedDriver?.displayName || '',
        assignedDriverEmail: selectedDriver?.email || '',
        deliveryStatus: driverId ? 'Assigned' : 'Unassigned',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Unable to assign driver', err);
      setError('Unable to assign a driver right now.');
    } finally {
      setSavingOrderId(null);
      closeAssignConfirm();
    }
  };

  const handleDriverFormChange = (event) => {
    const { name, value } = event.target;
    if (name === 'phoneDigits') {
      const phoneDigits = value.replace(/\D/g, '');
      setPhoneInputTooLong(phoneDigits.length > 9);
      if (phoneDigits.length <= 9) setPhoneValidationAttempted(false);
      setDriverForm((current) => ({ ...current, contactNumber: `09${phoneDigits.slice(0, 9)}` }));
      return;
    }

    const nextValue = value;
    setDriverForm((current) => ({ ...current, [name]: nextValue }));
  };

  const getPhoneDigits = (phoneNumber) => {
    const digits = String(phoneNumber || '').replace(/\D/g, '');
    return digits.startsWith('09') ? digits.slice(2, 11) : '';
  };

  const formatDriverPhone = (phoneNumber) => {
    const digits = String(phoneNumber || '').replace(/\D/g, '');
    return PHONE_NUMBER_PATTERN.test(digits) ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : null;
  };

  const handleAddDriver = async (event) => {
    event.preventDefault();
    setPhoneValidationAttempted(true);
    const fullName = driverForm.fullName.trim();
    const email = driverForm.email.trim().toLowerCase();
    const contactNumber = driverForm.contactNumber;
    const password = driverForm.password;
    const isEditing = Boolean(editingDriverId);
    const validationErrors = getDriverValidationErrors({ fullName, email, contactNumber, password }, isEditing);

    if (validationErrors.length > 0) {
      setDriverError(validationErrors.join(' '));
      setDriverMessage('');
      return;
    }

    if (isEditing) {
      try {
        setSavingDriver(true);
        setDriverError('');
        setDriverMessage('');
        await updateDoc(doc(db, 'users', editingDriverId), {
          fullName,
          email,
          contactNumber,
          updatedAt: serverTimestamp(),
        });
        setDriverForm({ fullName: '', email: '', contactNumber: '09', password: '' });
        setDriverPasswordFocused(false);
        setEditingDriverId(null);
        setPhoneValidationAttempted(false);
        setPhoneInputTooLong(false);
        setDriverMessage(`${fullName} was updated successfully.`);
      } catch (err) {
        console.error('Unable to update driver', err);
        setDriverError('Unable to update the driver right now. Please try again.');
      } finally {
        setSavingDriver(false);
      }
      return;
    }

    let createdAuthUser = null;
    try {
      setSavingDriver(true);
      setDriverError('');
      setDriverMessage('');
      const credentials = await createUserWithEmailAndPassword(driverAuth, email, password);
      createdAuthUser = credentials.user;

      await setDoc(doc(db, 'users', createdAuthUser.uid), {
        fullName,
        email,
        contactNumber,
        role: 'driver',
        accountStatus: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await signOut(driverAuth);
      setDriverForm({ fullName: '', email: '', contactNumber: '09', password: '' });
      setDriverPasswordFocused(false);
      setPhoneValidationAttempted(false);
      setPhoneInputTooLong(false);
      setDriverMessage(`${fullName} was added as a driver.`);
    } catch (err) {
      console.error('Unable to add driver', err);
      if (createdAuthUser) {
        try {
          await deleteUser(createdAuthUser);
        } catch (cleanupError) {
          console.error('Unable to clean up incomplete driver account', cleanupError);
        }
      }

      const errorMessages = {
        'auth/email-already-in-use': 'That email is already registered. Use a different email address.',
        'auth/invalid-email': 'Enter a valid email address.',
        'auth/operation-not-allowed': 'Email/password sign-in is not enabled in Firebase Authentication. Enable it in the Firebase Console.',
        'auth/password-does-not-meet-requirements': 'The password does not meet Firebase security requirements.',
        'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
        'permission-denied': 'You do not have permission to create driver accounts. Deploy the latest Firestore rules and try again.',
      };
      setDriverError(errorMessages[err.code] || 'Unable to create the driver account right now. Please try again.');
    } finally {
      if (driverAuth.currentUser) await signOut(driverAuth);
      setSavingDriver(false);
    }
  };

  const startEditingDriver = (driver) => {
    setEditingDriverId(driver.id);
    setDriverForm({
      fullName: driver.fullName || driver.name || driver.displayName || '',
      email: driver.email || '',
      contactNumber: `09${getPhoneDigits(driver.contactNumber)}`,
      password: '',
    });
    setDriverPasswordFocused(false);
    setDriverError('');
    setDriverMessage('');
    setPhoneValidationAttempted(false);
    setPhoneInputTooLong(false);
  };

  const cancelEditingDriver = () => {
    setEditingDriverId(null);
    setDriverForm({ fullName: '', email: '', contactNumber: '09', password: '' });
    setDriverPasswordFocused(false);
    setPhoneValidationAttempted(false);
    setPhoneInputTooLong(false);
    setDriverError('');
  };

  const handleDeleteDriver = async () => {
    if (!confirmDriverDelete?.id) return;

    try {
      setDeletingDriverId(confirmDriverDelete.id);
      setDriverError('');
      setDriverMessage('');
      await deleteDoc(doc(db, 'users', confirmDriverDelete.id));
      setDriverMessage(`${confirmDriverDelete.name} was removed from the driver list.`);
    } catch (err) {
      console.error('Unable to delete driver', err);
      setDriverError('Unable to delete the driver right now. Please try again.');
    } finally {
      setDeletingDriverId(null);
      setConfirmDriverDelete(null);
    }
  };

  const isReadyForDelivery = (order) => {
    if (order?.readyForDelivery === true) return true;

    const paymentStatus = String(order?.paymentStatus || '').toLowerCase();
    return paymentStatus === 'paid' || paymentStatus === 'approved' || paymentStatus === 'payment_verified';
  };

  const filteredOrders = orders.filter((order) => {
    if (!isReadyForDelivery(order)) return false;
    if (activeFilter === 'assigned') return Boolean(order.assignedDriverId);
    if (activeFilter === 'unassigned') return !order.assignedDriverId;
    return true;
  });

  // helper: extract YYYY-MM-DD from order.createdAt
  const getOrderDateValue = (order) => {
    if (!order?.createdAt) return null;
    const createdAt = typeof order.createdAt?.toDate === 'function'
      ? order.createdAt.toDate()
      : order.createdAt instanceof Date
        ? order.createdAt
        : new Date(order.createdAt);
    if (Number.isNaN(createdAt.getTime())) return null;
    return createdAt.toISOString().split('T')[0];
  };

  // Apply date filter and search term
  const searchedAndDated = filteredOrders.filter((order) => {
    // date filter
    if (activeDateFilter) {
      const d = getOrderDateValue(order);
      if (d !== activeDateFilter) return false;
    }

    // search
    const q = String(searchTerm || '').trim().toLowerCase();
    if (!q) return true;
    return [order.id, order.customerName, order.customerEmail]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const visibleOrders = [...searchedAndDated].sort((a, b) => {
    const aCreated = a.createdAt?.toMillis?.() || a.createdAt || 0;
    const bCreated = b.createdAt?.toMillis?.() || b.createdAt || 0;

    if (activeFilter === 'all') {
      const aUnassigned = !a.assignedDriverId;
      const bUnassigned = !b.assignedDriverId;
      if (aUnassigned && !bUnassigned) return -1;
      if (!aUnassigned && bUnassigned) return 1;
    }

    return bCreated - aCreated;
  });

  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / ORDERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = visibleOrders.slice((safePage - 1) * ORDERS_PER_PAGE, safePage * ORDERS_PER_PAGE);

  const handleFilterChange = (value) => {
    setActiveFilter(value);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (value) => {
    setActiveDateFilter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const resolveOrderAddress = (order) => {
    if (order.shippingAddress) return order.shippingAddress;
    if (order.address) return order.address;
    if (order.deliveryAddress) return order.deliveryAddress;

    const userProfile = userProfiles[order.userId];
    if (!userProfile) return 'No delivery address provided';

    const addresses = Array.isArray(userProfile.addresses) ? userProfile.addresses : [];
    const defaultAddress = addresses.find((address) => address.isDefault) || addresses[0] || null;

    if (defaultAddress) {
      const parts = [defaultAddress.street, defaultAddress.city, defaultAddress.state, defaultAddress.postalCode, defaultAddress.country].filter(Boolean);
      return parts.join(', ');
    }

    if (userProfile.address) return userProfile.address;
    if (userProfile.shippingAddress) return userProfile.shippingAddress;

    return 'No delivery address provided';
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Delivery assignments</h2>
          <p className="mt-2 text-gray-600">Assign orders to specific Drivers</p>
        </div>
        <button
          type="button"
          onClick={() => setShowDriverManagement((isVisible) => !isVisible)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#4091c9] hover:text-[#4091c9]"
        >
          <Plus className={`h-4 w-4 transition-transform ${showDriverManagement ? 'rotate-45' : ''}`} />
          {showDriverManagement ? 'Hide drivers' : 'Manage drivers'}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {Object.entries(FILTERS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${activeFilter === key ? 'bg-[#4091c9] text-white shadow-sm' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search order / customer"
              className="w-44 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          <input
            type="date"
            value={activeDateFilter}
            onChange={(e) => handleDateFilterChange(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#4091c9]"
          />

          <button
            onClick={() => { setActiveDateFilter(''); setSearchTerm(''); setCurrentPage(1); }}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {showDriverManagement && (
      <section className="mt-8 border-y border-slate-200 py-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Drivers</h3>
            <p className="text-sm text-gray-600">Manage the drivers available for assignment.</p>
          </div>
          <span className="text-sm font-semibold text-slate-500">{drivers.length} driver{drivers.length === 1 ? '' : 's'}</span>
        </div>

        {driverError && <div role="alert" aria-live="polite" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{driverError}</div>}
        {driverMessage && <div role="status" aria-live="polite" className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{driverMessage}</div>}

        <form onSubmit={handleAddDriver} className="mt-5 grid gap-x-4 gap-y-4 lg:grid-cols-[1.15fr_1.15fr_1fr_1.25fr_auto] lg:items-start">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Full name</span>
            <input name="fullName" value={driverForm.fullName} onChange={handleDriverFormChange} required placeholder="Juan Dela Cruz" className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#4091c9] focus:ring-2 focus:ring-[#4091c9]/15" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Email</span>
            <input type="email" name="email" value={driverForm.email} onChange={handleDriverFormChange} required placeholder="driver@example.com" className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#4091c9] focus:ring-2 focus:ring-[#4091c9]/15" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Phone number</span>
            <div className={`mt-2 flex h-11 w-full overflow-hidden rounded-xl border bg-white transition focus-within:ring-2 focus-within:ring-[#4091c9]/15 ${((phoneValidationAttempted && driverForm.contactNumber.length !== 11) || phoneInputTooLong) ? 'border-rose-300 focus-within:border-rose-400' : 'border-gray-200 focus-within:border-[#4091c9]'}`}>
              <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">09</span>
              <input name="phoneDigits" value={getPhoneDigits(driverForm.contactNumber)} onChange={handleDriverFormChange} inputMode="numeric" maxLength={9} placeholder="XXXXXXXXX" aria-describedby="driver-phone-help" className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-800 outline-none" />
            </div>
            {((phoneValidationAttempted && driverForm.contactNumber.length !== 11) || phoneInputTooLong) && (
              <span id="driver-phone-help" role="alert" aria-live="polite" className="mt-1 block text-xs text-rose-600">Phone number must contain 11 digits.</span>
            )}
          </label>
          <label className="relative block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Password{editingDriverId ? ' (optional)' : ''}</span>
            <input type="password" name="password" value={driverForm.password} onChange={handleDriverFormChange} onFocus={() => setDriverPasswordFocused(true)} onBlur={() => setDriverPasswordFocused(false)} required={!editingDriverId} autoComplete="new-password" placeholder={editingDriverId ? 'Leave blank to keep current' : 'Enter a strong password'} aria-describedby="driver-password-help" className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#4091c9] focus:ring-2 focus:ring-[#4091c9]/15" />
            {driverPasswordFocused && (!editingDriverId || driverForm.password) && PASSWORD_REQUIREMENTS.some(({ test }) => !test(driverForm.password)) && (
              <ul id="driver-password-help" className="absolute left-0 right-0 top-full z-20 mt-2 space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-4 text-slate-500 shadow-xl">
                <li className="mb-1 font-semibold text-slate-700">Password requirements</li>
                {PASSWORD_REQUIREMENTS.map(({ label, test }) => {
                  const isSatisfied = test(driverForm.password);
                  return (
                    <li key={label} className={isSatisfied ? 'text-emerald-600' : 'text-slate-500'}>
                      <span aria-hidden="true" className="mr-2 font-semibold">{isSatisfied ? '✓' : '○'}</span>
                      {label}
                    </li>
                  );
                })}
              </ul>
            )}
          </label>
          <div className="flex h-11 gap-2 lg:mt-6">
            <button type="submit" disabled={savingDriver || driverForm.contactNumber.length !== 11} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#4091c9] px-4 text-sm font-semibold text-white transition hover:bg-[#2d75aa] disabled:cursor-not-allowed disabled:opacity-60">
              {editingDriverId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {savingDriver ? 'Saving...' : editingDriverId ? 'Save changes' : 'Add Driver'}
            </button>
            {editingDriverId && (
              <button type="button" onClick={cancelEditingDriver} className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-slate-600 transition hover:bg-slate-50" aria-label="Cancel editing">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        {drivers.length > 0 && (
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-slate-50"><tr><th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Driver</th><th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</th><th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-200">
                {drivers.map((driver) => {
                  const driverName = driver.fullName || driver.name || driver.displayName || driver.email || driver.id;
                  return <tr key={driver.id}>
                    <td className="px-5 py-4"><p className="font-semibold text-slate-800">{driverName}</p><p className="mt-0.5 text-xs text-slate-500">{driver.email || 'No email'}</p></td>
                    <td className="px-5 py-4 font-medium text-slate-700">{formatDriverPhone(driver.contactNumber) || <span className="font-normal text-slate-400">No phone number</span>}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white">
                        <button type="button" onClick={() => startEditingDriver(driver)} className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-[#2d75aa] transition hover:bg-sky-50">
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
                        <button type="button" onClick={() => setConfirmDriverDelete({ id: driver.id, name: driverName })} disabled={deletingDriverId === driver.id} className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Delete</button>
                      </div>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          Loading orders...
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
          No approved orders are available for delivery assignment yet.
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Order</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Address</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Driver</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedOrders.map((order) => {
                    const orderAddress = resolveOrderAddress(order);

                    return (
                      <tr key={order.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">#{order.id?.slice(0, 8).toUpperCase()}</p>
                          <p className="mt-1 text-xs text-gray-500">{order.createdAt ? (typeof order.createdAt?.toDate === 'function' ? order.createdAt.toDate().toLocaleString() : order.createdAt instanceof Date ? order.createdAt.toLocaleString() : new Date(order.createdAt).toLocaleString()) : 'No date'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">{order.customerName || 'Unknown customer'}</p>
                          <p className="text-xs text-gray-500">{order.customerEmail || 'No email'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {orderAddress}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={order.assignedDriverId || ''}
                            onChange={(event) => openAssignConfirm(order.id, event.target.value)}
                            disabled={drivers.length === 0 || savingOrderId === order.id}
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#4091c9]"
                          >
                            <option value="">Select driver</option>
                            {drivers.map((driver) => (
                              <option key={driver.id} value={driver.id}>
                                {driver.fullName || driver.name || driver.displayName || driver.email || driver.id}
                              </option>
                            ))}
                          </select>
                          <p className="mt-2 text-xs text-gray-500">Choose a driver to confirm the assignment.</p>
                          {order.assignedDriverName && (
                            <p className="mt-1 text-xs text-gray-500">Assigned: {order.assignedDriverName}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${order.assignedDriverId ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {order.deliveryStatus || (order.assignedDriverId ? 'Assigned' : 'Unassigned')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Showing {Math.min((safePage - 1) * ORDERS_PER_PAGE + 1, visibleOrders.length)}-{Math.min(safePage * ORDERS_PER_PAGE, visibleOrders.length)} of {visibleOrders.length} orders
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safePage === 1}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm font-semibold text-gray-700">Page {safePage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safePage === totalPages}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {confirmAssignment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">Confirm driver assignment</h3>
            <p className="mt-2 text-sm text-gray-600">
              {confirmAssignment.selectedDriver
                ? `Assign this order to ${confirmAssignment.selectedDriver.fullName || confirmAssignment.selectedDriver.name || confirmAssignment.selectedDriver.displayName || confirmAssignment.selectedDriver.email || 'the selected driver'}?`
                : 'Remove the current driver assignment from this order?'}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeAssignConfirm}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignDriver}
                className="rounded-2xl bg-[#4091c9] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2d75aa]"
              >
                Yes, confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDriverDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">Delete driver?</h3>
            <p className="mt-2 text-sm text-gray-600">This will remove {confirmDriverDelete.name} from the driver list and future assignments.</p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmDriverDelete(null)} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleDeleteDriver} disabled={deletingDriverId === confirmDriverDelete.id} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{deletingDriverId === confirmDriverDelete.id ? 'Deleting...' : 'Yes, delete driver'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
