import React from 'react';
import { Bus, Search, ArrowRight, ShieldCheck, Clock, MapPin, Signal } from 'lucide-react';

export default function HomePage({ setActiveTab }) {
  return (
    <div className="space-y-12 py-4">
      {/* Header Banner with Bus Icon */}
      <div className="bg-gradient-to-r from-teal-600 via-blue-600 to-emerald-600 rounded-3xl p-8 sm:p-12 shadow-lg text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform -rotate-12">
          <Bus className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Bus className="w-8 h-8" />
            <span className="text-sm font-bold uppercase tracking-widest">Welcome to TransitIQ</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-3">
            Know When Your Bus Arrives
          </h1>
          <p className="text-lg text-white/90 font-medium max-w-2xl">
            Get accurate arrival times and track your bus live • Never wait in the dark
          </p>
        </div>
      </div>

      {/* Bus Booking CTA - with breathable distance */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-3xl p-8 sm:p-10 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Bus className="w-6 h-6 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700 uppercase tracking-wider">Get Started Now</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
              Check Your Bus Status
            </h2>
            <p className="text-slate-700 text-sm sm:text-base font-medium">
              See when your bus will arrive, track its location, and understand prediction confidence.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Search className="w-5 h-5" />
            Check Status Now
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm">
        {/* Hero Left Content */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
            <Bus className="w-4 h-4 text-teal-600" />
            <span>Available Route • Sehore ↔ VIT Bhopal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Smart Bus Tracking, <br />
            <span className="text-teal-600">Even Without Live Signal</span>
          </h1>

          <p className="text-slate-600 text-base leading-relaxed max-w-xl">
            We show you accurate arrival times using live bus location and patterns from past journeys—so you know exactly when to expect your bus, even in areas with poor signal.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Find a Bus
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center gap-2 border border-slate-200"
            >
              View Live Status
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Right Visual: Clean Transit Route Visual */}
        <div className="lg:col-span-5">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-bold text-slate-800">Pilot Corridor Active</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">Bhopal Region</span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                    S1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Sehore Bus Stand</h4>
                    <p className="text-[11px] text-slate-500">Origin Station</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-teal-700">0 min</span>
              </div>

              <div className="pl-7 border-l-2 border-dashed border-teal-300 py-1 space-y-2">
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  Kubreshwar Dham
                </div>
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  Amlaha
                </div>
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  Toll Plaza
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                    V1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">VIT Bhopal Outer Highway</h4>
                    <p className="text-[11px] text-slate-500">Destination Campus</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900">Final Target</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features Minimal Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
            <Signal className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1.5">Smart Predictions</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            We check GPS signal strength and adjust our predictions to give you the most accurate arrival time.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1.5">Arrival Time Range</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Based on how long buses typically take on this route, we give you a window of when your bus should arrive.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1.5">Reliable Even Without Signal</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            If GPS signal is lost, we use past journey data to keep giving you accurate predictions you can trust.
          </p>
        </div>
      </div>
    </div>
  );
}
