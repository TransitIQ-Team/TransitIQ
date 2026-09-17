import React from 'react';
import { MapPin, Navigation, Info } from 'lucide-react';

const WAYPOINTS = {
  SEHORE_TO_VIT: [
    "Sehore Bus Stand",
    "Kubreshwar Dham",
    "Amlaha",
    "Toll Plaza",
    "VIT Bhopal Outer Highway"
  ],
  VIT_TO_SEHORE: [
    "VIT Bhopal Outer Highway",
    "Amlaha",
    "Kubreshwar Dham",
    "Indore Naka",
    "Nadi/Hospital Chauraha",
    "Sehore Bus Stand"
  ]
};

export default function CorridorVisualizer({ direction = 'SEHORE_TO_VIT', isLight = false }) {
  const stops = WAYPOINTS[direction] || WAYPOINTS.SEHORE_TO_VIT;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Pilot Corridor Route Stops</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {direction === 'SEHORE_TO_VIT' ? 'Sehore Bus Stand ➔ VIT Bhopal Outer Highway' : 'VIT Bhopal Outer Highway ➔ Sehore Bus Stand'}
          </p>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-teal-50 text-teal-700 border border-teal-200">
          {stops.length} Corridor Stops
        </span>
      </div>

      {/* Route Stops Strip */}
      <div className="overflow-x-auto py-2">
        <div className="min-w-[650px] flex items-center justify-between gap-1 relative">
          {/* Main Track Line */}
          <div className="absolute top-4 left-6 right-6 h-1 bg-teal-200 z-0"></div>

          {stops.map((stopName, idx) => {
            const isTerminal = idx === 0 || idx === stops.length - 1;
            return (
              <div key={idx} className="flex flex-col items-center text-center relative z-10 min-w-[100px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 font-bold text-xs ${
                  isTerminal ? 'bg-teal-600 text-white shadow-md ring-4 ring-teal-100' : 'bg-white border-2 border-teal-500 text-teal-700'
                }`}>
                  {idx + 1}
                </div>
                <span className={`text-[11px] leading-tight max-w-[110px] ${isTerminal ? 'font-bold text-teal-900' : 'font-semibold text-slate-700'}`}>
                  {stopName}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
