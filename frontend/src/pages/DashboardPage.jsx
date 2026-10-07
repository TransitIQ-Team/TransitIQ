import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Bus, MapPin, Search, ArrowRightLeft, Clock, Wifi, SignalLow, SignalZero, Navigation, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const API_URL = import.meta.env.VITE_API_URL || 'https://transitiq-backend-1icp.onrender.com';

const STATIC_WAYPOINTS = {
  SEHORE_TO_VIT: [
    [23.200078, 77.087906],
    [23.164298, 77.005836],
    [23.118575, 76.903982],
    [23.102305, 76.875963],
    [23.081236, 76.842881]
  ],
  VIT_TO_SEHORE: [
    [23.081345, 76.842785],
    [23.118575, 76.903982],
    [23.164486, 77.005700],
    [23.193541, 77.073072],
    [23.197895, 77.081507],
    [23.200078, 77.087906]
  ]
};

const CORRIDOR_STOPS = {
  SEHORE_TO_VIT: [
    { name: 'Sehore Bus Stand', coords: [23.200078, 77.087906], type: 'origin' },
    { name: 'Kubreshwar Dham', coords: [23.164298, 77.005836], type: 'intermediate' },
    { name: 'Amlaha', coords: [23.118575, 76.903982], type: 'intermediate' },
    { name: 'Toll Plaza', coords: [23.102305, 76.875963], type: 'intermediate' },
    { name: 'VIT Bhopal Outer Highway', coords: [23.081236, 76.842881], type: 'destination' }
  ],
  VIT_TO_SEHORE: [
    { name: 'VIT Bhopal Outer Highway', coords: [23.081345, 76.842785], type: 'origin' },
    { name: 'Toll Plaza', coords: [23.102305, 76.875963], type: 'intermediate' },
    { name: 'Amlaha', coords: [23.118575, 76.903982], type: 'intermediate' },
    { name: 'Kubreshwar Dham', coords: [23.164486, 77.005700], type: 'intermediate' },
    { name: 'Sehore Bus Stand', coords: [23.200078, 77.087906], type: 'destination' }
  ]
};

