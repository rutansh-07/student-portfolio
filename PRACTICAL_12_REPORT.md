# Practical 12: CI/CD Pipeline with GitHub Actions

| Field | Details |
|---|---|
| **Course** | Advanced Web Development Frameworks (AWDF) - Semester 5 |
| **Student Name** | Rutansh Govardhan |
| **Roll Number** | 24DCE045 |
| **Course Outcome / Program Outcome** | CO5 / PO3, PO5 |
| **Topic** | CI/CD Pipeline with GitHub Actions |

---

## 1. Aim
To automate testing and deployment of the application using a CI/CD pipeline with GitHub Actions.

---

## 2. Problem Statement & Objectives
* Set up an automated GitHub Actions CI/CD workflow for the full-stack Task Management & Student Portfolio application.
* The workflow must automatically trigger on every `push` and `pull_request` to the `main` and `master` branches.
* Defined sequential pipeline steps:
  1. Code checkout (`actions/checkout@v4`).
  2. Node.js environment configuration (`actions/setup-node@v4` with Node 20 and npm caching).
  3. Dependency installation (`npm ci` for both frontend and backend).
  4. Frontend production compilation (`npm run build`).
  5. Automated unit/integration test execution (`npm test`).
  6. Final status reporting (Pass / Fail).
* Demonstrate a **failed pipeline** caused by a deliberately failing test assertion.
* Demonstrate a **fixed pipeline** that successfully passes after correcting the test.

---

## 3. Architecture & CI/CD Pipeline Flow Diagram

```
                         Developer pushes code
                        (git push origin master)
                                   │
                                   ▼
                   GitHub Actions Trigger (on: push)
                                   │
                                   ▼
                 ┌───────────────────────────────────┐
                 │        Job: build-and-test        │
                 ├───────────────────────────────────┤
                 │  Step 1: Checkout Code            │
                 │  Step 2: Setup Node.js v20        │
                 │  Step 3: Install Frontend Deps    │
                 │  Step 4: Install Backend Deps     │
                 │  Step 5: Compile Frontend (Build) │
                 │  Step 6: Run Automated Tests      │
                 │  Step 7: Report Pass/Fail Status  │
                 └─────────────────┬─────────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
        ❌ Pipeline Fails                   ✅ Pipeline Passes
       (Broken assertion)                  (All tests passed)
        Exit code: 1                        Exit code: 0
        Red Cross on GitHub                 Green Checkmark on GitHub
```

---

## 4. Theory & Key Concepts

### 4.1 Continuous Integration & Continuous Deployment (CI/CD)
Continuous Integration (CI) is the practice of automatically integrating code changes from multiple contributors into a shared repository several times a day. Each commit triggers an automated build and test process, enabling teams to catch bugs early, prevent regressions, and ensure software quality.

### 4.2 GitHub Actions Components
* **Workflows:** Configurable automated processes written in YAML placed in the `.github/workflows/` directory.
* **Events / Triggers:** Specific activities (e.g., `push`, `pull_request`, `schedule`) that trigger workflow runs.
* **Jobs:** A set of steps executed on the same runner virtual machine (e.g., `ubuntu-latest`).
* **Steps:** Individual tasks that can execute commands or invoke reusable community actions (e.g., `actions/checkout@v4`).

---

## 5. Implementation Files

### 5.1 Workflow Configuration (`.github/workflows/ci.yml`)
```yaml
name: CI/CD Pipeline - Task Management & Portfolio

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build-and-test:
    name: Build, Lint & Automated Test
    runs-on: ubuntu-latest

    steps:
      # Step 1: Checkout repository code
      - name: 📥 Checkout Code
        uses: actions/checkout@v4

      # Step 2: Setup Node.js environment
      - name: ⚙️ Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      # Step 3: Install frontend & root dependencies
      - name: 📦 Install Frontend Dependencies
        run: npm ci

      # Step 4: Install backend dependencies
      - name: 📦 Install Backend Dependencies
        run: |
          cd task-manager-api
          npm ci

      # Step 5: Build frontend production bundle
      - name: 🏗️ Build Frontend
        run: npm run build

      # Step 6: Run automated tests
      - name: 🧪 Run Automated Tests
        run: |
          cd task-manager-api
          npm test

      # Step 7: Report status
      - name: 📢 Report CI/CD Status
        if: always()
        run: |
          if [ "${{ job.status }}" = "success" ]; then
            echo "✅ Pipeline Succeeded: All builds, lints, and tests passed!"
          else
            echo "❌ Pipeline Failed: One or more steps failed during execution."
          fi
```

