import { Plus, ShieldCheck, Trash2 } from 'lucide-react';

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
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Account</h2>
          <p className="text-gray-600">Manage your profile, delivery addresses, and password from one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSetAccountSection('profile')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${accountSection === 'profile' ? 'bg-[#4091c9] text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-[#4091c9]'}`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => onSetAccountSection('addresses')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${accountSection === 'addresses' ? 'bg-[#4091c9] text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-[#4091c9]'}`}
          >
            Addresses
          </button>
          <button
            type="button"
            onClick={() => onSetAccountSection('password')}
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
        <form onSubmit={onAccountSave} className="grid gap-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <label className="block">
              <span className="font-semibold text-gray-700">First Name</span>
              <input
                value={accountInfo.firstName}
                onChange={(event) => onAccountChange('firstName', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                placeholder="Jane"
              />
            </label>
            <label className="block">
              <span className="font-semibold text-gray-700">Middle Name</span>
              <input
                value={accountInfo.middleName}
                onChange={(event) => onAccountChange('middleName', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                placeholder="A."
              />
            </label>
            <label className="block">
              <span className="font-semibold text-gray-700">Last Name</span>
              <input
                value={accountInfo.lastName}
                onChange={(event) => onAccountChange('lastName', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                placeholder="Doe"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <label className="block">
              <span className="font-semibold text-gray-700">Email</span>
              <input
                value={accountInfo.email}
                onChange={(event) => onAccountChange('email', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="font-semibold text-gray-700">Phone Number</span>
              <input
                type="tel"
                inputMode="numeric"
                value={accountInfo.contactNumber}
                onChange={(event) => onAccountChange('contactNumber', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                placeholder="09XXXXXXXXX"
                autoComplete="tel"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <label className="block">
              <span className="font-semibold text-gray-700">Gender</span>
              <select
                value={accountInfo.gender}
                onChange={(event) => onAccountChange('gender', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
              >
                <option value="">Select gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>
            <label className="block">
              <span className="font-semibold text-gray-700">Date of Birth</span>
              <input
                type="date"
                value={accountInfo.dateOfBirth}
                onChange={(event) => onAccountChange('dateOfBirth', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
              />
            </label>
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
          <form onSubmit={onAddressSave} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">{addressEditingId ? 'Edit address' : 'Add a new address'}</h3>
              {addressEditingId && (
                <button type="button" onClick={onResetAddressForm} className="text-sm font-semibold text-[#4091c9]">
                  Cancel edit
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Label</span>
                <input
                  value={addressForm.label}
                  onChange={(event) => onAddressChange('label', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="Home, Office, etc."
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Street / Building</span>
                <input
                  value={addressForm.street}
                  onChange={(event) => onAddressChange('street', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="123 Sample Street"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">City</span>
                <input
                  value={addressForm.city}
                  onChange={(event) => onAddressChange('city', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="Quezon City"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">State / Province</span>
                <input
                  value={addressForm.state}
                  onChange={(event) => onAddressChange('state', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="Metro Manila"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Postal Code</span>
                <input
                  value={addressForm.postalCode}
                  onChange={(event) => onAddressChange('postalCode', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="1111"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Country</span>
                <input
                  value={addressForm.country}
                  onChange={(event) => onAddressChange('country', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
                  placeholder="Philippines"
                />
              </label>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={addressForm.isDefault}
                onChange={(event) => onAddressChange('isDefault', event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#4091c9] focus:ring-[#4091c9]"
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
                          onClick={() => onSetDefaultAddress(address.id)}
                          className="rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-[#4091c9] hover:text-[#4091c9]"
                        >
                          Set as default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onStartEditingAddress(address)}
                        className="rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-[#4091c9] hover:text-[#4091c9]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveAddress(address.id)}
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
        <form onSubmit={onPasswordSubmit} className="max-w-xl rounded-2xl border border-gray-200 bg-gray-50 p-6">
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
              onChange={(event) => onPasswordChange('currentPassword', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-gray-700">New Password</span>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => onPasswordChange('newPassword', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-gray-700">Confirm New Password</span>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => onPasswordChange('confirmPassword', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-[#4091c9] focus:outline-none focus:ring-2 focus:ring-[#4091c9]/20"
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
      )}
    </div>
  );
}