// Fix default marker icons broken by Vite bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Modern animated bus marker icon
const busMarkerIcon = L.divIcon({
  className: 'custom-bus-marker',
  html: `<div style="position: relative; display: flex; align-items: center; justify-content: center;">
    <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background-color: rgba(13, 148, 136, 0.25); animation: pulse 2s infinite ease-in-out;"></div>
    <div style="width: 36px; height: 36px; border-radius: 50%; background-color: #0d9488; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2.5px solid white;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M4 18v2"/><path d="M20 18v2"/><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/></svg>
    </div>
  </div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22]
});

export default function DashboardPage({ latestEvent }) {
  const [fromLoc, setFromLoc] = useState("Sehore Bus Stand");
  const [toLoc, setToLoc] = useState("VIT Bhopal Outer Highway");
  const [direction, setDirection] = useState("SEHORE_TO_VIT");
  const [targetStop, setTargetStop] = useState("VIT Bhopal Outer Highway");
  const [etaData, setEtaData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [socketTripCoords, setSocketTripCoords] = useState(null);
  const [socketRouteCoords, setSocketRouteCoords] = useState([]);
  const [liveDataState, setLiveDataState] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 3000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('passenger:subscribe-trip', { trip_id: 'TRIP-101' });
    });

    socket.on('route:geometry-loaded', (data) => {
      const rawGeometry = data?.geometry || data?.routeCoordinates;
      let routeCoordinates = [];
      if (rawGeometry?.coordinates && Array.isArray(rawGeometry.coordinates)) {
        routeCoordinates = rawGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
      } else if (Array.isArray(rawGeometry)) {
        routeCoordinates = rawGeometry.map(pt => Array.isArray(pt) ? (pt.length >= 2 ? [pt[0], pt[1]] : pt) : [pt.lat, pt.lng]);
      }
      if (routeCoordinates.length >= 2) {
        setSocketRouteCoords(routeCoordinates);
      }
    });

    socket.on('trip:signal-status-updated', (status) => {
      if (status && status.data_state) {
        setLiveDataState(status.data_state);
      }
    });

    socket.on('trip:location-updated', (data) => {
      if (data && data.data_state) {
        setLiveDataState(data.data_state);
      }
      const tripCoordinates = (data?.latitude != null && data?.longitude != null)
        ? [data.latitude, data.longitude]
        : null;

      const rawGeometry = data?.osrmGeometry || data?.geometry || data?.routeCoordinates;
      let routeCoordinates = [];
      if (rawGeometry?.coordinates && Array.isArray(rawGeometry.coordinates)) {
        routeCoordinates = rawGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
      } else if (Array.isArray(rawGeometry)) {
        routeCoordinates = rawGeometry.map(pt => Array.isArray(pt) ? (pt.length >= 2 ? [pt[0], pt[1]] : pt) : [pt.lat, pt.lng]);
      }

      if (tripCoordinates) setSocketTripCoords(tripCoordinates);
      if (routeCoordinates.length >= 2) setSocketRouteCoords(routeCoordinates);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch full OSRM route geometry on component mount and direction change
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_URL}/api/route-geometry?direction=${direction}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.geometry?.coordinates) {
          const formatted = data.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          if (formatted.length >= 2) {
            setSocketRouteCoords(formatted);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch initial OSRM route geometry:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [direction]);

  useEffect(() => {
    if (!latestEvent) return;

    const tripCoordinates = (latestEvent?.latitude != null && latestEvent?.longitude != null)
      ? [latestEvent.latitude, latestEvent.longitude]
      : null;

    const rawGeometry = latestEvent?.osrmGeometry || latestEvent?.geometry || latestEvent?.routeCoordinates;
    let routeCoordinates = [];
    if (rawGeometry?.coordinates && Array.isArray(rawGeometry.coordinates)) {
      routeCoordinates = rawGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
    } else if (Array.isArray(rawGeometry)) {
      routeCoordinates = rawGeometry.map(pt => Array.isArray(pt) ? (pt.length >= 2 ? [pt[0], pt[1]] : pt) : [pt.lat, pt.lng]);
    }

    if (tripCoordinates) setSocketTripCoords(tripCoordinates);
    if (routeCoordinates.length > 0) setSocketRouteCoords(routeCoordinates);
  }, [latestEvent]);

  const fetchLiveEta = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/trips/TRIP-101/eta?mode=hybrid&direction=${direction}&targetStop=${encodeURIComponent(targetStop)}`);
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
          shortLabel: 'LIVE GPS',
          title: 'Live GPS Signal Active',
          desc: 'ETA updated in real time from bus location.',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dotColor: 'bg-emerald-500',
          icon: Wifi
        };
      case 'PARTIAL':
        return {
          shortLabel: 'PARTIAL SIGNAL',
          title: 'Intermittent Signal',
          desc: 'Blending live GPS updates with corridor velocity profile.',
          color: 'bg-amber-50 text-amber-800 border-amber-300',
          dotColor: 'bg-amber-500',
          icon: SignalLow
        };
      case 'HISTORICAL':
        return {
          shortLabel: 'HISTORICAL / ESTIMATED',
          title: 'Estimated from History',
          desc: 'GPS signal offline. Prediction generated using past trips.',
          color: 'bg-slate-100 text-slate-800 border-slate-300',
          dotColor: 'bg-slate-500',
          icon: SignalZero
        };
      default:
        return {
          shortLabel: 'NO LIVE DATA',
          title: 'No Live Data Available',
          desc: 'Displaying estimated corridor timetable schedule.',
          color: 'bg-slate-100 text-slate-700 border-slate-200',
          dotColor: 'bg-slate-400',
          icon: SignalZero
        };
    }
  };

  const activeDataState = liveDataState || (etaData ? etaData.data_state : 'NO_DATA');
  const badge = getSignalBadge(activeDataState);
  const BadgeIcon = badge.icon;
  const tripData = etaData?.tripData || etaData?.trip || etaData;
  const fallbackTripCoords = (tripData?.latitude != null && tripData?.longitude != null)
    ? [tripData.latitude, tripData.longitude]
    : null;
  const tripCoordinates = socketTripCoords || fallbackTripCoords;

  const rawEtaGeometry = etaData?.geometry || etaData?.osrm_route?.geometry || etaData?.route_geometry || etaData?.routeCoordinates;
  const fallbackRouteCoords = rawEtaGeometry?.coordinates
    ? rawEtaGeometry.coordinates.map(([lng, lat]) => [lat, lng])
    : (Array.isArray(rawEtaGeometry) ? rawEtaGeometry.map(pt => Array.isArray(pt) ? (pt.length >= 2 ? [pt[0], pt[1]] : pt) : [pt.lat, pt.lng]) : []);

  const staticHighwayCoords = STATIC_WAYPOINTS[direction] || STATIC_WAYPOINTS.SEHORE_TO_VIT;
  const activeRoadCoords = (socketRouteCoords && socketRouteCoords.length >= 2)
    ? socketRouteCoords
    : ((fallbackRouteCoords && fallbackRouteCoords.length >= 2) ? fallbackRouteCoords : staticHighwayCoords);

  const routeCoordinates = activeRoadCoords;
  const currentStops = CORRIDOR_STOPS[direction] || CORRIDOR_STOPS.SEHORE_TO_VIT;

  const [animatedTripCoords, setAnimatedTripCoords] = useState(null);
  const animFrameRef = useRef(null);
  const visualDistanceRef = useRef(0);
  const targetDistanceRef = useRef(0);
  const activeRoadCoordsRef = useRef([]);
  const cumDistancesRef = useRef([]);
  const lastTargetIdxRef = useRef(0);
  const lastPingTimeRef = useRef(null);
  const targetIntervalRef = useRef(1.5);

  const haversineMeters = (p1, p2) => {
    const R = 6371000;
    const dLat = (p2[0] - p1[0]) * Math.PI / 180;
    const dLng = (p2[1] - p1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const buildCumulativeDistances = (coordsArray) => {
    if (!coordsArray || coordsArray.length === 0) return [];
    const cum = [0];
    for (let i = 0; i < coordsArray.length - 1; i++) {
      const dist = haversineMeters(coordsArray[i], coordsArray[i + 1]);
      cum.push(cum[i] + dist);
    }
    return cum;
  };

  useEffect(() => {
    activeRoadCoordsRef.current = activeRoadCoords;
    cumDistancesRef.current = buildCumulativeDistances(activeRoadCoords);
  }, [activeRoadCoords]);

  const distSq = (p1, p2) => {
    const dLat = p1[0] - p2[0];
    const dLng = p1[1] - p2[1];
    return dLat * dLat + dLng * dLng;
  };

  const findForwardIndex = (coordsArray, target, fromIdx) => {
    if (!coordsArray || coordsArray.length === 0) return 0;
    const startSearchIdx = Math.min(fromIdx, coordsArray.length - 1);
    let minIndex = startSearchIdx;
    let minDistance = Infinity;

    for (let i = startSearchIdx; i < coordsArray.length; i++) {
      const d = distSq(coordsArray[i], target);
      if (d < minDistance) {
        minDistance = d;
        minIndex = i;
      }
    }
    return minIndex;
  };

  useEffect(() => {
    if (!tripCoordinates) {
      setAnimatedTripCoords(null);
      visualDistanceRef.current = 0;
      targetDistanceRef.current = 0;
      lastTargetIdxRef.current = 0;
      lastPingTimeRef.current = null;
      return;
    }

    const now = performance.now();
    if (lastPingTimeRef.current !== null) {
      const elapsedSec = (now - lastPingTimeRef.current) / 1000;
      if (elapsedSec > 0.3 && elapsedSec < 30) {
        targetIntervalRef.current = elapsedSec;
      }
    }
    lastPingTimeRef.current = now;

    const roadLayer = (activeRoadCoordsRef.current && activeRoadCoordsRef.current.length >= 2)
      ? activeRoadCoordsRef.current
      : (STATIC_WAYPOINTS[direction] || STATIC_WAYPOINTS.SEHORE_TO_VIT);

    const cumDist = cumDistancesRef.current.length === roadLayer.length
      ? cumDistancesRef.current
      : buildCumulativeDistances(roadLayer);

    const targetIdx = findForwardIndex(roadLayer, tripCoordinates, lastTargetIdxRef.current);

    if (targetIdx >= lastTargetIdxRef.current && cumDist[targetIdx] !== undefined) {
      lastTargetIdxRef.current = targetIdx;
      const newTargetDist = cumDist[targetIdx];
      if (newTargetDist > targetDistanceRef.current) {
        targetDistanceRef.current = newTargetDist;
      }
      if (visualDistanceRef.current === 0 || (newTargetDist - visualDistanceRef.current > 2500)) {
        visualDistanceRef.current = newTargetDist;
      }
    }
  }, [tripCoordinates?.[0], tripCoordinates?.[1]]);

  useEffect(() => {
    visualDistanceRef.current = 0;
    targetDistanceRef.current = 0;
    lastTargetIdxRef.current = 0;
    lastPingTimeRef.current = null;
    setAnimatedTripCoords(null);
  }, [direction]);

  const getCoordinateAtDistance = (coordsArray, cumDistArray, distanceMeters) => {
    if (!coordsArray || coordsArray.length === 0) return null;
    if (coordsArray.length === 1 || distanceMeters <= 0) return coordsArray[0];

    const maxDist = cumDistArray[cumDistArray.length - 1] || 0;
    if (distanceMeters >= maxDist) return coordsArray[coordsArray.length - 1];

    for (let i = 0; i < cumDistArray.length - 1; i++) {
      const d1 = cumDistArray[i];
      const d2 = cumDistArray[i + 1];
      if (distanceMeters >= d1 && distanceMeters <= d2) {
        const segLen = d2 - d1;
        const fraction = segLen > 0 ? (distanceMeters - d1) / segLen : 0;
        const p1 = coordsArray[i];
        const p2 = coordsArray[i + 1];
        const lat = p1[0] + (p2[0] - p1[0]) * fraction;
        const lng = p1[1] + (p2[1] - p1[1]) * fraction;
        return [lat, lng];
      }
    }

    return coordsArray[coordsArray.length - 1];
  };

  useEffect(() => {
    let running = true;
    let lastTime = performance.now();

    const tick = (now) => {
      if (!running) return;

      const deltaSec = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const roadLayer = (activeRoadCoordsRef.current && activeRoadCoordsRef.current.length >= 2)
        ? activeRoadCoordsRef.current
        : (STATIC_WAYPOINTS[direction] || STATIC_WAYPOINTS.SEHORE_TO_VIT);

      const cumDist = cumDistancesRef.current.length === roadLayer.length
        ? cumDistancesRef.current
        : buildCumulativeDistances(roadLayer);

      const maxMeters = cumDist[cumDist.length - 1] || 0;
      const targetMeters = Math.min(targetDistanceRef.current, maxMeters);
      const currentMeters = visualDistanceRef.current;

      if (currentMeters < targetMeters) {
        const remaining = targetMeters - currentMeters;
        const expectedSec = Math.max(0.5, targetIntervalRef.current || 1.5);
        const dynamicSpeed = remaining / expectedSec;
        const speedMetersPerSec = Math.max(5, dynamicSpeed);

        const newDistance = Math.min(currentMeters + speedMetersPerSec * deltaSec, targetMeters);

        visualDistanceRef.current = newDistance;

        const pos = getCoordinateAtDistance(roadLayer, cumDist, newDistance);
        if (pos) {
          setAnimatedTripCoords(pos);
        }
      } else if (targetMeters > 0 && (currentMeters === 0 || animatedTripCoords === null)) {
        visualDistanceRef.current = targetMeters;
        const pos = getCoordinateAtDistance(roadLayer, cumDist, targetMeters);
        if (pos) {
          setAnimatedTripCoords(pos);
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [direction]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Top Header / Corridor Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
              Pilot Corridor Active
            </span>
            <span className="text-xs font-semibold text-slate-500">• TRIP-101</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
            <span>{direction === 'SEHORE_TO_VIT' ? 'Sehore Bus Stand' : 'VIT Bhopal Outer Highway'}</span>
            <ArrowRightLeft className="w-4 h-4 text-teal-600 shrink-0 cursor-pointer hover:rotate-180 transition-transform" onClick={handleSwap} title="Swap Corridor Direction" />
            <span>{direction === 'SEHORE_TO_VIT' ? 'VIT Bhopal Outer Highway' : 'Sehore Bus Stand'}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Signal Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${badge.color}`}>
            <span className={`w-2 h-2 rounded-full ${badge.dotColor} animate-pulse`}></span>
            <BadgeIcon className="w-4 h-4 shrink-0" />
            <span>{badge.shortLabel}</span>
          </div>
          <button
            onClick={fetchLiveEta}
            disabled={loading}
            title="Refresh live status"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Map-First Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Floating Info Panel (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4 order-2 lg:order-1">
          {/* Journey Origin / Destination Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Direction</span>
              <button
                onClick={handleSwap}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Swap
              </button>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">From</span>
                  <span className="text-xs font-bold text-slate-900 truncate block">{fromLoc}</span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">To</span>
                  <span className="text-xs font-bold text-slate-900 truncate block">{toLoc}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary ETA Display Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arrival Estimate</span>
              <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {etaData ? (etaData.confidence_level || 'Good Confidence') : 'Calculating'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Bus Will Arrive In</span>
              <div className="text-5xl font-extrabold text-slate-900 flex items-baseline justify-center gap-1.5">
                <span>{etaData && etaData.eta_minutes !== null ? etaData.eta_minutes : '--'}</span>
                <span className="text-lg font-bold text-teal-600">min</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>Window: {etaData && etaData.eta_range ? etaData.eta_range : '--'}</span>
              </div>
            </div>

            {/* Signal State Transparency Description */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <BadgeIcon className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{badge.title}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 pl-5">
                {badge.desc}
              </p>
            </div>
          </div>

          {/* Upcoming Stop Progression */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Corridor Stop Sequence</span>
              <span className="text-[11px] text-slate-400 font-medium">{currentStops.length} Stops</span>
            </div>

            <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-200">
              {currentStops.map((stop, idx) => {
                const isOrigin = idx === 0;
                const isDest = idx === currentStops.length - 1;
                return (
                  <div key={stop.name} className="relative flex items-center justify-between text-xs">
                    <span
                      className={`absolute -left-6 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                        isOrigin ? 'bg-teal-600' : isDest ? 'bg-orange-500' : 'bg-teal-400'
                      }`}
                    ></span>
                    <span className={`font-semibold ${isOrigin || isDest ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                      {stop.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {isOrigin ? 'Origin' : isDest ? 'Target' : 'Stop'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Large Interactive Map (8 cols on lg) */}
        <div className="lg:col-span-8 order-1 lg:order-2">
          <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-2">
                <Bus className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">Live Map View</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Current Segment: {etaData && etaData.current_segment ? etaData.current_segment : 'En route on corridor'}
              </span>
            </div>

            <div
              className="relative z-0 overflow-hidden rounded-2xl"
              style={{ height: '580px', width: '100%' }}
            >
              <MapContainer
                center={[23.1404, 76.9678]}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />

                {/* Corridor Polyline */}
                {Array.isArray(routeCoordinates) && routeCoordinates.length > 0 && (
                  <Polyline positions={routeCoordinates} color="#0d9488" weight={6} opacity={0.85} smoothFactor={0} />
                )}

                {/* Station Stop Markers */}
                {currentStops.map((stop) => (
                  <CircleMarker
                    key={stop.name}
                    center={stop.coords}
                    radius={stop.type === 'intermediate' ? 5 : 7}
                    pathOptions={{
                      color: stop.type === 'origin' ? '#0d9488' : stop.type === 'destination' ? '#f97316' : '#0284c7',
                      fillColor: '#ffffff',
                      fillOpacity: 1,
                      weight: 3
                    }}
                  >
                    <Popup>
                      <div className="text-xs font-bold">{stop.name}</div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* Animated Bus Location Marker */}
                {Array.isArray(animatedTripCoords || tripCoordinates) && (
                  <Marker
                    position={animatedTripCoords || tripCoordinates}
                    icon={busMarkerIcon}
                  >
                    <Popup>
                      <div className="text-xs">
                        <div className="font-bold text-teal-700">TransitIQ Bus (TRIP-101)</div>
                        <div className="text-slate-600 mt-0.5">Signal State: {badge.shortLabel}</div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
