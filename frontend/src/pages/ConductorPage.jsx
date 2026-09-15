import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Play, Square, AlertTriangle } from 'lucide-react';

export default function ConductorPage() {
  const [tripId, setTripId] = useState('TRIP-101');
  const [status, setStatus] = useState('Not Started'); // 'Not Started' | 'Tracking' | 'Ended'
  const [latestGps, setLatestGps] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const startTracking = () => {
    setErrorMsg(null);
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('Tracking');

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const timestamp = new Date(position.timestamp || Date.now()).toISOString();

        const payload = {
          latitude,
          longitude,
          accuracy: accuracy || 10,
          timestamp,
          source: 'conductor'
        };

        setLatestGps(payload);

        try {
          const res = await fetch(`http://localhost:5000/api/trips/${tripId}/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            const errData = await res.json();
            setErrorMsg(`Backend Error: ${errData.error || res.statusText}`);
          }
        } catch (err) {
          setErrorMsg('Backend Connection Failed: Is local server running on port 5000?');
        }
      },
      (err) => {
        let msg = 'Unknown Geolocation Error';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Location permission denied by user/browser.';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'GPS location position unavailable.';
            break;
          case err.TIMEOUT:
            msg = 'GPS location request timed out.';
            break;
        }
        setErrorMsg(msg);
      },
      options
    );
  };

  const endTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setStatus('Ended');

    try {
      await fetch(`http://localhost:5000/api/trips/${tripId}/end`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Failed to notify backend of trip end:', err);
    }
  };

  return (
    <div className="max-w-md mx-auto py-4 space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-teal-600" />
              Conductor Portal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Real phone GPS location stream</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Status</span>
            <span className={`text-xs font-bold ${
              status === 'Tracking' ? 'text-emerald-600' : status === 'Ended' ? 'text-rose-600' : 'text-slate-500'
            }`}>
              {status}
            </span>
          </div>
        </div>

        {/* Trip / Route Selection */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Active Route
            </label>
            <input
              type="text"
              readOnly
              value="Sehore Bus Stand ↔ VIT Bhopal"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Vehicle / Trip ID
            </label>
            <input
              type="text"
              value={tripId}
              disabled={status === 'Tracking'}
              onChange={(e) => setTripId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={startTracking}
            disabled={status === 'Tracking'}
            className="py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" /> Start Trip
          </button>

          <button
            onClick={endTracking}
            disabled={status !== 'Tracking'}
            className="py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Square className="w-4 h-4" /> End Trip
          </button>
        </div>

        {/* Error / Alert Display */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Latest Telemetry Display */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <span className="text-[11px] font-bold text-slate-700">GPS Telemetry</span>
            <span className="text-[10px] text-slate-500 font-mono">GPS Status</span>
          </div>

          {latestGps ? (
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-700 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block">Latitude</span>
                <span className="font-bold text-slate-900">{latestGps.latitude.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Longitude</span>
                <span className="font-bold text-slate-900">{latestGps.longitude.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Accuracy</span>
                <span className="font-bold text-teal-700">±{latestGps.accuracy}m</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Last Update</span>
                <span className="font-bold text-slate-700">{new Date(latestGps.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-2">
              No active GPS pings recorded. Press "Start Trip" to begin tracking.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
