import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Play, Pause, Square, AlertCircle } from 'lucide-react';

const ROUTE_SEHORE_TO_VIT = [
  { name: "Sehore Bus Stand", lat: 23.200078, lng: 77.087906 },
  { name: "Kubreshwar Dham", lat: 23.164298, lng: 77.005836 },
  { name: "Amlaha", lat: 23.118575, lng: 76.903982 },
  { name: "Toll Plaza", lat: 23.102305, lng: 76.875963 },
  { name: "VIT Bhopal Outer Highway", lat: 23.081236, lng: 76.842881 }
];

const ROUTE_VIT_TO_SEHORE = [
  { name: "VIT Bhopal Outer Highway", lat: 23.081345, lng: 76.842785 },
  { name: "Amlaha", lat: 23.118575, lng: 76.903982 },
  { name: "Kubreshwar Dham", lat: 23.164486, lng: 77.005700 },
  { name: "Indore Naka", lat: 23.193541, lng: 77.073072 },
  { name: "Nadi/Hospital Chauraha", lat: 23.197895, lng: 77.081507 },
  { name: "Sehore Bus Stand", lat: 23.200078, lng: 77.087906 }
];

export default function SimulatorPage() {
  const [direction, setDirection] = useState('SEHORE_TO_VIT');
  const [tripId, setTripId] = useState('TRIP-101');
  const [simState, setSimState] = useState('IDLE');
  const [currentPoint, setCurrentPoint] = useState(null);
  const [pingCount, setPingCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  const timerRef = useRef(null);
  const stepRef = useRef(0);
  const totalSubStepsRef = useRef(10);

  const waypoints = direction === 'SEHORE_TO_VIT' ? ROUTE_SEHORE_TO_VIT : ROUTE_VIT_TO_SEHORE;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getInterpolatedPoint = (stepIndex) => {
    const totalWaypoints = waypoints.length;
    const maxSteps = (totalWaypoints - 1) * totalSubStepsRef.current;
    const clampedStep = stepIndex % (maxSteps + 1);

    const segment = Math.floor(clampedStep / totalSubStepsRef.current);
    const fraction = (clampedStep % totalSubStepsRef.current) / totalSubStepsRef.current;

    if (segment >= totalWaypoints - 1) {
      const last = waypoints[totalWaypoints - 1];
      return { lat: last.lat, lng: last.lng, waypointName: last.name };
    }

    const p1 = waypoints[segment];
    const p2 = waypoints[segment + 1];

    const lat = p1.lat + (p2.lat - p1.lat) * fraction;
    const lng = p1.lng + (p2.lng - p1.lng) * fraction;

    return {
      lat,
      lng,
      segmentName: `${p1.name} ➔ ${p2.name}`
    };
  };

  const sendPing = async () => {
    const pt = getInterpolatedPoint(stepRef.current);
    const timestamp = new Date().toISOString();

    const payload = {
      latitude: pt.lat,
      longitude: pt.lng,
      accuracy: 5.0,
      timestamp,
      source: 'simulator'
    };

    setCurrentPoint({ ...payload, segmentName: pt.segmentName });
    setPingCount((prev) => prev + 1);

    try {
      const res = await fetch(`http://localhost:5000/api/trips/${tripId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        setErrorMsg(`Simulator Backend Error: ${errData.error || res.statusText}`);
      } else {
        setErrorMsg(null);
      }
    } catch (err) {
      setErrorMsg('Backend Connection Failed: Ensure local backend server is running on port 5000.');
    }

    stepRef.current += 1;
  };

  const startSimulation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stepRef.current = 0;
    setPingCount(0);
    setSimState('RUNNING');
    setErrorMsg(null);

    sendPing();
    timerRef.current = setInterval(sendPing, 1500);
  };

  const pauseSignal = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setSimState('PAUSED');
  };

  const resumeSignal = () => {
    if (simState === 'PAUSED') {
      setSimState('RUNNING');
      sendPing();
      timerRef.current = setInterval(sendPing, 1500);
    }
  };

  const endSimulation = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setSimState('ENDED');

    try {
      await fetch(`http://localhost:5000/api/trips/${tripId}/end`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Failed to end simulated trip:', err);
    }
  };

  return (
    <div className="max-w-md mx-auto py-4 space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        {/* Banner */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
              SIMULATED DEMO DATA
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-600" />
              Demo GPS Simulator
            </h2>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">State</span>
            <span className={`text-xs font-bold ${
              simState === 'RUNNING' ? 'text-teal-600' : simState === 'PAUSED' ? 'text-amber-600' : 'text-slate-500'
            }`}>
              {simState}
            </span>
          </div>
        </div>

        {/* Direction & Trip Setup Controls */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Direction
            </label>
            <select
              value={direction}
              disabled={simState === 'RUNNING' || simState === 'PAUSED'}
              onChange={(e) => setDirection(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none disabled:opacity-60"
            >
              <option value="SEHORE_TO_VIT">Sehore → Kubreshwar → VIT Bhopal</option>
              <option value="VIT_TO_SEHORE">VIT Bhopal → Amlaha → Sehore</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Simulated Trip ID
            </label>
            <input
              type="text"
              value={tripId}
              disabled={simState === 'RUNNING' || simState === 'PAUSED'}
              onChange={(e) => setTripId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-semibold text-xs focus:outline-none disabled:opacity-60"
            />
          </div>
        </div>

        {/* Control Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={startSimulation}
            disabled={simState === 'RUNNING'}
            className="py-2.5 px-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
          >
            <Play className="w-3.5 h-3.5" /> Start
          </button>

          <button
            onClick={pauseSignal}
            disabled={simState !== 'RUNNING'}
            className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
          >
            <Pause className="w-3.5 h-3.5" /> Pause
          </button>

          <button
            onClick={resumeSignal}
            disabled={simState !== 'PAUSED'}
            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
          >
            <Play className="w-3.5 h-3.5" /> Resume
          </button>

          <button
            onClick={endSimulation}
            disabled={simState === 'IDLE' || simState === 'ENDED'}
            className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
          >
            <Square className="w-3.5 h-3.5" /> End
          </button>
        </div>

        {/* Error / Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Active Telemetry Monitor */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <span className="text-[11px] font-bold text-slate-700">Simulated GPS Feed</span>
            <span className="text-[10px] text-slate-500 font-mono">Pings: {pingCount}</span>
          </div>

          {currentPoint ? (
            <div className="space-y-2 text-xs font-mono text-slate-700 pt-1">
              <div className="text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200 font-sans font-bold">
                {currentPoint.segmentName || 'Interpolated Transit Point'}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Latitude</span>
                  <span className="font-bold text-slate-900">{currentPoint.latitude.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Longitude</span>
                  <span className="font-bold text-slate-900">{currentPoint.longitude.toFixed(6)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-2">
              Press "Start" to send simulated corridor pings.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