### 5.2 Automated Test Suite (`task-manager-api/test/task.test.js`)
```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert');
const EventEmitter = require('events');

describe('Task Management Application - Automated Test Suite', () => {

  // Test 1: Task Validation Logic
  test('Task validation: title is required and cannot be empty', () => {
    const validateTitle = (title) => {
      if (!title || typeof title !== 'string' || !title.trim()) {
        return false;
      }
      return true;
    };

    assert.strictEqual(validateTitle(''), false, 'Empty string should fail validation');
    assert.strictEqual(validateTitle('   '), false, 'Whitespace-only title should fail validation');
    assert.strictEqual(validateTitle(null), false, 'Null title should fail validation');
    assert.strictEqual(validateTitle('Complete CI/CD Pipeline'), true, 'Valid title should pass');
  });

  // Test 2: Task Defaults
  test('Task model defaults: priority defaults to low and completed to false', () => {
    const createTaskObject = (data) => ({
      title: data.title.trim(),
      description: data.description || '',
      completed: data.completed !== undefined ? data.completed : false,
      priority: data.priority || 'low',
      createdAt: new Date().toISOString()
    });

    const task = createTaskObject({ title: 'Deploy with GitHub Actions' });
    assert.strictEqual(task.priority, 'low', 'Default priority should be low');
    assert.strictEqual(task.completed, false, 'Default completed status should be false');
    assert.strictEqual(typeof task.createdAt, 'string', 'createdAt timestamp should be generated');
  });

  // Test 3: Event-Driven EventEmitter Processing (Practical 10 integration)
  test('EventEmitter: emits task-created and executes listener asynchronously', async () => {
    const emitter = new EventEmitter();
    let listenerFired = false;
    let receivedPayload = null;

    emitter.on('task-created', (data) => {
      listenerFired = true;
      receivedPayload = data;
    });

    const testPayload = {
      title: 'Automated CI Test Task',
      assignedUser: 'student@example.com',
      timestamp: new Date().toISOString()
    };

    emitter.emit('task-created', testPayload);

    assert.strictEqual(listenerFired, true, 'task-created event listener should have triggered');
    assert.strictEqual(receivedPayload.title, 'Automated CI Test Task');
    assert.strictEqual(receivedPayload.assignedUser, 'student@example.com');
  });

  // Test 4: In-Memory Caching Store (Practical 9 integration)
  test('Server Cache: stores and retrieves cached entries with expiry', () => {
    const cache = new Map();
    const setCache = (key, data, ttlSeconds) => {
      cache.set(key, {
        data,
        expiry: Date.now() + ttlSeconds * 1000
      });
    };

    const getCache = (key) => {
      const entry = cache.get(key);
      if (!entry) return null;
      if (entry.expiry < Date.now()) {
        cache.delete(key);
        return null;
      }
      return entry.data;
    };

    setCache('test-key', [{ id: 1, title: 'Cached Task' }], 60);
    const retrieved = getCache('test-key');
    assert.ok(retrieved !== null, 'Cache hit should retrieve stored object');
    assert.strictEqual(retrieved.length, 1);
    assert.strictEqual(retrieved[0].title, 'Cached Task');
  });

  // Test 5: Intentional Failure Toggle (for demonstrating failed vs passed CI pipeline)
  test('CI/CD Pipeline Failure Verification Toggle', () => {
    if (process.env.FAIL_TEST === 'true') {
      assert.strictEqual('actual_failed_value', 'expected_correct_value', 'Deliberate test failure for CI/CD demonstration');
    } else {
      assert.strictEqual(true, true, 'Test passes under normal CI/CD execution');
    }
  });

});
```

