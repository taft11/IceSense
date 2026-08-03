import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import LocationPicker from './LocationPicker';

export default function AccountView({
  accountSection,
  onSetAccountSection,
  accountInfo,
  onAccountChange,
  onAccountSave,
  accountSaving,
  accountError,
  accountMessage,
  addresses,
  addressForm,
  onAddressChange,
  addressEditingId,
  onResetAddressForm,
  onAddressSave,
  onSetDefaultAddress,
  onRemoveAddress,
  onStartEditingAddress,
  passwordForm,
  onPasswordChange,
  onPasswordSubmit,
  passwordSaving,
  passwordError,
  passwordMessage,
}) {
  const tabClass = (section) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      accountSection === section
        ? 'bg-[#4091c9] text-white shadow-sm'
        : 'bg-slate-100 text-slate-700 hover:bg-sky-50 hover:text-[#4091c9]'
    }`;

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4091c9]">My Account</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Manage your profile and delivery details</h2>
          <p className="mt-2 text-sm text-slate-600">Keep your personal information, saved addresses, and account security up to date in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onSetAccountSection('profile')} className={tabClass('profile')}>
            Profile
          </button>
          <button type="button" onClick={() => onSetAccountSection('addresses')} className={tabClass('addresses')}>
            Addresses
          </button>
          <button type="button" onClick={() => onSetAccountSection('password')} className={tabClass('password')}>
            Change Password
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-5">
          <p className="text-sm font-semibold text-[#4091c9]">Account overview</p>
          <h3 className="mt-2 text-lg font-bold text-slate-900">Your account is ready for smooth delivery planning.</h3>
          <p className="mt-2 text-sm text-slate-600">Update your details whenever you need to keep orders, addresses, and delivery access accurate.</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">Account status</p>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</span>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Saved addresses</span>
              <span className="font-semibold text-slate-900">{addresses.length}</span>
            </div>

          </div>
        </div>
      </div>

      {accountError && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {accountError}
        </div>
      )}
      {accountMessage && (
        <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
          {accountMessage}
        </div>
      )}

      {accountSection === 'profile' && (
        <form onSubmit={onAccountSave} className="grid gap-6">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">Personal details</h3>
            <p className="mt-1 text-sm text-slate-600">Keep your profile information current for smoother checkout and delivery updates.</p>
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">First Name</span>
                <input
                  value={accountInfo.firstName}
                  onChange={(event) => onAccountChange('firstName', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="Jane"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Middle Name</span>
                <input
                  value={accountInfo.middleName}
                  onChange={(event) => onAccountChange('middleName', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="A."
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Last Name</span>
                <input
                  value={accountInfo.lastName}
                  onChange={(event) => onAccountChange('lastName', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="Doe"
                />
              </label>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Email</span>
                <input
                  value={accountInfo.email}
                  onChange={(event) => onAccountChange('email', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="you@example.com"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Phone Number</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={accountInfo.contactNumber}
                  onChange={(event) => onAccountChange('contactNumber', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="09XXXXXXXXX"
                  autoComplete="tel"
                />
              </label>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Gender</span>
                <select
                  value={accountInfo.gender}
                  onChange={(event) => onAccountChange('gender', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                >
                  <option value="">Select gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Date of Birth</span>
                <input
                  type="date"
                  value={accountInfo.dateOfBirth}
                  onChange={(event) => onAccountChange('dateOfBirth', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={accountSaving}
            className={`inline-flex items-center justify-center rounded-2xl px-6 py-4 font-bold text-white transition ${accountSaving ? 'cursor-not-allowed bg-[#7aa8d1]' : 'bg-[#4091c9] hover:bg-[#2d75aa]'}`}
          >
            {accountSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      )}

      {accountSection === 'addresses' && (
        <div className="space-y-6">
          <form onSubmit={onAddressSave} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{addressEditingId ? 'Edit address' : 'Add a new address'}</h3>
                <p className="mt-1 text-sm text-slate-600">Save delivery locations that can be reused for future orders.</p>
              </div>
              {addressEditingId && (
                <button type="button" onClick={onResetAddressForm} className="text-sm font-semibold text-[#4091c9]">
                  Cancel edit
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Label</span>
                <input
                  value={addressForm.label}
                  onChange={(event) => onAddressChange('label', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="Home, Office, etc."
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Street / Building</span>
                <input
                  value={addressForm.street}
                  onChange={(event) => onAddressChange('street', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="123 Sample Street"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">City</span>
                <input
                  value={addressForm.city}
                  onChange={(event) => onAddressChange('city', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="Quezon City"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">State / Province</span>
                <input
                  value={addressForm.state}
                  onChange={(event) => onAddressChange('state', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="Metro Manila"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Postal Code</span>
                <input
                  value={addressForm.postalCode}
                  onChange={(event) => onAddressChange('postalCode', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="1111"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Country</span>
                <input
                  value={addressForm.country}
                  onChange={(event) => onAddressChange('country', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="Philippines"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Latitude</span>
                <input
                  readOnly
                  value={addressForm.latitude ?? ''}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-900"
                  placeholder="Select a location on the map"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Longitude</span>
                <input
                  readOnly
                  value={addressForm.longitude ?? ''}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-900"
                  placeholder="Select a location on the map"
                />
              </label>
            </div>
            <div className="mt-4">
              <LocationPicker latitude={addressForm.latitude} longitude={addressForm.longitude} onLocationChange={onAddressChange} />
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={addressForm.isDefault}
                onChange={(event) => onAddressChange('isDefault', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#4091c9] focus:ring-[#4091c9]"
              />
              Set as default address
            </label>

            <button
              type="submit"
              disabled={accountSaving}
              className={`mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition ${accountSaving ? 'cursor-not-allowed bg-[#7aa8d1]' : 'bg-[#4091c9] hover:bg-[#2d75aa]'}`}
            >
              <Plus className="h-4 w-4" /> {addressEditingId ? 'Update Address' : 'Add Address'}
            </button>
          </form>

          <div className="space-y-3">
            {addresses.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                No addresses yet. Add your first delivery location above.
              </div>
            ) : (
              addresses.map((address) => (
                <div key={address.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{address.label || 'Address'}</p>
                        {address.isDefault && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Default</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{address.street}</p>
                      <p className="text-sm text-slate-600">{[address.city, address.state, address.postalCode, address.country].filter(Boolean).join(', ')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!address.isDefault && (
                        <button type="button" onClick={() => onSetDefaultAddress(address.id)} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[#4091c9] hover:text-[#4091c9]">
                          Set as default
                        </button>
                      )}
                      <button type="button" onClick={() => onStartEditingAddress(address)} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[#4091c9] hover:text-[#4091c9]">
                        Edit
                      </button>
                      <button type="button" onClick={() => onRemoveAddress(address.id)} className="rounded-full border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
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
        <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
          <form onSubmit={onPasswordSubmit} className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
            {passwordError && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {passwordError}
              </div>
            )}
            {passwordMessage && (
              <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-700">
                {passwordMessage}
              </div>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Current Password</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => onPasswordChange('currentPassword', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-700">New Password</span>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => onPasswordChange('newPassword', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-700">Confirm New Password</span>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => onPasswordChange('confirmPassword', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
              />
            </label>

            <button
              type="submit"
              disabled={passwordSaving}
              className={`mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition ${passwordSaving ? 'cursor-not-allowed bg-[#7aa8d1]' : 'bg-[#4091c9] hover:bg-[#2d75aa]'}`}
            >
              <ShieldCheck className="h-4 w-4" /> {passwordSaving ? 'Updating...' : 'Change Password'}
            </button>
          </form>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Security tips</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="rounded-2xl bg-slate-50 p-3">Use a password with at least 8 characters and a mix of letters, numbers, and symbols.</li>
              <li className="rounded-2xl bg-slate-50 p-3">Update your password regularly if you share your device or email account.</li>
              <li className="rounded-2xl bg-slate-50 p-3">Keep your addresses current so future deliveries are faster and more accurate.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
