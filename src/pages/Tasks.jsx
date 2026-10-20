import { useState, useEffect } from "react";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";
import Toast from "../components/Toast";
import { getTasks, createTask, updateTask, deleteTask, getTaskEvents } from "../api";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Toast state
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("low");
  const [assignedTo, setAssignedTo] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Per-action loading & error states
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Filter state
  const [filter, setFilter] = useState("all");
  const [cacheMetrics, setCacheMetrics] = useState(null);

  // Event-Driven Architecture (EventEmitter) State
  const [events, setEvents] = useState([]);
  const [showEventFeed, setShowEventFeed] = useState(false);
  const [lastEmittedEvent, setLastEmittedEvent] = useState(null);

  const showToast = (msg, type = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadTasks = () => {
    setError(null);
    return getTasks()
      .then((data) => {
        setTasks(Array.isArray(data) ? data : []);
        if (data._responseTime || data._cacheStatus) {
          setCacheMetrics({
            responseTime: data._responseTime,
            cacheStatus: data._cacheStatus
          });
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load tasks from backend");
      })
      .finally(() => {
        setLoading(false);
        setIsRefreshing(false);
      });
  };

  const loadEvents = () => {
    return getTaskEvents()
      .then((data) => {
        if (data && data.events) {
          setEvents(data.events);
        }
      })
      .catch(() => {});
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setActionError(null);
    loadTasks();
    loadEvents();
  };

  useEffect(() => {
    loadTasks();
    loadEvents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (editingTaskId) {
      try {
        const updated = await updateTask(editingTaskId, {
          title: title.trim(),
          description: description.trim(),
          priority
        });
        setTasks(tasks.map(t => t._id === editingTaskId ? updated : t));
        showToast("Task updated successfully!");
        resetForm();
      } catch (err) {
        const msg = err.message || "Failed to update task";
        setFormError(msg);
        showToast(msg, "error");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const newTask = {
        title: title.trim(),
        description: description.trim(),
        priority,
        assignedTo: assignedTo.trim() || undefined,
        completed: false
      };
      
      try {
        const sendTime = new Date().toISOString();
        const createdTask = await createTask(newTask);
        const recvTime = new Date().toISOString();
        setTasks(prev => [createdTask, ...prev]);
        setLastEmittedEvent({
          title: createdTask.title,
          id: createdTask._id,
          user: assignedTo.trim() || 'Guest / Unassigned',
          sendTime,
          recvTime
        });
        showToast("Task created! HTTP 201 received immediately. Background event emitted via EventEmitter.");
        resetForm();
        setTimeout(() => loadEvents(), 250);
      } catch (err) {
        const msg = err.message || "Failed to create task";
        setFormError(msg);
        showToast(msg, "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEdit = (task) => {
    setEditingTaskId(task._id);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority || "low");
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("low");
    setAssignedTo("");
    setEditingTaskId(null);
    setFormError(null);
  };

  const handleToggleComplete = async (task) => {
    setTogglingId(task._id);
    setActionError(null);
    try {
      const updated = await updateTask(task._id, { completed: !task.completed });
      setTasks(tasks.map(t => t._id === task._id ? updated : t));
      showToast(task.completed ? "Task marked pending" : "Task marked completed!");
    } catch (err) {
      const msg = err.message || "Failed to update task status";
      setActionError(msg);
      showToast(msg, "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id, taskTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${taskTitle || 'this task'}"?`)) {
      return;
    }
    setDeletingId(id);
    setActionError(null);
    try {
      await deleteTask(id);
      setTasks(tasks.filter(t => t._id !== id));
      if (editingTaskId === id) resetForm();
      showToast("Task deleted successfully!");
    } catch (err) {
      const msg = err.message || "Failed to delete task";
      setActionError(msg);
      showToast(msg, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === "completed") return task.completed;
    if (filter === "pending") return !task.completed;
    return true;
  });

  const getPriorityColor = (p) => {
    switch (p) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (loading) return <Spinner message="Loading Tasks from MongoDB..." />;
  if (error) {
    return (
      <div className="container" style={{ textAlign: "center", padding: "40px 20px" }}>
        <ErrorMessage message={error} />
        <p style={{ color: "#6b7280", marginTop: "15px" }}>
          Make sure your Node backend is running (<code>node server.js</code> on port 5000) and MongoDB is active.
        </p>
        <button 
          onClick={loadTasks}
          style={{
            marginTop: "15px",
            padding: "10px 24px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "20px",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          🔄 Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">Task Management</h1>

      {/* Task Form Card */}
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto 35px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, borderBottom: 'none' }}>
            {editingTaskId ? "✏️ Edit Task" : "➕ Add New Task"}
          </h2>
          {editingTaskId && (
            <button 
              type="button" 
              onClick={resetForm}
              disabled={isSubmitting}
              style={{ padding: '6px 14px', border: '1px solid #ccc', background: '#f3f4f6', borderRadius: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        {formError && (
          <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '12px', borderRadius: '10px', marginBottom: '15px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ <strong>Error:</strong> {formError}</span>
            <button 
              onClick={() => setFormError(null)} 
              type="button"
              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: '700', fontSize: '16px' }}
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Task Title *</label>
            <input 
              type="text" 
              placeholder="e.g. Complete React Assignment" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              disabled={isSubmitting}
              required 
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '15px', opacity: isSubmitting ? 0.7 : 1 }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Description</label>
            <textarea 
              rows="3"
              placeholder="Details or notes about this task..." 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              disabled={isSubmitting}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '15px', resize: 'vertical', opacity: isSubmitting ? 0.7 : 1 }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Priority</label>
            <select 
              value={priority} 
              onChange={e => setPriority(e.target.value)} 
              disabled={isSubmitting}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '15px', background: 'white', opacity: isSubmitting ? 0.7 : 1 }}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>
              Assigned User / Email (for background event notification)
            </label>
            <input 
              type="text" 
              placeholder="e.g. rutansh.govardhan@student.univ.edu" 
              value={assignedTo} 
              onChange={e => setAssignedTo(e.target.value)} 
              disabled={isSubmitting}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '15px', opacity: isSubmitting ? 0.7 : 1 }} 
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ 
                padding: '12px 28px', 
                backgroundColor: '#2563eb', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '30px', 
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                opacity: isSubmitting ? 0.7 : 1,
                transition: '0.2s'
              }}
            >
              {isSubmitting 
                ? (editingTaskId ? "⏳ Saving Changes..." : "⏳ Creating Task...") 
                : (editingTaskId ? "Save Changes" : "Create Task")}
            </button>
            {editingTaskId && (
              <button 
                type="button" 
                onClick={resetForm} 
                disabled={isSubmitting}
                style={{ padding: '12px 20px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '30px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {actionError && (
        <div style={{ maxWidth: '800px', margin: '0 auto 20px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '12px 18px', borderRadius: '10px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ <strong>Action Error:</strong> {actionError}</span>
          <button 
            onClick={() => setActionError(null)} 
            type="button"
            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: '700', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Task Filters & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['all', 'pending', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 18px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: filter === f ? '#2563eb' : '#e5e7eb',
                color: filter === f ? 'white' : '#374151',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {f} ({f === 'all' ? tasks.length : f === 'pending' ? tasks.filter(t => !t.completed).length : tasks.filter(t => t.completed).length})
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {cacheMetrics && (
            <div 
              title="Server-side in-memory caching measurement"
              style={{
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: cacheMetrics.cacheStatus === 'HIT' ? '#dcfce7' : '#fef9c3',
                color: cacheMetrics.cacheStatus === 'HIT' ? '#15803d' : '#854d0e',
                padding: '6px 14px',
                borderRadius: '20px',
                border: `1px solid ${cacheMetrics.cacheStatus === 'HIT' ? '#86efac' : '#fde047'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{cacheMetrics.cacheStatus === 'HIT' ? '⚡ Cache HIT' : '💾 Cache MISS (DB)'}</span>
              <span style={{ opacity: 0.6 }}>|</span>
              <span>{cacheMetrics.responseTime || '< 1ms'}</span>
            </div>
          )}
          <button 
            type="button"
            onClick={() => setShowEventFeed(!showEventFeed)}
            style={{ 
              padding: '8px 16px', 
              background: showEventFeed ? '#eff6ff' : '#f8fafc', 
              color: '#2563eb', 
              border: '1px solid #bfdbfe', 
              borderRadius: '20px', 
              cursor: 'pointer', 
              fontWeight: '600',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>⚡ Background Events ({events.length})</span>
            <span style={{ fontSize: '10px' }}>{showEventFeed ? '▲' : '▼'}</span>
          </button>
          <button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            style={{ 
              padding: '8px 16px', 
              background: '#eef4ff', 
              color: '#2563eb', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: isRefreshing ? 'not-allowed' : 'pointer', 
              fontWeight: '600',
              opacity: isRefreshing ? 0.7 : 1
            }}
          >
            {isRefreshing ? "⏳ Refreshing..." : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* Event-Driven Architecture (EventEmitter) Panel */}
      {(showEventFeed || lastEmittedEvent) && (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto 30px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚡</span> Asynchronous Event Processing (Node.js EventEmitter)
            </h3>
            {lastEmittedEvent && (
              <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '12px' }}>
                ✓ Event Emitted
              </span>
            )}
          </div>

          <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 15px', lineHeight: '1.5' }}>
            <strong>Aim Implemented:</strong> When <code>POST /tasks</code> creates a task, the API emits a <code>task-created</code> event and immediately returns HTTP 201 without waiting for background listeners. The notification handler executes asynchronously using <code>setImmediate()</code>.
          </p>

          {lastEmittedEvent && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px', marginBottom: '15px', fontSize: '13px' }}>
              <strong style={{ color: '#166534' }}>Latest Task Creation Verified:</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '6px' }}>
                <div><strong>Title:</strong> {lastEmittedEvent.title}</div>
                <div><strong>Assigned:</strong> {lastEmittedEvent.user}</div>
                <div><strong>HTTP 201 Recv:</strong> {lastEmittedEvent.recvTime ? lastEmittedEvent.recvTime.split('T')[1].replace('Z','') : ''}</div>
              </div>
            </div>
          )}

          <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#374151' }}>
            📡 Background Event Notification Registry
          </h4>

          {events.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
              No events recorded yet. Create a task above to trigger the background notification!
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '8px' }}>Task Title</th>
                    <th style={{ padding: '8px' }}>Assigned User</th>
                    <th style={{ padding: '8px' }}>API Response (Sync)</th>
                    <th style={{ padding: '8px' }}>Handler Executed (Async)</th>
                    <th style={{ padding: '8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 5).map((ev, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: '600' }}>{ev.title}</td>
                      <td style={{ padding: '8px', color: '#4b5563' }}>{ev.assignedUser}</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: '#059669' }}>
                        {ev.apiResponseTime ? ev.apiResponseTime.split('T')[1].replace('Z', '') : 'N/A'}
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: '#7c3aed' }}>
                        {ev.handlerExecutionTime ? ev.handlerExecutionTime.split('T')[1].replace('Z', '') : 'N/A'}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '8px', fontSize: '11px', fontWeight: '600' }}>
                          ASYNC OK
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>
            {tasks.length === 0 ? "No tasks found in MongoDB. Create one above to get started!" : `No ${filter} tasks found.`}
          </p>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredTasks.map((task) => (
            <div className="project-card" key={task._id} style={{ opacity: task.completed ? 0.85 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="status" style={{ backgroundColor: task.completed ? '#10b981' : '#f59e0b', margin: 0 }}>
                  {task.completed ? '✓ Completed' : '⏳ Pending'}
                </span>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: '700', 
                  textTransform: 'uppercase', 
                  color: getPriorityColor(task.priority), 
                  background: `${getPriorityColor(task.priority)}15`,
                  padding: '4px 10px', 
                  borderRadius: '12px' 
                }}>
                  {task.priority} Priority
                </span>
              </div>

              <h2 style={{ 
                margin: '10px 0 8px', 
                borderBottom: 'none', 
                textDecoration: task.completed ? 'line-through' : 'none',
                color: task.completed ? '#6b7280' : '#111827'
              }}>
                {task.title}
              </h2>

              <p style={{ color: '#4b5563', margin: '0 0 15px', flexGrow: 1, minHeight: '40px' }}>
                {task.description || "No description provided"}
              </p>

              <small style={{ color: '#9ca3af', display: 'block', marginBottom: '15px' }}>
                Created: {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Just now'}
              </small>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' }}>
                <button 
                  onClick={() => handleToggleComplete(task)} 
                  disabled={togglingId === task._id || deletingId === task._id}
                  style={{ 
                    flex: '1', 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: '1px solid #d1d5db', 
                    backgroundColor: task.completed ? '#f3f4f6' : '#ecfdf5',
                    color: task.completed ? '#374151' : '#059669',
                    cursor: (togglingId === task._id || deletingId === task._id) ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                    opacity: togglingId === task._id ? 0.7 : 1
                  }}
                >
                  {togglingId === task._id ? "⏳ Updating..." : (task.completed ? 'Mark Pending' : 'Mark Complete')}
                </button>
                <button 
                  onClick={() => handleEdit(task)} 
                  disabled={togglingId === task._id || deletingId === task._id || isSubmitting}
                  style={{ 
                    padding: '8px 14px', 
                    borderRadius: '8px', 
                    border: '1px solid #d1d5db', 
                    backgroundColor: '#ffffff', 
                    color: '#2563eb', 
                    cursor: (togglingId === task._id || deletingId === task._id || isSubmitting) ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '13px'
                  }}
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(task._id, task.title)} 
                  disabled={deletingId === task._id || togglingId === task._id}
                  style={{ 
                    padding: '8px 14px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    backgroundColor: '#fee2e2', 
                    color: '#dc2626', 
                    cursor: (deletingId === task._id || togglingId === task._id) ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                    opacity: deletingId === task._id ? 0.7 : 1
                  }}
                >
                  {deletingId === task._id ? "⏳ Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast message={toastMsg} type={toastType} />
    </div>
  );
}

export default Tasks;
