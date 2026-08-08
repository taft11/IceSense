import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { sanitizePhoneNumberInput, getMissingProfileFields } from './utils/profileValidation';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/portal');
      } else {
        const sanitizedPhoneNumber = sanitizePhoneNumberInput(contactNumber);
        const { missing, invalid } = getMissingProfileFields({
          firstName,
          lastName,
          contactNumber: sanitizedPhoneNumber,
        });
        const profileIssues = [...missing, ...invalid];

        if (profileIssues.length > 0) {
          throw new Error(`Please fill in your details correctly. ${profileIssues.join(', ')}.`);
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match!');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          firstName: firstName.trim(),
          middleName: middleName.trim(),
          lastName: lastName.trim(),
          email: userCredential.user.email || email,
          contactNumber: sanitizedPhoneNumber,
          createdAt: serverTimestamp(),
        }, { merge: true });
        navigate('/portal');
      }
    } catch (err) {
      let errorMessage = 'An error occurred. Please try again.';
      if (err.message.includes('invalid-credential') || err.message.includes('wrong-password')) {
        errorMessage = 'Invalid email or password.';
      } else if (err.message.includes('email-already-in-use')) {
        errorMessage = 'An account with this email already exists.';
      } else if (err.message) {
        errorMessage = err.message.replace('Firebase: ', '');
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setContactNumber('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-8 flex justify-center">
            <Link to="/" className="inline-flex">
              <img src="/logo.png" alt="Bella Erin Tube Ice Logo" className="h-30 w-30 object-contain" />
            </Link>
          </div>

          <div className="mb-8 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-gray-500 text-sm">
              {isLogin
                ? 'Enter your details to sign in.'
                : 'Sign up with your email and password to get started. You can complete your profile later from My Account.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-100 flex items-start animate-fade-in">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative">
                  <input
                    id="firstName"
                    type="text"
                    required={!isLogin}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder=" "
                    className="peer w-full pb-2 border-0 border-b-2 border-gray-200 bg-transparent text-gray-900 focus:border-[#4091c9] focus:ring-0 focus:outline-none transition-colors"
                  />
                  <label
                    htmlFor="firstName"
                    className="absolute left-0 top-0 text-gray-400 transition-all duration-200 pointer-events-none transform -translate-y-3 text-xs peer-placeholder-shown:translate-y-0 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-translate-y-3 peer-focus:text-xs peer-focus:text-[#4091c9] font-medium"
                  >
                    First Name <span className="text-gray-400">*</span>
                  </label>
                </div>

                <div className="relative">
                  <input
                    id="middleName"
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder=" "
                    className="peer w-full pb-2 border-0 border-b-2 border-gray-200 bg-transparent text-gray-900 focus:border-[#4091c9] focus:ring-0 focus:outline-none transition-colors"
                  />
                  <label
                    htmlFor="middleName"
                    className="absolute left-0 top-0 text-gray-400 transition-all duration-200 pointer-events-none transform -translate-y-3 text-xs peer-placeholder-shown:translate-y-0 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-translate-y-3 peer-focus:text-xs peer-focus:text-[#4091c9] font-medium"
                  >
                    Middle Name
                  </label>
                </div>

                <div className="relative sm:col-span-2">
                  <input
                    id="lastName"
                    type="text"
                    required={!isLogin}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder=" "
                    className="peer w-full pb-2 border-0 border-b-2 border-gray-200 bg-transparent text-gray-900 focus:border-[#4091c9] focus:ring-0 focus:outline-none transition-colors"
                  />
                  <label
                    htmlFor="lastName"
                    className="absolute left-0 top-0 text-gray-400 transition-all duration-200 pointer-events-none transform -translate-y-3 text-xs peer-placeholder-shown:translate-y-0 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-translate-y-3 peer-focus:text-xs peer-focus:text-[#4091c9] font-medium"
                  >
                    Last Name <span className="text-gray-400">*</span>
                  </label>
                </div>

                <div className="relative sm:col-span-2">
                  <input
                    id="contactNumber"
                    type="tel"
                    inputMode="numeric"
                    required={!isLogin}
                    value={contactNumber}
                    onChange={(e) => setContactNumber(sanitizePhoneNumberInput(e.target.value))}
                    placeholder=" "
                    className="peer w-full pb-2 border-0 border-b-2 border-gray-200 bg-transparent text-gray-900 focus:border-[#4091c9] focus:ring-0 focus:outline-none transition-colors"
                  />
                  <label
                    htmlFor="contactNumber"
                    className="absolute left-0 top-0 text-gray-400 transition-all duration-200 pointer-events-none transform -translate-y-3 text-xs peer-placeholder-shown:translate-y-0 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-translate-y-3 peer-focus:text-xs peer-focus:text-[#4091c9] font-medium"
                  >
                    Phone Number <span className="text-gray-400">*</span>
                  </label>
                </div>
              </div>
            )}

            <div className="relative">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                className="peer w-full pb-2 border-0 border-b-2 border-gray-200 bg-transparent text-gray-900 focus:border-[#4091c9] focus:ring-0 focus:outline-none transition-colors"
              />
              <label
                htmlFor="email"
                className="absolute left-0 top-0 text-gray-400 transition-all duration-200 pointer-events-none transform -translate-y-3 text-xs peer-placeholder-shown:translate-y-0 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-translate-y-3 peer-focus:text-xs peer-focus:text-[#4091c9] font-medium"
              >
                Email Address
              </label>
            </div>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                className="peer w-full pb-2 pr-10 border-0 border-b-2 border-gray-200 bg-transparent text-gray-900 focus:border-[#4091c9] focus:ring-0 focus:outline-none transition-colors"
              />
              <label
                htmlFor="password"
                className="absolute left-0 top-0 text-gray-400 transition-all duration-200 pointer-events-none transform -translate-y-3 text-xs peer-placeholder-shown:translate-y-0 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-translate-y-3 peer-focus:text-xs peer-focus:text-[#4091c9] font-medium"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pb-2 flex items-center text-gray-400 hover:text-[#4091c9] transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {!isLogin && (
              <div className="relative animate-fade-in">
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required={!isLogin}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder=" "
                  className="peer w-full pb-2 border-0 border-b-2 border-gray-200 bg-transparent text-gray-900 focus:border-[#4091c9] focus:ring-0 focus:outline-none transition-colors"
                />
                <label
                  htmlFor="confirmPassword"
                  className="absolute left-0 top-0 text-gray-400 transition-all duration-200 pointer-events-none transform -translate-y-3 text-xs peer-placeholder-shown:translate-y-0 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-translate-y-3 peer-focus:text-xs peer-focus:text-[#4091c9] font-medium"
                >
                  Confirm Password
                </label>
              </div>
            )}

            {isLogin && (
              <div className="flex justify-end mt-2">
                <a href="#" className="text-sm font-semibold text-[#4091c9] hover:text-[#2d75aa] transition-colors">
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex justify-center items-center mt-8
                ${loading ? 'bg-[#7aa8d1] cursor-not-allowed' : 'bg-[#4091c9] hover:bg-[#2d75aa] hover:-translate-y-0.5'}`}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={toggleMode}
              className="font-bold text-[#4091c9] hover:text-[#2d75aa] transition-colors"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>

        <div className="hidden md:flex w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src="/IceBucket.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-slate-950/50" />

          <div className="relative z-10 mb-8">
            <h3 className="text-4xl font-extrabold mb-4 leading-tight">
              Manage your ice inventory with precision.
            </h3>
            <p className="text-slate-200 text-lg">
              Monitor freezer temperatures, track water levels, and manage deliveries in real-time from one dashboard.
            </p>
          </div>

          <div className="relative z-10 text-sm text-white-200">
            © 2026 Bella Erin Tube Ice.
          </div>
        </div>
      </div>
    </div>
  );
}