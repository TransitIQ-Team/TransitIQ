import React, { useEffect, useState } from 'react';
import { Route, Navigation, Clock, MapPin, CheckCircle2 } from 'lucide-react';

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

// CHANGE 1: Fixed capitalization of 'liveDistance' prop
export default function CorridorVisualizer({ direction, liveDistance, liveEta }) {
  const stops = WAYPOINTS[direction] || WAYPOINTS.SEHORE_TO_VIT;
  const [routeInfo, setRouteInfo] = useState({ distanceKm: null, durationMin: null, loading: true });

  // Fetch dynamic OSRM route metrics from backend API
  useEffect(() => {
    let isMounted = true;
    fetch(`http://localhost:5000/api/route-geometry?direction=${direction}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          setRouteInfo({
            distanceKm: (data.distanceMeters / 1000).toFixed(1),
            durationMin: Math.round(data.durationMinutes),
            loading: false
          });
        }
      })
      .catch((err) => {
        console.error('Error fetching OSRM route metrics:', err);
        if (isMounted) setRouteInfo((prev) => ({ ...prev, loading: false }));
      });

    return () => {
      isMounted = false;
    };
  }, [direction]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      {/* Visualizer Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Route className="w-5 h-5 text-teal-600" />
            Pilot Corridor Route & OSRM Distance
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {direction === 'SEHORE_TO_VIT'
              ? 'Sehore Bus Stand ➔ VIT Bhopal Outer Highway'
              : 'VIT Bhopal Outer Highway ➔ Sehore Bus Stand'}
          </p>
        </div>
        
        {/* CHANGE 2: Badges now display dynamic liveDistance and liveEta when available */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            {liveDistance 
              ? `${liveDistance} km (Live)` 
              : `${routeInfo.distanceKm || '29.6'} km (OSRM Road)`}
          </span>

          <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {liveEta !== undefined && liveEta !== null 
              ? `~${liveEta} mins` 
              : `~${routeInfo.durationMin || '35'} mins`}
          </span>

          <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-teal-50 text-teal-700 border border-teal-200">
            {stops.length} Corridor Stops
          </span>
        </div>
      </div>

      {/* Dynamic Route Stops Strip */}
      <div className="overflow-x-auto py-2">
        <div className="min-w-[650px] flex items-center justify-between gap-1 relative">
          {/* Main Track Line */}
          <div className="absolute top-4 left-6 right-6 h-1 bg-teal-200 z-0"></div>

          {stops.map((stopName, idx) => {
            const isTerminal = idx === 0 || idx === stops.length - 1;
            return (
              <div key={idx} className="flex flex-col items-center text-center relative z-10 min-w-[100px]">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 font-bold text-xs ${
                    isTerminal
                      ? 'bg-teal-600 text-white shadow-md ring-4 ring-teal-100'
                      : 'bg-white border-2 border-teal-500 text-teal-700'
                  }`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`text-[11px] leading-tight max-w-[110px] ${
                    isTerminal ? 'font-bold text-teal-900' : 'font-semibold text-slate-700'
                  }`}
                >
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