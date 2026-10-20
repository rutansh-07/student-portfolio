import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMe } from "../api";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    setToken(currentToken);

    if (currentToken) {
      getMe()
        .then((user) => {
          if (user && user.email) {
            setUserEmail(user.email);
          }
        })
        .catch(() => {
          setUserEmail(null);
        });
    } else {
      setUserEmail(null);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUserEmail(null);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" style={{ textDecoration: 'none' }}>
        <div className="logo">
          RG.
        </div>
      </Link>
      <div className="nav-links" style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/">Home</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/tasks">Tasks</Link>
        <Link to="/contact">Contact</Link>
        {token ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {userEmail && (
              <span style={{ fontSize: '13px', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '15px' }}>
                👤 {userEmail}
              </span>
            )}
            <button 
              onClick={handleLogout} 
              style={{ 
                background: '#fee2e2', 
                border: 'none', 
                color: '#dc2626', 
                cursor: 'pointer', 
                fontSize: '14px', 
                fontWeight: '600',
                padding: '6px 14px',
                borderRadius: '20px',
                transition: '0.2s'
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <Link to="/login" style={{ 
            backgroundColor: '#2563eb', 
            color: 'white', 
            padding: '8px 18px', 
            borderRadius: '20px',
            textDecoration: 'none'
          }}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;