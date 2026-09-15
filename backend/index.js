import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { computeSignalAwareEta, computeSignalAwareEtaWithMl, computeHybridEta, fetchMlComparisonMetrics, getOSRMRoute, PILOT_WAYPOINTS } from './etaService.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Express JSON body parser MUST come first for Traccar JSON payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory Live Position & Signal Evaluator Store
// Map<trip_id, { trip_id, latitude, longitude, accuracy, timestamp, source, serverReceivedAt: number }>
const activeTripsStore = new Map();

// Helper: Evaluates signal data_state and age from server receipt timestamp
export function evaluateSignalStatus(storedTrip, nowMs = Date.now()) {
  if (!storedTrip || !storedTrip.serverReceivedAt) {
    return {
      trip_id: storedTrip ? storedTrip.trip_id : null,
      data_state: 'NO_DATA',
      last_ping_age_seconds: null,
      source: null
    };
  }

  const ageSeconds = Math.max(0, Math.floor((nowMs - storedTrip.serverReceivedAt) / 1000));
  let data_state = 'LIVE';

  if (ageSeconds <= 30) {
    data_state = 'LIVE';
  } else if (ageSeconds <= 300) { // 300s = 5 minutes
    data_state = 'PARTIAL';
  } else {
    data_state = 'HISTORICAL';
  }

  return {
    trip_id: storedTrip.trip_id,
    data_state,
    last_ping_age_seconds: ageSeconds,
    source: storedTrip.source
  };
}

// Periodic ticker: Re-evaluates active trip signal degradation and emits updates
setInterval(() => {
  const now = Date.now();
  activeTripsStore.forEach((storedTrip, trip_id) => {
    const signalStatus = evaluateSignalStatus(storedTrip, now);
    io.to(`trip:${trip_id}`).emit('trip:signal-status-updated', signalStatus);
    io.emit('trip:signal-status-updated', signalStatus);
  });
}, 5000);

// GET /
app.get('/', (req, res) => {
  res.json({
    message: 'TransitIQ Backend API',
    version: '1.0.0',
    endpoints: [
      'GET /api/health',
      'GET /api/trips/:id/signal-status',
      'GET /api/routes/:id/eta',
      'POST /api/routes/:id/eta',
      'POST /api/trips/:id/position'
    ]
  });
});

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TransitIQ Backend API',
    timestamp: new Date().toISOString(),
    activeTripsCount: activeTripsStore.size
  });
});

// GET /api/trips/:id/signal-status
app.get('/api/trips/:id/signal-status', (req, res) => {
  const trip_id = req.params.id;
  const storedTrip = activeTripsStore.get(trip_id);

  if (!storedTrip) {
    return res.status(200).json({
      trip_id,
      data_state: 'NO_DATA',
      last_ping_age_seconds: null,
      source: null
    });
  }

  const status = evaluateSignalStatus(storedTrip);
  return res.status(200).json(status);
});

// GET /api/routes/:id/eta
app.get('/api/routes/:id/eta', (req, res) => {
  const route_id = req.params.id;
  const { trip_id, direction, target_stop } = req.query;

  const targetTripId = trip_id || 'TRIP-101';ī
  const targetDirection = direction || 'SEHORE_TO_VIT';
  const targetStopName = target_stop || 'VIT Bhopal Outer Highway';

  const sīoredTrip = activeTripsStore.get(targetTripId);
  const signalStatus = evaluateSignalStatus(storedTrip);

  const etaResponse = computeSignalAwareEta({
    storedTrip,
    signalStatus,
    direction: targetDirection,
    targetStop: targetStopName
  });

  return res.status(200).json(etaResponse);
});

