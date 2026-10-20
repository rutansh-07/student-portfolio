import { useState } from 'react';
import { login, register } from '../api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password);
        setSuccessMsg('Registration successful! You can now log in.');
        setIsRegister(false);
        setPassword('');
      } else {
        const res = await login(email, password);
        localStorage.setItem('token', res.token);
        window.location.href = '/tasks';
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '40px' }}>
        <h2 style={{ textAlign: 'center', display: 'block', marginBottom: '10px' }}>
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '0', marginBottom: '25px', fontSize: '14px' }}>
          {isRegister ? 'Register to manage your personal tasks' : 'Log in with your credentials to access tasks'}
        </p>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Email Address</label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '15px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '15px' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '10px', 
              padding: '14px', 
              backgroundColor: '#2563eb', 
              color: 'white', 
              border: 'none', 
              borderRadius: '30px', 
              fontSize: '16px', 
              fontWeight: '600', 
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: '0.2s'
            }}
          >
            {loading ? 'Please wait...' : (isRegister ? 'Register' : 'Sign In')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #f3f4f6' }}>
          <button 
            type="button"
            onClick={toggleMode}
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register here"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
