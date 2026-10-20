# Practical 10: Asynchronous Processing with Event-Driven Architecture

| Field | Details |
|---|---|
| **Course** | Advanced Web Development Frameworks (AWDF) - Semester 5 |
| **Student Name** | Rutansh Govardhan |
| **Roll Number** | 24DCE045 |
| **Course Outcome / Program Outcome** | CO4 / PO3, PO5 |
| **Topic** | Asynchronous Processing with Event-Driven Architecture |

---

## 1. Aim
To implement asynchronous background processing using Node.js native `EventEmitter` without external dependencies.

---

## 2. Objectives & Problem Statement
* Add a decoupled background notification system to the existing Task Management Express & MongoDB backend application.
* When a new task is created via `POST /tasks`, emit a `task-created` event using Node.js's built-in `EventEmitter`.
* Respond immediately to the client with HTTP status `201 Created` without waiting for the event handler to complete.
* Handle the event asynchronously in the background and log the **task title**, **timestamp**, and **assigned user**.
* Demonstrate the empirical difference between synchronous request-response execution and asynchronous background event handling using timestamps in the console.

---

## 3. Architecture & Execution Flow Diagram

```
                       [ Client / Frontend Application ]
                                      │
                                      │  1. HTTP POST /tasks (JSON payload)
                                      ▼
                        ┌───────────────────────────────┐
                        │   Express.js API Router       │
                        │   (validateTask & Auth)       │
                        └─────────────┬─────────────────┘
                                      │
                                      │  2. Synchronous DB write
                                      ▼
                        ┌───────────────────────────────┐
                        │   MongoDB (Task.create())     │
                        └─────────────┬─────────────────┘
                                      │
                                      │  3. Emit 'task-created' event
                                      ▼
                    ┌───────────────────────────────────────┐
                    │  Node.js Native EventEmitter Instance │
                    └───────┬───────────────────────┬───────┘
                            │                       │
      4. Dispatches HTTP 201│                       │ 5. Deferred to Event Loop
         Immediately        │                       │    via setImmediate()
                            ▼                       ▼
              ┌───────────────────────────┐   ┌──────────────────────────┐
              │ Client Receives HTTP 201  │   │  Notification Listener   │
              │ Task Created (No Latency) │   │  • Task Title            │
              └───────────────────────────┘   │  • Timestamp             │
                                              │  • Assigned User         │
                                              └──────────────────────────┘
```

---

## 4. Key Theory & Concepts

### 4.1 Node.js `events.EventEmitter`
In Node.js, the `EventEmitter` class is part of the core `events` module. It allows objects to emit named events that cause previously registered function listeners to be called. By default, `EventEmitter.emit()` calls all listeners synchronously in the order they were registered.

### 4.2 Decoupling with `setImmediate()`
To prevent slow or non-critical secondary logic (e.g., logging, email notifications, audit trails, analytics) from blocking the HTTP request-response cycle, the listener logic is wrapped in `setImmediate()`. 
* `setImmediate()` schedules execution during the **Check phase** of the libuv event loop.
* This ensures the call stack clears and Express writes and flushes the HTTP 201 response header and body to the socket *before* the notification handler runs.

---

## 5. Implementation Steps

1. **Import Native Module:** Imported `EventEmitter` directly from the core `events` module in `task-manager-api/server.js` with zero third-party dependencies.
2. **Instantiate Event Bus:** Created a centralized `taskEventEmitter = new EventEmitter()` instance.
3. **Register Background Notification Listener:** Attached a listener for `'task-created'` using `taskEventEmitter.on('task-created', (taskData) => { ... })`. Inside the listener, wrapped the logging in `setImmediate()` to ensure asynchronous, non-blocking execution.
4. **Instrument `POST /tasks` Handler:**
   - Synchronously persisted task data to MongoDB with `Task.create()`.
   - Populated the assigned user and created an event payload containing `taskId`, `title`, `assignedUser`, `createdAt`, and `apiResponseTime`.
   - Emitted the `'task-created'` event via `taskEventEmitter.emit()`.
   - Immediately dispatched HTTP `201 Created` with the JSON task object.
5. **Add Event Inspection Endpoint:** Added `GET /task-events` to retrieve in-memory audit logs of emitted background events.
6. **Integrate into Student Portfolio UI:** Added `Practicals.jsx` under the route `/practicals` with an interactive event trigger, live event table, and technical documentation.
7. **Create Automated Test Script:** Developed `task-manager-api/test-events.js` to execute an automated end-to-end test verifying status codes and console timestamps.

---

## 6. Source Code

### 6.1 Backend (`task-manager-api/server.js`) - Event Bus & Listener
```javascript
const EventEmitter = require('events');

// --- Practical 10: Event-Driven Architecture with Native EventEmitter ---
const taskEventEmitter = new EventEmitter();

// In-memory store of processed background events
const recentTaskEvents = [];

// Asynchronous background notification listener for 'task-created'
taskEventEmitter.on('task-created', (taskData) => {
  // Use setImmediate to defer processing to the check phase of the event loop.
  // This guarantees that the HTTP 201 response is dispatched synchronously before this listener runs.
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
```

### 6.2 Backend (`task-manager-api/server.js`) - `POST /tasks` Route
```javascript
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
```

---

## 7. Console Output: Expected vs Verified Output