// GET /api/trips/:id/eta (supports ?mode=historical|ml|hybrid)
app.get('/api/trips/:id/eta', async (req, res) => {
  const trip_id = req.params.id;
  const direction = req.query.direction || 'SEHORE_TO_VIT';
  const targetStop = req.query.targetStop || 'VIT Bhopal Outer Highway';
  const mode = req.query.mode || 'historical'; // 'historical', 'ml', or 'hybrid'

  const storedTrip = activeTripsStore.get(trip_id);
  const signalStatus = evaluateSignalStatus(storedTrip, Date.now());

  if (mode === 'hybrid') {
    const etaResult = await computeHybridEta({
      storedTrip,
      signalStatus,
      direction,
      targetStop
    });
    return res.status(200).json({ trip_id, ...etaResult });
  }

  if (mode === 'ml') {
    const etaResult = await computeSignalAwareEtaWithMl({
      storedTrip,
      signalStatus,
      direction,
      targetStop,
      useMl: true
    });
    return res.status(200).json({ trip_id, ...etaResult });
  }

  const etaResult = computeSignalAwareEta({
    storedTrip,
    signalStatus,
    direction,
    targetStop
  });
  return res.status(200).json({ trip_id, ...etaResult });
});

// GET /api/metrics (returns actual measured Historical Baseline vs ML vs Hybrid comparison)
app.get('/api/metrics', async (req, res) => {
  const metrics = await fetchMlComparisonMetrics();
  return res.status(200).json(metrics);
});

// GET /api/research/missing-data (returns Progressive Missing-Data Experiment results)
app.get('/api/research/missing-data', (req, res) => {
  try {
    const resultsPath = path.join(__dirname, '..', 'machine-learning', 'results', 'missing_data_results.json');
    if (fs.existsSync(resultsPath)) {
      const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      return res.status(200).json(data);
    }
  } catch (err) {
    console.error('Error reading missing_data_results.json:', err);
  }
  return res.status(503).json({ error: 'Missing data experiment results not found or unavailable' });
});

// GET /api/route-geometry (Fetches OSRM dynamic road coordinates)
app.get('/api/route-geometry', async (req, res) => {
  const direction = req.query.direction || 'SEHORE_TO_VIT';
  const waypoints = PILOT_WAYPOINTS[direction] || PILOT_WAYPOINTS.SEHORE_TO_VIT;

  const start = waypoints[0];
  const end = waypoints[waypoints.length - 1];

  const osrmData = await getOSRMRoute(start, end);

  if (osrmData) {
    return res.status(200).json({
      success: true,
      geometry: osrmData.geometry,
      distanceMeters: osrmData.distanceMeters,
      durationMinutes: osrmData.durationMinutes
    });
  }

  return res.status(500).json({ 
    success: false, 
    message: 'Could not fetch route geometry from OSRM' 
  });
});


// Replace your existing app.post('/api/trips/:id/location'...) with this:

