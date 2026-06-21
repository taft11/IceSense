import { Link } from 'react-router-dom';
import { ArrowRight, Smartphone, Truck, ShieldCheck, Droplet, Snowflake } from 'lucide-react';

export default function Home() {
  return (
    <div className="w-full">
      {/* HERO SECTION */}
      <div className="relative bg-blue-900 text-white overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 opacity-95"></div>
         <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32 flex flex-col items-start">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
               The Leading <span className="text-cyan-400">Packaged Ice</span> Supplier
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mb-10 leading-relaxed">
               There is more to great ice than just freezing water. We deliver premium, purified ice with real-time inventory tracking to keep your business running smoothly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
               <Link to="/order" className="bg-cyan-400 hover:bg-cyan-300 text-blue-950 font-bold py-4 px-8 rounded-full text-lg transition duration-300 flex items-center justify-center shadow-lg">
                  Order Ice Now <ArrowRight className="ml-2 h-5 w-5" />
               </Link>
               <a href="#consumer" className="bg-transparent border-2 border-white hover:bg-white hover:text-blue-900 text-white font-bold py-4 px-8 rounded-full text-lg transition duration-300 text-center">
                  Learn More
               </a>
            </div>
         </div>
      </div>

      {/* TECH & QUALITY SECTION (Inspired by Home City Ice) */}
      <div id="consumer" className="py-24 bg-white">
         <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
            <div>
               <h2 className="text-4xl font-extrabold text-gray-900 mb-6 leading-tight">Manage your ice program from the palm of your hand.</h2>
               <p className="text-lg text-gray-600 mb-8">
                  Our custom portal makes placing an order a breeze and takes the guess work out of receiving a delivery. View live inventory straight from our freezer load-cells.
               </p>
               <ul className="space-y-6">
                  <li className="flex items-start">
                    <ShieldCheck className="text-cyan-600 mr-4 h-8 w-8 shrink-0" />
                    <span className="text-gray-700 text-lg"><strong>Live Availability:</strong> See exactly how many sacks are available before you ever hit order.</span>
                  </li>
                  <li className="flex items-start">
                    <Smartphone className="text-cyan-600 mr-4 h-8 w-8 shrink-0" />
                    <span className="text-gray-700 text-lg"><strong>Easy Ordering:</strong> Place ice orders from your device any place, any time.</span>
                  </li>
                  <li className="flex items-start">
                    <Truck className="text-cyan-600 mr-4 h-8 w-8 shrink-0" />
                    <span className="text-gray-700 text-lg"><strong>Smart Logistics:</strong> Our routed delivery system ensures your ice arrives frozen and on time.</span>
                  </li>
               </ul>
            </div>
            
            {/* Purity Card */}
            <div className="bg-blue-50 rounded-3xl p-10 border border-blue-100 shadow-xl relative overflow-hidden">
               <div className="absolute -right-10 -bottom-10 opacity-5"><Droplet className="h-64 w-64 text-blue-900" /></div>
               <h3 className="text-3xl font-bold text-blue-900 mb-4 relative z-10">Pure, Clean, Healthy Ice</h3>
               <p className="text-blue-800 text-lg mb-6 leading-relaxed relative z-10">
                 Ever notice your at-home ice is cloudy and tastes like the inside of your freezer? We use a multi-stage filtration and UV treatment process to ensure perfectly clear, tasteless ice.
               </p>
               <div className="flex items-center text-blue-700 font-black text-xl relative z-10">
                 <Droplet className="mr-2 h-6 w-6"/> UV-Treated Water
               </div>
            </div>
         </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-16 text-sm">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12 border-b border-gray-800 pb-12">
            <div>
               <h4 className="text-white font-bold text-xl mb-6 flex items-center"><Snowflake className="mr-2 h-6 w-6 text-cyan-500"/> Ice Flow System</h4>
               <p className="text-base">The clean, healthy ice you just can't get from your freezer at home.</p>
            </div>
            <div>
               <h4 className="text-white font-bold mb-6 tracking-wider">COMPANY</h4>
               <ul className="space-y-3 text-base">
                  <li><a href="#" className="hover:text-cyan-400 transition">History</a></li>
                  <li><a href="#" className="hover:text-cyan-400 transition">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-cyan-400 transition">Terms & Conditions</a></li>
               </ul>
            </div>
            <div>
               <h4 className="text-white font-bold mb-6 tracking-wider">GET IN TOUCH</h4>
               <ul className="space-y-4 text-base">
                  <li><span className="block text-gray-500 text-xs font-bold mb-1">CUSTOMER SERVICE</span>1-800-ICE-FLOW</li>
                  <li><span className="block text-gray-500 text-xs font-bold mb-1">NEW CUSTOMERS</span>sales@iceflow.com</li>
               </ul>
            </div>
            <div>
               <h4 className="text-white font-bold mb-6 tracking-wider">PORTALS</h4>
               <ul className="space-y-3 text-base">
                  <li><Link to="/order" className="hover:text-cyan-400 transition">Customer Portal</Link></li>
                  <li><Link to="/admin" className="hover:text-cyan-400 transition">Employee Dashboard</Link></li>
               </ul>
            </div>
         </div>
         <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <p>© 2026 Ice Flow System. All rights reserved.</p>
         </div>
      </footer>
    </div>
  );
}