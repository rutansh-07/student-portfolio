const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const EventEmitter = require('events');
const Task = require('./models/Task');
const Contact = require('./models/Contact');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// --- Practical 10: Event-Driven Architecture with Native EventEmitter ---
const taskEventEmitter = new EventEmitter();

// In-memory store of processed background events (for practical verification & dashboard)
const recentTaskEvents = [];

// Asynchronous background notification listener for 'task-created'
taskEventEmitter.on('task-created', (taskData) => {
  // Use setImmediate to defer processing to the check phase of the Node.js event loop.
  // This guarantees that the HTTP 201 response is sent synchronously before this listener runs.
  setImmediate(async () => {
    const handlerExecutionTime = new Date().toISOString();
    const eventLogEntry = {
      event: 'task-created',
      taskId: taskData.taskId,
      title: taskData.title,
      assignedUser: taskData.assignedUser,
      createdAt: taskData.createdAt,
      apiResponseTime: taskData.apiResponseTime,
      handlerExecutionTime: handlerExecutionTime,
      status: 'processed'
    };
    recentTaskEvents.unshift(eventLogEntry);
    if (recentTaskEvents.length > 25) recentTaskEvents.pop();

    console.log('\n======================================================');
    console.log(' [ASYNC EVENT LISTENER] Background Notification Triggered');
    console.log('======================================================');
    console.log(` Event Name:             'task-created'`);
    console.log(` Listener Executed At:   ${handlerExecutionTime}`);
    console.log(` API Response Sent At:   ${taskData.apiResponseTime}`);
    console.log(` Notification Details:`);
    console.log(`   • Task Title:          "${taskData.title}"`);
    console.log(`   • Task ID:             ${taskData.taskId}`);
    console.log(`   • Assigned User:       ${taskData.assignedUser}`);
    console.log(`   • Task Created At:     ${taskData.createdAt}`);
    console.log(` Status:                 Notification processed asynchronously (non-blocking)`);
    console.log('======================================================\n');
  });
});

app.use(cors({
  exposedHeaders: ['X-Response-Time', 'X-Cache', 'X-Cache-TTL']
}));
// Middleware to parse JSON bodies
app.use(express.json());

// --- Performance & Response Time Measurement Middleware ---
app.use((req, res, next) => {
  const start = process.hrtime();

  // Attach X-Response-Time before headers are written
  const originalEnd = res.end;
  res.end = function (...args) {
    const diff = process.hrtime(start);
    const durationMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs}ms`);
    }
    return originalEnd.apply(this, args);
  };

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);
    const cacheStatus = res.getHeader('X-Cache') || 'NONE';
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} [Cache: ${cacheStatus}] (${durationMs}ms)`);
  });

  next();
});

// --- Server-Side In-Memory Cache Store ---
const cache = new Map();
const cacheStats = {
  hits: 0,
  misses: 0,
  invalidations: 0
};

// Cache Middleware (default TTL: 60s)
const cacheMiddleware = (ttlSeconds = 60) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const cacheKey = `__cache__${req.user?.id || 'public'}__${req.originalUrl || req.url}`;
    const cachedEntry = cache.get(cacheKey);
    const now = Date.now();

    if (cachedEntry && cachedEntry.expiry > now) {
      cacheStats.hits++;
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-TTL', Math.ceil((cachedEntry.expiry - now) / 1000));
      return res.json(cachedEntry.data);
    }

    // Cache Miss
    cacheStats.misses++;
    res.setHeader('X-Cache', 'MISS');

    // Intercept res.json to populate the cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data: body,
          expiry: now + ttlSeconds * 1000
        });
      }
      return originalJson(body);
    };

    next();
  };
};

// Invalidate cache by prefix or completely
const invalidateCache = (prefix = '') => {
  cacheStats.invalidations++;
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(prefix)) {
      cache.delete(key);
    }
  }
};

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/task_management_db';
mongoose.connect(MONGO_URI)
  .then(() => console.log(`Connected to MongoDB at ${MONGO_URI}`))
  .catch((err) => console.error('MongoDB connection error:', err));

// --- Auth Routes ---

app.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword });
    res.status(201).json({ message: 'User created', userId: user._id });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    next(error);
  }
});

app.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    next(error);
  }
});

// Auth Middleware (Strict for auth routes)
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Optional Auth Middleware for Tasks (works both logged-in and guest)
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET);
      req.user = decoded;
    }
  } catch (error) {
    // If invalid token, proceed without req.user
  }
  next();
};

app.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Validation Middleware
const validateTask = (req, res, next) => {
  if (req.method === 'POST') {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
  } else if (req.method === 'PUT') {
    if (req.body.title !== undefined && !req.body.title.trim()) {
      return res.status(400).json({ message: 'Title cannot be empty' });
    }
  }
  next();
};