### 7.1 Expected Console Output
```text
[API SYNC] [1/3] POST /tasks received at: <TIMESTAMP_T0>
[API SYNC] [2/3] Task persisted to MongoDB at: <TIMESTAMP_T1>
[API SYNC] [3/3] Emitting 'task-created' event at: <TIMESTAMP_T2>
[API SYNC] [DONE] Responding immediately with HTTP 201 at: <TIMESTAMP_T2>
POST /tasks - 201 [Cache: NONE] (<DURATION_MS>ms)

======================================================
 [ASYNC EVENT LISTENER] Background Notification Triggered
======================================================
 Event Name:             'task-created'
 Listener Executed At:   <TIMESTAMP_T3>   (T3 >= T2)
 API Response Sent At:   <TIMESTAMP_T2>
 Notification Details:
   • Task Title:          "<TASK_TITLE>"
   • Task ID:             <OBJECT_ID>
   • Assigned User:       "<USER_EMAIL_OR_GUEST>"
   • Task Created At:     <CREATION_DATE>
 Status:                 Notification processed asynchronously (non-blocking)
======================================================
```

### 7.2 Verified Actual Output (From Server Execution & `test-events.js`)

#### Test Runner Output (`node test-events.js`):
```text
========================================================================
 PRACTICAL 10: ASYNCHRONOUS PROCESSING WITH EVENT-DRIVEN ARCHITECTURE
                     TEST & VERIFICATION SCRIPT
========================================================================

[CLIENT] Sending POST /tasks request to http://localhost:5000/tasks...
[CLIENT] Payload: {
  title: 'Deploy Production Build with EventEmitter',
  description: 'Practical 10 background event notification test task',
  priority: 'high',
  assignedTo: 'rutansh.govardhan@student.univ.edu'
}
[CLIENT] Request sent at: 2026-10-18T16:47:54.148Z

[CLIENT] Received HTTP Response Status: 201 (Expected: 201)
[CLIENT] Response received at:          2026-10-18T16:47:54.295Z
[CLIENT] Server X-Response-Time:        63.10ms
[CLIENT] Created Task ID:               6ad4f83aec0b4515c50e6e67

[VERIFICATION] Querying server background event registry (/task-events)...
[VERIFICATION] Total Events in Registry: 1

========================================================================
                  VERIFIED ASYNCHRONOUS EVENT LOG
========================================================================
 Event Type:              task-created
 Task Title:              "Deploy Production Build with EventEmitter"
 Task ID:                 6ad4f83aec0b4515c50e6e67
 Assigned User:           rutansh.govardhan@student.univ.edu
 Task Creation Timestamp: 2026-10-18T16:47:54.232Z
 API Response Sent At:    2026-10-18T16:47:54.283Z (Synchronous)
 Handler Executed At:     2026-10-18T16:47:54.292Z (Asynchronous)
 Execution Status:        processed
========================================================================

[PASS] Synchronous vs Asynchronous Demonstration:
 • HTTP 201 Response dispatched immediately without blocking.
 • Event handler ran on the next tick/check phase in the background.
 • Verified non-blocking decoupled execution successfully!
```

#### Actual Server Console Log:
```text
------------------------------------------------------
[API SYNC] [1/3] POST /tasks received at: 2026-10-18T16:47:54.152Z
[API SYNC] [2/3] Task persisted to MongoDB at: 2026-10-18T16:47:54.232Z (ID: 6ad4f83aec0b4515c50e6e67)
[API SYNC] [3/3] Emitting 'task-created' event at: 2026-10-18T16:47:54.283Z
[API SYNC] [DONE] Responding immediately with HTTP 201 at: 2026-10-18T16:47:54.283Z
------------------------------------------------------

POST /tasks - 201 [Cache: NONE] (66.03ms)

======================================================
 [ASYNC EVENT LISTENER] Background Notification Triggered
======================================================
 Event Name:             'task-created'
 Listener Executed At:   2026-10-18T16:47:54.292Z
 API Response Sent At:   2026-10-18T16:47:54.283Z
 Notification Details:
   • Task Title:          "Deploy Production Build with EventEmitter"
   • Task ID:             6ad4f83aec0b4515c50e6e67
   • Assigned User:       rutansh.govardhan@student.univ.edu
   • Task Created At:     Sun Oct 18 2026 22:17:54 GMT+0530 (India Standard Time)
 Status:                 Notification processed asynchronously (non-blocking)
======================================================

GET /task-events - 200 [Cache: NONE] (1.21ms)
```

---

## 8. Synchronous vs Asynchronous Comparison Table

| Aspect | Synchronous In-Band Processing | Asynchronous Event-Driven (EventEmitter) |
|---|---|---|
| **Client Perceived Latency** | High: Blocked until email/logging completes | Minimal: Returns immediately with HTTP 201 |
| **Throughput / Concurrency** | Decreased due to blocking call stack | High: Offloaded to libuv check phase |
| **Error Isolation** | Secondary notification error fails the request | Decoupled: Failure in listener does not fail task creation |
| **External Dependencies** | Often requires Redis, BullMQ, or Celery | None: Uses Node.js native `events` module |

---

## 9. Result
Successfully implemented asynchronous background event processing in the Task Management application using Node.js's native `EventEmitter`. When a task is created, the API responds with HTTP 201 immediately, and the `task-created` notification listener executes asynchronously on the next event loop cycle, logging the task title, timestamp, and assigned user without blocking the HTTP request-response flow.

---

## 10. Conclusion
Node.js's built-in `EventEmitter` combined with deferred scheduling (`setImmediate()`) provides a lightweight, dependency-free architecture for background processing. This approach guarantees low API latency and high throughput for core CRUD operations while preserving modularity, maintainability, and fault isolation in full-stack web applications.
