const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('token');
  }
  if (!res.ok) {
    let errorMsg = 'Request failed';
    try {
      const data = await res.json();
      if (data.message) {
        errorMsg = data.message;
      } else if (data.errors && Array.isArray(data.errors)) {
        errorMsg = data.errors.join(', ');
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }
  return res.json();
};

export const getTasks = async () => {
  const res = await fetch(`${BASE_URL}/tasks`, {
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  if (Array.isArray(data)) {
    data._responseTime = res.headers.get('x-response-time');
    data._cacheStatus = res.headers.get('x-cache');
  }
  return data;
};

export const createTask = (task) => fetch(`${BASE_URL}/tasks`, {
  method: 'POST',
  headers: getHeaders(),
  body: JSON.stringify(task)
}).then(handleResponse);

export const updateTask = (id, updates) => fetch(`${BASE_URL}/tasks/${id}`, {
  method: 'PUT',
  headers: getHeaders(),
  body: JSON.stringify(updates)
}).then(handleResponse);

export const deleteTask = (id) => fetch(`${BASE_URL}/tasks/${id}`, {
  method: 'DELETE',
  headers: getHeaders()
}).then(handleResponse);

export const login = (email, password) => fetch(`${BASE_URL}/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
}).then(async res => {
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'Login failed');
  }
  return res.json();
});

export const register = (email, password) => fetch(`${BASE_URL}/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
}).then(async res => {
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'Registration failed');
  }
  return res.json();
});

export const getMe = () => fetch(`${BASE_URL}/me`, {
  headers: getHeaders()
}).then(handleResponse);

// Contacts API
export const getContacts = () => fetch(`${BASE_URL}/contacts`, {
  headers: { 'Content-Type': 'application/json' }
}).then(handleResponse);

export const createContact = (contact) => fetch(`${BASE_URL}/contacts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(contact)
}).then(handleResponse);

export const updateContact = (id, contact) => fetch(`${BASE_URL}/contacts/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(contact)
}).then(handleResponse);

export const deleteContact = (id) => fetch(`${BASE_URL}/contacts/${id}`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' }
}).then(handleResponse);

// Practical 10: Task Events API
export const getTaskEvents = () => fetch(`${BASE_URL}/task-events`, {
  headers: getHeaders()
}).then(handleResponse);