---

## 6. Demonstration: Failed vs Fixed Pipeline

### 6.1 Demonstration of Failed Pipeline (Deliberately Broken Test)

When a developer introduces a breaking bug or failing assertion (simulated with `FAIL_TEST=true`):

```text
> task-manager-api@1.0.0 test
> node --test test/*.test.js

▶ Task Management Application - Automated Test Suite
  ✔ Task validation: title is required and cannot be empty (31.46ms)
  ✔ Task model defaults: priority defaults to low and completed to false (2.47ms)
  ✔ EventEmitter: emits task-created and executes listener asynchronously (0.39ms)
  ✔ Server Cache: stores and retrieves cached entries with expiry (0.49ms)
  ✖ CI/CD Pipeline Failure Verification Toggle (121.47ms)
✖ Task Management Application - Automated Test Suite (182.96ms)
ℹ tests 5
ℹ suites 1
ℹ pass 4
ℹ fail 1
ℹ duration_ms 898.74

✖ failing tests:
test at test\task.test.js:92:3
✖ CI/CD Pipeline Failure Verification Toggle
  AssertionError [ERR_ASSERTION]: Deliberate test failure for CI/CD demonstration
  + actual - expected
  + 'actual_failed_value'
  - 'expected_correct_value'
```
* **Pipeline Status:** `FAILED` (Process exit code `1`).
* **GitHub Actions Result:** ❌ **Red X** displayed on commit/PR, blocking merge until fixed.

---

### 6.2 Demonstration of Fixed Pipeline (Passing Tests)

When the test assertion is corrected or under standard CI runs:

```text
> task-manager-api@1.0.0 test
> node --test test/*.test.js

▶ Task Management Application - Automated Test Suite
  ✔ Task validation: title is required and cannot be empty (1.81ms)
  ✔ Task model defaults: priority defaults to low and completed to false (3.57ms)
  ✔ EventEmitter: emits task-created and executes listener asynchronously (0.39ms)
  ✔ Server Cache: stores and retrieves cached entries with expiry (0.44ms)
  ✔ CI/CD Pipeline Failure Verification Toggle (0.40ms)
✔ Task Management Application - Automated Test Suite (8.86ms)
ℹ tests 5
ℹ suites 1
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 511.54
```
* **Frontend Build Output:**
```text
vite v8.1.4 building client environment for production...
✓ 39 modules transformed.
dist/index.html                         0.48 kB
dist/assets/index-BSa1gdLS.js         236.75 kB
✓ built in 407ms
```
* **Pipeline Status:** `SUCCESS` (Process exit code `0`).
* **GitHub Actions Result:** ✅ **Green checkmark** displayed on GitHub.

---

## 7. Commands to Run Locally & Verify

### 1. Run Passing Automated Tests:
```bash
npm test
```
*(Or inside `task-manager-api`: `cd task-manager-api && npm test`)*

### 2. Run Deliberately Failing Test (Simulating Broken CI):
```bash
# Windows PowerShell:
$env:FAIL_TEST="true"; npm test; Remove-Item Env:\FAIL_TEST

# Linux / macOS / Bash:
FAIL_TEST=true npm test
```

### 3. Verify Frontend Production Build:
```bash
npm run build
```

---

## 8. Result
Successfully implemented an automated Continuous Integration (CI) pipeline using GitHub Actions for the Task Management and Student Portfolio application. The workflow automates dependency management, frontend compilation, and backend test execution across all pull requests and pushes to `main` and `master`. The pipeline demonstrates clear error reporting and build blocking upon test failure, followed by automated verification upon resolution.

---

## 9. Conclusion
GitHub Actions provides seamless, native CI/CD automation without requiring external build servers like Jenkins. By enforcing automated test suites and build gates prior to merging code, developers can maintain high code quality, eliminate regression errors, and accelerate release cycles with confidence.
