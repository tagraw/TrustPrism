import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext.jsx';

const LogoutButton = () => {
    const { logout } = useContext(AuthContext); // Access logout from context
    const navigate = useNavigate();

    const handleLogout = () => {
        logout(); // Clear the session
        navigate('/login'); // Redirect to login page
    };

    return (
        <button 
            onClick={handleLogout}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
            Logout
        </button>
    );
};

export default LogoutButton;