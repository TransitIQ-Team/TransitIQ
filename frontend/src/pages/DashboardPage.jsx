import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Bus, MapPin, Search, ArrowRightLeft, Clock, Wifi, SignalLow, SignalZero, CheckCircle2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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

// Fix for default marker icons broken by Webpack/Vite bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const crowdVerifiedMarkerIcon = L.divIcon({
  className: 'custom-crowd-marker',
  html: `<div style="background-color: #0284c7; color: white; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
    <span>✓ Bus Verified</span>
  </div>`,
  iconSize: [110, 28],
  iconAnchor: [55, 14]
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
  const [reportingPresence, setReportingPresence] = useState(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState(null);
  const socketRef = React.useRef(null);

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
        // Source is GeoJSON object with [lng, lat] coordinates -> Convert to [lat, lng] for Leaflet
        routeCoordinates = rawGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
      } else if (Array.isArray(rawGeometry)) {
        // Source is pre-formatted routeCoordinates array already in [lat, lng] order -> Retain [lat, lng]
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
        // Source is GeoJSON object with [lng, lat] coordinates -> Convert to [lat, lng] for Leaflet
        routeCoordinates = rawGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
      } else if (Array.isArray(rawGeometry)) {
        // Source is pre-formatted routeCoordinates array already in [lat, lng] order -> Retain [lat, lng]
        routeCoordinates = rawGeometry.map(pt => Array.isArray(pt) ? (pt.length >= 2 ? [pt[0], pt[1]] : pt) : [pt.lat, pt.lng]);
      }

      console.log("Received Map Data:", { tripCoordinates, routeCoordinates });

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
          // Source is OSRM GeoJSON with [lng, lat] coordinates -> Convert to [lat, lng] for Leaflet
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
      // Source is GeoJSON object with [lng, lat] coordinates -> Convert to [lat, lng] for Leaflet
      routeCoordinates = rawGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
    } else if (Array.isArray(rawGeometry)) {
      // Source is pre-formatted routeCoordinates array already in [lat, lng] order -> Retain [lat, lng]
      routeCoordinates = rawGeometry.map(pt => Array.isArray(pt) ? (pt.length >= 2 ? [pt[0], pt[1]] : pt) : [pt.lat, pt.lng]);
    }

    console.log("Received Map Data:", { tripCoordinates, routeCoordinates });

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

  const handleConfirmArrival = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setReportingPresence(true);
    setReportSuccessMsg(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (socketRef.current) {
          socketRef.current.emit('passenger:report-presence', {
            trip_id: 'TRIP-101',
            passengerLat: latitude,
            passengerLng: longitude,
            clientId: socketRef.current.id
          });
        }
        setReportingPresence(false);
        setReportSuccessMsg('Arrival reported! Bus position updated with crowd verification.');
        setTimeout(() => setReportSuccessMsg(null), 6000);
      },
      (err) => {
        console.error('Error fetching position for presence report:', err);
        setReportingPresence(false);
        alert('Could not retrieve location. Please check location permissions.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const getSignalBadge = (state) => {
    switch (state) {
      case 'CROWD_VERIFIED':
        return {
          label: '✓ Verified by Passengers • Live Crowd Presence',
          color: 'bg-sky-50 text-sky-800 border-sky-300',
          icon: CheckCircle2
        };
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
    // GeoJSON geometry object with [lng, lat] coordinates -> Convert to [lat, lng] for Leaflet
    ? rawEtaGeometry.coordinates.map(([lng, lat]) => [lat, lng])
    // Pre-formatted routeCoordinates array already in [lat, lng] order -> Retain [lat, lng]
    : (Array.isArray(rawEtaGeometry) ? rawEtaGeometry.map(pt => Array.isArray(pt) ? (pt.length >= 2 ? [pt[0], pt[1]] : pt) : [pt.lat, pt.lng]) : []);

  const staticHighwayCoords = STATIC_WAYPOINTS[direction] || STATIC_WAYPOINTS.SEHORE_TO_VIT;
  const activeRoadCoords = (socketRouteCoords && socketRouteCoords.length >= 2)
    ? socketRouteCoords
    : ((fallbackRouteCoords && fallbackRouteCoords.length >= 2) ? fallbackRouteCoords : staticHighwayCoords);

  const routeCoordinates = activeRoadCoords;

  const [animatedTripCoords, setAnimatedTripCoords] = useState(null);
  const animFrameRef = React.useRef(null);
  const visualDistanceRef = React.useRef(0);
  const targetDistanceRef = React.useRef(0);
  const activeRoadCoordsRef = React.useRef([]);
  const cumDistancesRef = React.useRef([]);
  const lastTargetIdxRef = React.useRef(0);
  const lastPingTimeRef = React.useRef(null);
  const targetIntervalRef = React.useRef(1.5);

  // Haversine distance in meters between two [lat, lng] points
  const haversineMeters = (p1, p2) => {
    const R = 6371000;
    const dLat = (p2[0] - p1[0]) * Math.PI / 180;
    const dLng = (p2[1] - p1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Build cumulative Haversine distance array for active road polyline
  const buildCumulativeDistances = (coordsArray) => {
    if (!coordsArray || coordsArray.length === 0) return [];
    const cum = [0];
    for (let i = 0; i < coordsArray.length - 1; i++) {
      const dist = haversineMeters(coordsArray[i], coordsArray[i + 1]);
      cum.push(cum[i] + dist);
    }
    return cum;
  };

  // Sync activeRoadCoordsRef and re-build cumulative distance table
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

  // Handle new Socket.IO target arrivals
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
      // Monotonic update: target distance must never decrease
      if (newTargetDist > targetDistanceRef.current) {
        targetDistanceRef.current = newTargetDist;
      }
      // If initial positioning or major gap (> 2500m), snap visual position immediately
      if (visualDistanceRef.current === 0 || (newTargetDist - visualDistanceRef.current > 2500)) {
        visualDistanceRef.current = newTargetDist;
      }
    }
  }, [tripCoordinates?.[0], tripCoordinates?.[1]]);

  // Reset forward distance progress tracking when route direction changes
  useEffect(() => {
    visualDistanceRef.current = 0;
    targetDistanceRef.current = 0;
    lastTargetIdxRef.current = 0;
    lastPingTimeRef.current = null;
    setAnimatedTripCoords(null);
  }, [direction]);

  // Convert distance along polyline back to exact interpolated [lat, lng]
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

  // Persistent Single requestAnimationFrame Loop (Dynamic Adaptive Velocity)
  useEffect(() => {
    let running = true;
    let lastTime = performance.now();

    const tick = (now) => {
      if (!running) return;

      const deltaSec = Math.min((now - lastTime) / 1000, 0.1); // Clamp delta to avoid huge skips
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
        // Dynamically compute speed to smoothly traverse remaining distance over the expected ping interval
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
        // Initial positioning
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

        {/* Bus Location Status & Crowd Verification */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs text-slate-700">
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-900">Bus is Currently: </span>
              <span>
                {etaData && etaData.current_segment ? etaData.current_segment : 'Between Amlaha and Toll Plaza'}
              </span>
            </div>
          </div>

          {(activeDataState === 'HISTORICAL' || activeDataState === 'NO_DATA') && (
            <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-sky-50 p-3.5 rounded-xl border border-sky-200">
              <div>
                <span className="font-bold text-sky-900 text-xs block">Is the bus here? Confirm arrival</span>
                <span className="text-[11px] text-sky-700">Verify bus presence to restore live arrival updates for all passengers.</span>
              </div>
              <button
                onClick={handleConfirmArrival}
                disabled={reportingPresence}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                {reportingPresence ? 'Verifying Location...' : 'Confirm Arrival'}
              </button>
            </div>
          )}

          {reportSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{reportSuccessMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Route Map */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-slate-800">
          <Bus className="w-5 h-5 text-teal-600" />
          <h2 className="font-bold">Pilot Corridor: Sehore Bus Stand ↔ VIT Bhopal</h2>
        </div>
        <div
          className="relative z-0 overflow-hidden rounded-2xl"
          style={{ height: '360px', width: '100%' }}
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
            {Array.isArray(routeCoordinates) && routeCoordinates.length > 0 && (
              <Polyline positions={routeCoordinates} color="#0d9488" weight={5} smoothFactor={0} />
            )}
            {Array.isArray(animatedTripCoords || tripCoordinates) && (
              <Marker
                position={animatedTripCoords || tripCoordinates}
                icon={activeDataState === 'CROWD_VERIFIED' ? crowdVerifiedMarkerIcon : new L.Icon.Default()}
              >
                <Popup>
                  {activeDataState === 'CROWD_VERIFIED' ? '✓ Verified by Passengers' : 'Current bus location'}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