app.post('/api/trips/:id/location', (req, res) => {
  const trip_id = req.params.id;
  // 1. Extract direction from body (defaults to 'SEHORE_TO_VIT')
  const { latitude, longitude, accuracy, timestamp, source, direction: bodyDirection } = req.body;
  const direction = bodyDirection === undefined ? 'SEHORE_TO_VIT' : bodyDirection;
  const serverReceivedAt = Date.now();

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid latitude and longitude. Both must be numbers.' });
  }

  if (typeof accuracy !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid accuracy parameter. Must be a number.' });
  }

  if (!source || !['conductor', 'simulator'].includes(source)) {
    return res.status(400).json({ error: 'Missing or invalid source. Must be "conductor" or "simulator".' });
  }

  if (!timestamp || isNaN(Date.parse(timestamp))) {
    return res.status(400).json({ error: 'Missing or invalid timestamp. Must be a valid date/time string.' });
  }

  const normalizedTimestamp = new Date(timestamp).toISOString();

  // 2. Store direction alongside location data
  const updatedTripData = {
    trip_id,
    latitude,
    longitude,
    accuracy,
    direction,
    timestamp: normalizedTimestamp,
    source,
    serverReceivedAt
  };

  activeTripsStore.set(trip_id, updatedTripData);

  const signalStatus = evaluateSignalStatus(updatedTripData, serverReceivedAt);

  // 3. Dynamically resolve destination based on active direction
  const activeWaypoints = PILOT_WAYPOINTS[direction] || PILOT_WAYPOINTS.SEHORE_TO_VIT;
  const destination = activeWaypoints[activeWaypoints.length - 1];

  // 4. Calculate OSRM route from dynamic bus position to target terminal
  getOSRMRoute({ lat: latitude, lng: longitude }, destination).then((osrmData) => {
    const distanceKm = osrmData && osrmData.distanceMeters 
      ? parseFloat((osrmData.distanceMeters / 1000).toFixed(1)) 
      : null;

    const routeCoordinates = osrmData?.routeCoordinates || (
      osrmData?.geometry?.coordinates
        ? osrmData.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        : []
    );

    const updatedPayload = {
      ...updatedTripData,
      coordinates: [latitude, longitude],
      direction: updatedTripData.direction,
      osrmGeometry: osrmData ? osrmData.geometry : null,
      routeCoordinates,
      osrmDurationMinutes: osrmData ? osrmData.durationMinutes : null,
      osrmDistanceKm: distanceKm
    };

    io.to(`trip:${trip_id}`).emit('trip:location-updated', updatedPayload);
    io.emit('trip:location-updated', updatedPayload);
  });

  io.to(`trip:${trip_id}`).emit('trip:signal-status-updated', signalStatus);
  io.emit('trip:signal-status-updated', signalStatus);

  return res.status(200).json({
    message: 'Location update processed successfully.',
    storedLocation: updatedTripData,
    signalStatus
  });
});

// POST /api/trips/:id/end
app.post('/api/trips/:id/end', (req, res) => {
  const trip_id = req.params.id;
  const existed = activeTripsStore.has(trip_id);

  activeTripsStore.delete(trip_id);

  if (existed) {
    const endEvent = { trip_id, timestamp: new Date().toISOString() };
    io.to(`trip:${trip_id}`).emit('trip:ended', endEvent);
    io.emit('trip:ended', endEvent);
  }

  return res.status(200).json({
    message: existed ? `Trip ${trip_id} state cleared.` : `Trip ${trip_id} was not active.`,
    trip_id
  });
});

// POST /api/traccar/webhook
app.post('/api/traccar/webhook', (req, res) => {
  const body = req.body || {};
  const position = body.position || body;
  const device = body.device || {};

  const deviceId = body.deviceId || device.id || position.deviceId || body.id || 'TRIP-101';
  const trip_id = typeof deviceId === 'string' && deviceId.startsWith('TRIP-') ? deviceId : 'TRIP-101';

  const latitude = typeof position.latitude === 'number'
    ? position.latitude
    : (typeof body.latitude === 'number' ? body.latitude : parseFloat(position.lat || body.lat));
  const longitude = typeof position.longitude === 'number'
    ? position.longitude
    : (typeof body.longitude === 'number' ? body.longitude : parseFloat(position.lon || body.lon || position.lng || body.lng));
  const speed = typeof position.speed === 'number'
    ? position.speed
    : (typeof body.speed === 'number' ? body.speed : 0);
  const fixTime = position.fixTime || position.deviceTime || body.fixTime || body.deviceTime || new Date().toISOString();

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing latitude/longitude coordinates.' });
  }

  const existingTrip = activeTripsStore.get(trip_id);
  const direction = existingTrip?.direction || 'SEHORE_TO_VIT';
  const serverReceivedAt = Date.now();

  const updatedTripData = {
    trip_id,
    latitude,
    longitude,
    accuracy: typeof position.accuracy === 'number' ? position.accuracy : 5,
    speed,
    direction,
    timestamp: new Date(fixTime).toISOString(),
    source: 'traccar',
    serverReceivedAt
  };

  activeTripsStore.set(trip_id, updatedTripData);

  const signalStatus = evaluateSignalStatus(updatedTripData, serverReceivedAt);
  const activeWaypoints = PILOT_WAYPOINTS[direction] || PILOT_WAYPOINTS.SEHORE_TO_VIT;
  const destination = activeWaypoints[activeWaypoints.length - 1];

  getOSRMRoute({ lat: latitude, lng: longitude }, destination).then((osrmData) => {
    const distanceKm = osrmData && osrmData.distanceMeters 
      ? parseFloat((osrmData.distanceMeters / 1000).toFixed(1)) 
      : null;

    const routeCoordinates = osrmData?.routeCoordinates || (
      osrmData?.geometry?.coordinates
        ? osrmData.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        : []
    );

    const updatedPayload = {
      ...updatedTripData,
      coordinates: [latitude, longitude],
      direction,
      osrmGeometry: osrmData ? osrmData.geometry : null,
      routeCoordinates,
      osrmDurationMinutes: osrmData ? osrmData.durationMinutes : null,
      osrmDistanceKm: distanceKm
    };

    io.to(`trip:${trip_id}`).emit('trip:location-updated', updatedPayload);
    io.emit('trip:location-updated', updatedPayload);
  });

  io.to(`trip:${trip_id}`).emit('trip:signal-status-updated', signalStatus);
  io.emit('trip:signal-status-updated', signalStatus);

  return res.status(200).json({
    success: true,
    message: 'Traccar ping processed'
  });
});

