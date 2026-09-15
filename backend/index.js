import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { computeSignalAwareEta, computeSignalAwareEtaWithMl, computeHybridEta, fetchMlComparisonMetrics } from './etaService.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

  const targetTripId = trip_id || 'TRIP-101';
  const targetDirection = direction || 'SEHORE_TO_VIT';
  const targetStopName = target_stop || 'VIT Bhopal Outer Highway';

  const storedTrip = activeTripsStore.get(targetTripId);
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


// POST /api/trips/:id/location
app.post('/api/trips/:id/location', (req, res) => {
  const trip_id = req.params.id;
  const { latitude, longitude, accuracy, timestamp, source } = req.body;
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

  const locationData = {
    trip_id,
    latitude,
    longitude,
    accuracy,
    timestamp: normalizedTimestamp,
    source,
    serverReceivedAt
  };

  activeTripsStore.set(trip_id, locationData);

  const signalStatus = evaluateSignalStatus(locationData, serverReceivedAt);

  io.to(`trip:${trip_id}`).emit('trip:location-updated', locationData);
  io.emit('trip:location-updated', locationData);

  io.to(`trip:${trip_id}`).emit('trip:signal-status-updated', signalStatus);
  io.emit('trip:signal-status-updated', signalStatus);

  return res.status(200).json({
    message: 'Location update processed successfully.',
    storedLocation: {
      trip_id,
      latitude,
      longitude,
      accuracy,
      timestamp: normalizedTimestamp,
      source
    },
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

// Socket.IO Subscription & Connection Handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('passenger:subscribe-trip', ({ trip_id }) => {
    if (trip_id) {
      socket.join(`trip:${trip_id}`);
      console.log(`[Socket.IO] Client ${socket.id} subscribed to trip:${trip_id}`);

      if (activeTripsStore.has(trip_id)) {
        const stored = activeTripsStore.get(trip_id);
        socket.emit('trip:location-updated', {
          trip_id: stored.trip_id,
          latitude: stored.latitude,
          longitude: stored.longitude,
          accuracy: stored.accuracy,
          timestamp: stored.timestamp,
          source: stored.source
        });
        socket.emit('trip:signal-status-updated', evaluateSignalStatus(stored));
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

if (process.argv[1] && (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('index'))) {
  httpServer.listen(PORT, () => {
    console.log(`[TransitIQ Backend] Running on http://localhost:${PORT}`);
  });
}

