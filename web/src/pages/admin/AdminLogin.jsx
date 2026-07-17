import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err) {
      let errorMessage = 'Unable to sign in. Please check your credentials.';
      if (err.message.includes('user-not-found') || err.message.includes('wrong-password')) {
        errorMessage = 'Invalid email or password.';
      } else if (err.message.includes('too-many-requests')) {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (err.message.includes('invalid-email')) {
        errorMessage = 'Please enter a valid email address.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        <div className="w-full md:w-1/2 p-10 sm:p-14 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Admin Login</h2>
            <p className="text-gray-500 text-sm">
              Sign in to access the employee dashboard and manage operations.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-100 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                id="adminEmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                className="peer w-full pb-2 border-0 border-b-2 border-gray-200 bg-transparent text-gray-900 focus:border-[#4091c9] focus:ring-0 focus:outline-none transition-colors"
              />
              <label
                htmlFor="adminEmail"
                className="absolute left-0 top-0 text-gray-400 transition-all duration-200 pointer-events-none transform -translate-y-3 text-xs peer-placeholder-shown:translate-y-0 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-translate-y-3 peer-focus:text-xs peer-focus:text-[#4091c9] font-medium"
              >
                Admin Email
              </label>
            </div>

            <div className="relative">
              <input
                id="adminPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                className="peer w-full pb-2 pr-10 border-0 border-b-2 border-gray-200 bg-transparent text-gray-900 focus:border-[#4091c9] focus:ring-0 focus:outline-none transition-colors"
              />
              <label
                htmlFor="adminPassword"
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

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex justify-center items-center mt-8 ${loading ? 'bg-[#7aa8d1] cursor-not-allowed' : 'bg-[#4091c9] hover:bg-[#2d75aa]'}`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-sm text-gray-600">
            <p>
              Not an admin? <Link to="/login" className="font-bold text-[#4091c9] hover:text-[#2d75aa]">Customer login</Link>
            </p>
          </div>
        </div>

        <div className="hidden md:flex w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden bg-[#4091c9]">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_45%)]" />
          <div className="relative z-10">
            <h3 className="text-4xl font-extrabold mb-4 leading-tight">Admin access only</h3>
            <p className="text-slate-100 text-lg">
              Use your employee credentials to monitor production, deliveries, and system alerts from one secure dashboard.
            </p>
          </div>
          <div className="relative z-10 text-sm text-slate-200">
            © 2026 Bella Erin Tube Ice.
          </div>
        </div>
      </div>
    </div>
  );
}
