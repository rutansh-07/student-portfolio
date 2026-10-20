import React from 'react';

const Toast = ({ message, type }) => {
    if (!message) return null;

    const bgColor = type === 'success' ? '#4CAF50' : '#f44336';

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: bgColor,
            color: 'white',
            padding: '15px 20px',
            borderRadius: '5px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 1000,
            transition: 'opacity 0.3s'
        }}>
            {message}
        </div>
    );
};

export default Toast;