// Socket.IO Subscription & Connection Handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('passenger:subscribe-trip', ({ trip_id }) => {
    if (trip_id) {
      socket.join(`trip:${trip_id}`);
      console.log(`[Socket.IO] Client ${socket.id} subscribed to trip:${trip_id}`);

      if (activeTripsStore.has(trip_id)) {
        const stored = activeTripsStore.get(trip_id);
        const coordinates = [stored.latitude, stored.longitude];
        socket.emit('trip:location-updated', {
          trip_id: stored.trip_id,
          latitude: stored.latitude,
          longitude: stored.longitude,
          coordinates,
          accuracy: stored.accuracy,
          timestamp: stored.timestamp,
          source: stored.source
        });
        socket.emit('trip:signal-status-updated', evaluateSignalStatus(stored));
      }
      //send baseline route geometry to newly connected map
      const defaultWaypoints = PILOT_WAYPOINTS.SEHORE_TO_VIT;
      getOSRMRoute(defaultWaypoints[0], defaultWaypoints[defaultWaypoints.length - 1]).then((osrmData) => {
        if (osrmData) {
          const routeCoordinates = osrmData.routeCoordinates || (
            osrmData.geometry?.coordinates
              ? osrmData.geometry.coordinates.map(([lng, lat]) => [lat, lng])
              : []
          );
          socket.emit('route:geometry-loaded', { geometry: osrmData.geometry, routeCoordinates });
        }
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

app.all(['/api/ingest', '/'], (req, res) => {
  // Grab query params or fallback to body
  const raw = Object.keys(req.query).length ? req.query : req.body;
  
  if (raw && (raw.lat || raw.latitude)) {
    const locationData = {
      trip_id: raw.id || raw.deviceId || 'TRIP-101',
      latitude: parseFloat(raw.lat || raw.latitude),
      longitude: parseFloat(raw.lon || raw.longitude),
      accuracy: parseFloat(raw.accuracy || 10),
      timestamp: new Date().toISOString(),
      source: 'conductor',
      serverReceivedAt: Date.now()
    };

    // Store in active trips map
    activeTripsStore.set(locationData.trip_id, locationData);

    // Broadcast live update over Socket.IO to React Map
    io.emit('trip:location-updated', locationData);
    console.log('🚌 Live GPS Processed & Broadcasted:', locationData);
  } else {
    console.log('📡 Ingest ping received (no coordinates attached yet)');
  }

  res.status(200).send('OK');
});


if (!process.env.NODE_ENV || process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index')) {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[TransitIQ Backend] Listening on port ${PORT}`);
  });
}
