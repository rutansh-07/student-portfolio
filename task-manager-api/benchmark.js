// benchmark.js - Measures and compares API response times with and without server-side caching
const http = require('http');

const SERVER_URL = 'http://localhost:5000';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const startTime = process.hrtime();
    const req = http.get(SERVER_URL + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const diff = process.hrtime(startTime);
        const roundtripMs = Number((diff[0] * 1000 + diff[1] / 1e6).toFixed(2));
        const serverTime = res.headers['x-response-time'] || 'N/A';
        const cacheStatus = res.headers['x-cache'] || 'NONE';
        resolve({
          statusCode: res.statusCode,
          cacheStatus,
          serverTime,
          roundtripMs,
          bodyLength: data.length
        });
      });
    });
    req.on('error', reject);
  });
}

function clearCache() {
  return new Promise((resolve, reject) => {
    const req = http.request(SERVER_URL + '/cache-clear', { method: 'POST' }, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', reject);
    req.end();
  });
}

async function runBenchmark() {
  console.log('================================================================');
  console.log('     SERVER-SIDE CACHING BENCHMARK & PERFORMANCE MEASUREMENT    ');
  console.log('================================================================');
  console.log(`Connecting to: ${SERVER_URL}/tasks\n`);

  try {
    // 1. Clear cache to force a fresh Cache MISS
    await clearCache();

    // 2. Initial Request - Cache MISS
    console.log('--- Step 1: Cache MISS (Querying MongoDB) ---');
    const missResult = await makeRequest('/tasks');
    console.log(`Status:         ${missResult.statusCode}`);
    console.log(`Cache Header:   ${missResult.cacheStatus}`);
    console.log(`Server Time:    ${missResult.serverTime}`);
    console.log(`Roundtrip Time: ${missResult.roundtripMs} ms\n`);

    // 3. Second Request - Cache HIT
    console.log('--- Step 2: Cache HIT (Served from In-Memory Cache) ---');
    const hitResult = await makeRequest('/tasks');
    console.log(`Status:         ${hitResult.statusCode}`);
    console.log(`Cache Header:   ${hitResult.cacheStatus}`);
    console.log(`Server Time:    ${hitResult.serverTime}`);
    console.log(`Roundtrip Time: ${hitResult.roundtripMs} ms\n`);

    // 4. Run multiple iterations to compute averages
    console.log('--- Step 3: Running 10 Consecutive Requests to Measure Averages ---');
    const runs = 10;
    const hitTimes = [];
    for (let i = 0; i < runs; i++) {
      const res = await makeRequest('/tasks');
      hitTimes.push(parseFloat(res.serverTime) || res.roundtripMs);
    }
    const avgHit = (hitTimes.reduce((a, b) => a + b, 0) / runs).toFixed(2);
    const missTime = parseFloat(missResult.serverTime) || missResult.roundtripMs;
    const speedup = ((missTime / (parseFloat(avgHit) || 1))).toFixed(1);
    const percentReduction = (((missTime - parseFloat(avgHit)) / missTime) * 100).toFixed(1);

    console.log('\n================================================================');
    console.log('                    BENCHMARK RESULTS SUMMARY                   ');
    console.log('================================================================');
    console.table([
      {
        Metric: 'Cache MISS (Database Query)',
        'Server Time': `${missResult.serverTime}`,
        'Roundtrip Time': `${missResult.roundtripMs} ms`,
        'Cache Status': missResult.cacheStatus
      },
      {
        Metric: 'Cache HIT (Memory Cache)',
        'Server Time': `${hitResult.serverTime}`,
        'Roundtrip Time': `${hitResult.roundtripMs} ms`,
        'Cache Status': hitResult.cacheStatus
      },
      {
        Metric: 'Average Cache HIT (10 runs)',
        'Server Time': `${avgHit} ms`,
        'Roundtrip Time': `~${avgHit} ms`,
        'Cache Status': 'HIT'
      }
    ]);

    console.log(`\n Performance Impact:`);
    console.log(`  • Response time reduced by: ${percentReduction}%`);
    console.log(`  • Cache HIT is approximately ${speedup}x faster than Cache MISS!`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Benchmark failed:', err.message);
    console.error('Please ensure the server is running on http://localhost:5000 before running the benchmark.');
  }
}

runBenchmark();
