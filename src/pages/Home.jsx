import { Link } from 'react-router-dom';
import { ShieldCheck, Heart, Clock } from 'lucide-react';

export default function Home() {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-brand-900 text-white">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=2069"
            alt="Dogs playing"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900 to-transparent"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
              Trustworthy care for your furry family members
            </h1>
            <p className="text-xl text-brand-100 mb-10 max-w-lg">
              Connect with vetted, loving pet sitters and dog walkers in your neighborhood. Book with confidence, knowing your pet is in great hands.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/signup"
                className="inline-flex justify-center items-center px-8 py-3 border border-transparent text-base font-medium rounded-full text-brand-900 bg-white hover:bg-slate-100 transition-colors shadow-lg"
              >
                Find a Pet Sitter
              </Link>
              <Link
                to="/signup"
                className="inline-flex justify-center items-center px-8 py-3 border border-white text-base font-medium rounded-full text-white bg-transparent hover:bg-white/10 transition-colors"
              >
                Become a Sitter
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Why choose CarePaws?
            </h2>
            <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto">
              We make it easy and safe to find the perfect care for your pets while you're away.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center text-center p-6 glass-card rounded-2xl bg-white">
              <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm rotate-3">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Verified Carers</h3>
              <p className="text-slate-600">
                Every sitter undergoes a comprehensive background check and profile review before they can join our platform.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 glass-card rounded-2xl bg-white">
              <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm -rotate-3">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Loving Care</h3>
              <p className="text-slate-600">
                Our sitters don't just do it for the money; they are genuine animal lovers who will treat your pets like their own.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 glass-card rounded-2xl bg-white">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm rotate-3">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Flexible Booking</h3>
              <p className="text-slate-600">
                From daily walks to extended stays, find a sitter that matches your schedule and your pet's needs perfectly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
