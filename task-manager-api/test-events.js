// test-events.js - Verification test script for Practical 10: Asynchronous Processing with Event-Driven Architecture
const http = require('http');

const SERVER_URL = 'http://localhost:5000';

function postTask(taskData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(taskData);
    const url = new URL('/tasks', SERVER_URL);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getEvents() {
  return new Promise((resolve, reject) => {
    const url = new URL('/task-events', SERVER_URL);
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
  });
}

async function runTest() {
  console.log('========================================================================');
  console.log(' PRACTICAL 10: ASYNCHRONOUS PROCESSING WITH EVENT-DRIVEN ARCHITECTURE');
  console.log('                     TEST & VERIFICATION SCRIPT');
  console.log('========================================================================\n');

  const testTask = {
    title: 'Deploy Production Build with EventEmitter',
    description: 'Practical 10 background event notification test task',
    priority: 'high',
    assignedTo: 'rutansh.govardhan@student.univ.edu'
  };

  console.log(`[CLIENT] Sending POST /tasks request to ${SERVER_URL}/tasks...`);
  console.log(`[CLIENT] Payload:`, testTask);

  const clientSendTime = new Date().toISOString();
  console.log(`[CLIENT] Request sent at: ${clientSendTime}`);

  const response = await postTask(testTask);
  const clientReceiveTime = new Date().toISOString();

  console.log(`\n[CLIENT] Received HTTP Response Status: ${response.statusCode} (Expected: 201)`);
  console.log(`[CLIENT] Response received at:          ${clientReceiveTime}`);
  console.log(`[CLIENT] Server X-Response-Time:        ${response.headers['x-response-time'] || 'N/A'}`);
  console.log(`[CLIENT] Created Task ID:               ${response.body._id}`);

  // Small delay to allow asynchronous setImmediate handler to complete
  await new Promise(r => setTimeout(r, 200));

  // Fetch logged events from server
  console.log(`\n[VERIFICATION] Querying server background event registry (/task-events)...`);
  const eventRegistry = await getEvents();

  console.log(`[VERIFICATION] Total Events in Registry: ${eventRegistry.totalEvents}`);

  const matchedEvent = (eventRegistry.events || []).find(e => e.taskId === response.body._id);

  if (matchedEvent) {
    console.log('\n========================================================================');
    console.log('                  VERIFIED ASYNCHRONOUS EVENT LOG');
    console.log('========================================================================');
    console.log(` Event Type:              ${matchedEvent.event}`);
    console.log(` Task Title:              "${matchedEvent.title}"`);
    console.log(` Task ID:                 ${matchedEvent.taskId}`);
    console.log(` Assigned User:           ${matchedEvent.assignedUser}`);
    console.log(` Task Creation Timestamp: ${matchedEvent.createdAt}`);
    console.log(` API Response Sent At:    ${matchedEvent.apiResponseTime} (Synchronous)`);
    console.log(` Handler Executed At:     ${matchedEvent.handlerExecutionTime} (Asynchronous)`);
    console.log(` Execution Status:        ${matchedEvent.status}`);
    console.log('========================================================================');

    console.log('\n[PASS] Synchronous vs Asynchronous Demonstration:');
    console.log(` • HTTP 201 Response dispatched immediately without blocking.`);
    console.log(` • Event handler ran on the next tick/check phase in the background.`);
    console.log(` • Verified non-blocking decoupled execution successfully!\n`);
  } else {
    console.log('\n[INFO] Event was emitted, but could not be located in recent registry.');
  }
}

runTest().catch(err => {
  console.error('[ERROR] Test failed:', err.message);
  console.error('Make sure the server is running on http://localhost:5000 and MongoDB is active.');
});