// --- Cache Management Endpoints ---
app.get('/cache-stats', (req, res) => {
  res.json({
    activeEntries: cache.size,
    stats: cacheStats,
    keys: Array.from(cache.keys())
  });
});

app.post('/cache-clear', (req, res) => {
  cache.clear();
  cacheStats.invalidations++;
  res.json({ message: 'Server cache cleared successfully' });
});

// --- Routes ---

// Apply optional auth middleware to all task routes
app.use('/tasks', optionalAuthMiddleware);

// Create a new task (Emits 'task-created' event & responds immediately with HTTP 201)
app.post('/tasks', validateTask, async (req, res, next) => {
  try {
    const requestTime = new Date().toISOString();
    console.log(`\n------------------------------------------------------`);
    console.log(`[API SYNC] [1/3] POST /tasks received at: ${requestTime}`);

    const payload = { ...req.body };
    if (req.user && req.user.id) {
      payload.user = req.user.id;
    }
    if (payload.completed !== undefined && payload.status === undefined) {
      payload.status = payload.completed ? 'completed' : 'pending';
    }

    // 1. Synchronous persistence to MongoDB
    const newTask = await Task.create(payload);
    const dbSavedTime = new Date().toISOString();
    console.log(`[API SYNC] [2/3] Task persisted to MongoDB at: ${dbSavedTime} (ID: ${newTask._id})`);

    // Invalidate GET cache
    invalidateCache('/tasks');

    // Resolve assigned user for notification payload
    let assignedUser = 'Guest / Unassigned';
    if (req.user && req.user.id) {
      try {
        const u = await User.findById(req.user.id).select('email');
        if (u && u.email) assignedUser = u.email;
        else assignedUser = `User (${req.user.id})`;
      } catch (err) {
        assignedUser = req.user.id;
      }
    } else if (payload.assignedTo || payload.user) {
      assignedUser = payload.assignedTo || payload.user;
    }

    const responseTime = new Date().toISOString();

    // 2. Emit 'task-created' event using Node.js native EventEmitter
    const eventPayload = {
      taskId: newTask._id,
      title: newTask.title,
      assignedUser: assignedUser,
      createdAt: newTask.createdAt,
      requestReceivedTime: requestTime,
      apiResponseTime: responseTime
    };

    console.log(`[API SYNC] [3/3] Emitting 'task-created' event at: ${responseTime}`);
    taskEventEmitter.emit('task-created', eventPayload);

    // 3. Respond immediately with HTTP 201 without waiting for background handler to finish
    console.log(`[API SYNC] [DONE] Responding immediately with HTTP 201 at: ${responseTime}`);
    console.log(`------------------------------------------------------\n`);
    res.status(201).json(newTask);
  } catch (error) {
    next(error);
  }
});

// Endpoint to retrieve recent asynchronous task events (for verification & practical demonstration)
app.get('/task-events', (req, res) => {
  res.json({
    totalEvents: recentTaskEvents.length,
    events: recentTaskEvents
  });
});

// Get all tasks (Cached for 60 seconds)
app.get('/tasks', cacheMiddleware(60), async (req, res, next) => {
  try {
    let filter = {};
    if (req.user && req.user.id) {
      filter = { $or: [{ user: req.user.id }, { user: null }, { user: { $exists: false } }] };
    }
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// Get a single task by ID (Cached for 60 seconds)
app.get('/tasks/:id', cacheMiddleware(60), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Update a task by ID (Invalidates cache)
app.put('/tasks/:id', validateTask, async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (updateData.completed !== undefined && updateData.status === undefined) {
      updateData.status = updateData.completed ? 'completed' : 'pending';
    }
    if (updateData.title) {
      updateData.title = updateData.title.trim();
    }
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    );
    
    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    invalidateCache('/tasks');
    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
});

// Delete a task by ID (Invalidates cache)
app.delete('/tasks/:id', async (req, res, next) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    invalidateCache('/tasks');
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// --- Contacts Routes ---

app.post('/contacts', async (req, res, next) => {
  try {
    console.log('POST /contacts payload:', req.body);
    const newContact = await Contact.create(req.body);
    res.status(201).json(newContact);
  } catch (error) {
    next(error);
  }
});

app.get('/contacts', async (req, res, next) => {
  try {
    const contacts = await Contact.find();
    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

app.put('/contacts/:id', async (req, res, next) => {
  try {
    const updatedContact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedContact);
  } catch (error) {
    next(error);
  }
});

app.delete('/contacts/:id', async (req, res, next) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(el => el.message);
    return res.status(400).json({
      status: 'fail',
      errors: errors
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'fail',
      message: `Invalid ${err.path}: ${err.value}.`
    });
  }

  console.error(err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Something went wrong!'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
