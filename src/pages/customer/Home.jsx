import { Link } from 'react-router-dom';
import { ArrowRight, Smartphone, Truck, ShieldCheck, Droplet, Snowflake, MapPin } from 'lucide-react';

export default function Home() {
  return (
    <div className="w-full">
      
      {/* HERO SECTION WITH VIDEO BACKGROUND */}
      <div className="relative min-h-[90vh] flex items-center overflow-hidden">
         
         {/* The Background Video */}
         <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover"
         >
            {/* Placeholder Free Stock Video of Water/Ice */}
            <source src="/hero-video.mp4" type="video/mp4" />
         </video>

         {/* Dark overlay so the white text is readable over the bright video */}
         <div className="absolute inset-0 bg-blue-950/60"></div>

         {/* Hero Content */}
         <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 flex flex-col items-start w-full mt-10">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white drop-shadow-lg">
               The Leading <span className="text-[#4091c9]">Packaged Ice</span><br/>Supplier
            </h1>
            <p className="text-xl md:text-2xl text-blue-50 max-w-2xl mb-10 leading-relaxed drop-shadow-md">
               There is more to great ice than just freezing water. We deliver premium, purified ice with real-time inventory tracking to keep your business running smoothly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
               <Link to="/portal" className="bg-[#4091c9] hover:bg-[#2d75aa] text-white font-bold py-4 px-8 rounded-full text-lg transition duration-300 flex items-center justify-center shadow-xl">
                  Order Ice Now <ArrowRight className="ml-2 h-5 w-5" />
               </Link>
               <a href="#consumer" className="backdrop-blur-sm bg-white/10 border-2 border-white/50 hover:bg-white hover:text-blue-900 text-white font-bold py-4 px-8 rounded-full text-lg transition duration-300 text-center">
                  Learn More
               </a>
            </div>
         </div>
      </div>

      {/* TECH & QUALITY SECTION */}
      <div id="consumer" className="py-24 bg-white">
         <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
            <div>
               <h2 className="text-4xl font-extrabold text-gray-900 mb-6 leading-tight">Manage your ice program from the palm of your hand.</h2>
               <p className="text-lg text-gray-600 mb-8">
                  Our custom portal makes placing an order a breeze and takes the guess work out of receiving a delivery. View live inventory straight from our freezer load-cells.
               </p>
               <ul className="space-y-6">
                  <li className="flex items-start">
                    <ShieldCheck className="text-[#4091c9] mr-4 h-8 w-8 shrink-0" />
                    <span className="text-gray-700 text-lg"><strong>Live Availability:</strong> See exactly how many sacks are available before you ever hit order.</span>
                  </li>
                  <li className="flex items-start">
                    <Smartphone className="text-[#4091c9] mr-4 h-8 w-8 shrink-0" />
                    <span className="text-gray-700 text-lg"><strong>Easy Ordering:</strong> Place ice orders from your device any place, any time.</span>
                  </li>
                  <li className="flex items-start">
                    <Truck className="text-[#4091c9] mr-4 h-8 w-8 shrink-0" />
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

      {/* LOCATION & MAP SECTION */}
      <div className="bg-gray-50 py-24 border-t border-gray-200">
         <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
               <h2 className="text-4xl font-extrabold text-gray-900 mb-4 flex items-center justify-center">
                  <MapPin className="h-10 w-10 text-[#4091c9] mr-3" />
                  Our Facility Location
               </h2>
               <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Pick up premium tube ice directly from our plant or see where we dispatch our fast, reliable delivery routes.
               </p>
            </div>
            
            {/* The Google Maps iFrame */}
            <div className="w-full h-[500px] bg-gray-200 rounded-3xl overflow-hidden shadow-2xl border-8 border-white relative z-10">
               <iframe 
                  title="Bella Erin Tube Ice Location"
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  src="https://maps.google.com/maps?q=Bella+Erin+Tube+Ice&t=&z=16&ie=UTF8&iwloc=&output=embed"
               ></iframe>
            </div>
         </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-16 text-sm">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12 border-b border-gray-800 pb-12">
            <div>
               <h4 className="text-white font-bold text-xl mb-6 flex items-center">
                  <img src="/logo-white.png" alt="Bella Erin Tube Ice Logo" className="mr-3 h-30 w-auto" />
               </h4>
               <p className="text-base">The clean, healthy ice you just can't get from your freezer at home.</p>
            </div>
            <div>
               <h4 className="text-white font-bold mb-6 tracking-wider">COMPANY</h4>
               <ul className="space-y-3 text-base">
                  <li><a href="#" className="hover:text-[#4091c9] transition">History</a></li>
                  <li><a href="#" className="hover:text-[#4091c9] transition">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-[#4091c9] transition">Terms & Conditions</a></li>
               </ul>
            </div>
            <div>
               <h4 className="text-white font-bold mb-6 tracking-wider">GET IN TOUCH</h4>
               <ul className="space-y-4 text-base">
                  <li><span className="block text-gray-500 text-xs font-bold mb-1">CUSTOMER SERVICE</span>1-800-ICE-FLOW</li>
                  <li><span className="block text-gray-500 text-xs font-bold mb-1">NEW CUSTOMERS</span>sales@bellaerin.com</li>
               </ul>
            </div>
            <div>
               <h4 className="text-white font-bold mb-6 tracking-wider">PORTALS</h4>
               <ul className="space-y-3 text-base">
                  <li><Link to="/portal" className="hover:text-[#4091c9] transition">Customer Portal</Link></li>
                  <li><Link to="/login" className="hover:text-[#4091c9] transition">Employee Dashboard</Link></li>
               </ul>
            </div>
         </div>
         <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <p>© 2026 Bella Erin Tube Ice. All rights reserved.</p>
         </div>
      </footer>
    </div>
  );
}