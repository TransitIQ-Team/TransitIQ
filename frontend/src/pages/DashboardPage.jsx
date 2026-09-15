import React, { useState, useEffect } from 'react';
import { Bus, MapPin, Search, ArrowRightLeft, Clock, Wifi, SignalLow, SignalZero, CheckCircle2 } from 'lucide-react';
import CorridorVisualizer from '../components/CorridorVisualizer';

export default function DashboardPage() {
  const [fromLoc, setFromLoc] = useState("Sehore Bus Stand");
  const [toLoc, setToLoc] = useState("VIT Bhopal Outer Highway");
  const [direction, setDirection] = useState("SEHORE_TO_VIT");
  const [targetStop, setTargetStop] = useState("VIT Bhopal Outer Highway");
  const [etaData, setEtaData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchLiveEta = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/trips/TRIP-101/eta?mode=hybrid&direction=${direction}&targetStop=${encodeURIComponent(targetStop)}`);
      if (res.ok) {
        const data = await res.json();
        setEtaData(data);
      }
    } catch (err) {
      console.error("Failed to fetch live ETA:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveEta();
    const interval = setInterval(fetchLiveEta, 5000);
    return () => clearInterval(interval);
  }, [direction, targetStop]);

  const handleSwap = () => {
    if (direction === "SEHORE_TO_VIT") {
      setFromLoc("VIT Bhopal Outer Highway");
      setToLoc("Sehore Bus Stand");
      setDirection("VIT_TO_SEHORE");
      setTargetStop("Sehore Bus Stand");
    } else {
      setFromLoc("Sehore Bus Stand");
      setToLoc("VIT Bhopal Outer Highway");
      setDirection("SEHORE_TO_VIT");
      setTargetStop("VIT Bhopal Outer Highway");
    }
  };

  const getSignalBadge = (state) => {
    switch (state) {
      case 'LIVE':
        return {
          label: '✓ Bus location is live • Just updated',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: Wifi
        };
      case 'PARTIAL':
        return {
          label: '⚠ No live GPS • Using last known position',
          color: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: SignalLow
        };
      case 'HISTORICAL':
        return {
          label: 'GPS signal lost • Using past journey data',
          color: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: SignalZero
        };
      default:
        return {
          label: 'Arrival time not available yet • Check back when bus is on the route',
          color: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: SignalZero
        };
    }
  };

  const badge = getSignalBadge(etaData ? etaData.data_state : 'NO_DATA');
  const BadgeIcon = badge.icon;

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6">
      {/* 0. Attractive Headline Section */}
      <div className="space-y-3 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-teal-600 via-teal-500 to-blue-600 bg-clip-text text-transparent">
          Track Your Bus Right Now
        </h1>
        <p className="text-lg text-slate-600 font-medium">
          See when your bus will arrive • Updated every few seconds
        </p>
        <div className="flex justify-center gap-1 pt-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500"></span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500"></span>
        </div>
      </div>

      {/* Bus Booking CTA Section - with breathable distance */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-3xl p-8 sm:p-10 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Bus className="w-6 h-6 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700 uppercase tracking-wider">Ready to Book?</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
              Reserve Your Seat Now
            </h2>
            <p className="text-slate-700 text-sm sm:text-base font-medium">
              Confirm the bus is on its way and book your seat in seconds. See live updates as it gets closer.
            </p>
          </div>
          <button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2 whitespace-nowrap">
            <Bus className="w-5 h-5" />
            Book Now
          </button>
        </div>
      </div>

      {/* 1. Simple Journey Search Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Search className="w-5 h-5 text-teal-600" />
          Find a Bus Journey
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* FROM Input */}
          <div className="md:col-span-5 relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              From
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-teal-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                readOnly
                value={fromLoc}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none"
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-2 flex justify-center pt-2 md:pt-5">
            <button
              onClick={handleSwap}
              title="Swap Origin & Destination"
              className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-600 hover:text-teal-600 hover:bg-teal-50 flex items-center justify-center transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* TO Input */}
          <div className="md:col-span-5 relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              To
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-orange-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                readOnly
                value={toLoc}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={fetchLiveEta}
            className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Find Bus
          </button>
        </div>
      </div>

      {/* 2. Clean Journey Result Display */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Result Header & Signal Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
              Available Route
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-2">
              {direction === 'SEHORE_TO_VIT' ? 'Sehore Bus Stand → VIT Bhopal' : 'VIT Bhopal → Sehore Bus Stand'}
            </h3>
          </div>

          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${badge.color}`}>
            <BadgeIcon className="w-4 h-4 shrink-0" />
            <span>{badge.label}</span>
          </div>
        </div>

        {/* ETA Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Main ETA */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
            <span className="text-xs font-medium text-slate-500 block mb-1">Bus Will Arrive In</span>
            <div className="text-4xl font-extrabold text-slate-900 flex items-baseline justify-center gap-1">
              <span>{etaData && etaData.eta_minutes !== null ? etaData.eta_minutes : '--'}</span>
              <span className="text-base font-bold text-teal-600">min</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Time left to wait</span>
          </div>

          {/* Expected Range */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
            <span className="text-xs font-medium text-slate-500 block mb-1">Arrival Window</span>
            <div className="text-2xl font-bold text-slate-800 flex items-center justify-center h-10">
              <span>{etaData && etaData.eta_range ? etaData.eta_range : '--'}</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Expected range (min to max)</span>
          </div>

          {/* Confidence */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
            <span className="text-xs font-medium text-slate-500 block mb-1">Prediction Accuracy</span>
            <div className="text-lg font-bold text-teal-700 flex items-center justify-center h-10">
              <span>{etaData ? (etaData.confidence_level || 'Good') : 'Waiting'}</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">How reliable is this estimate?</span>
          </div>
        </div>

        {/* Bus Location Status */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-xs text-slate-700">
          <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
          <div>
            <span className="font-bold text-slate-900">Bus is Currently: </span>
            <span>
              {etaData && etaData.current_segment ? etaData.current_segment : 'Between Amlaha and Toll Plaza'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Simple Route Map / Visualizer */}
      <CorridorVisualizer direction={direction} />
    </div>
  );
}
