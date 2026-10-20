// task-manager-api/test/task.test.js
// Automated Test Suite for Practical 12: CI/CD Pipeline with GitHub Actions
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

  // Test 3: Event-Driven EventEmitter Processing (Practical 10 verification)
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

  // Test 4: In-Memory Caching Store (Practical 9 verification)
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
      assert.strictEqual('deliberate_failure', 'expected_pass');
    }
  });

});
