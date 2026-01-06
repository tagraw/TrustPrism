import { createContext, useState, useEffect } from "react";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    // Initialize state from localStorage to persist after tab close
    const [auth, setAuth] = useState(() => {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");
        return token ? { token, role } : {};
    });

    // Update localStorage whenever auth state changes
    useEffect(() => {
        if (auth?.token) {
            localStorage.setItem("token", auth.token);
            localStorage.setItem("role", auth.role);
        } else {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
        }
    }, [auth]);

    const logout = () => {
        setAuth({}); // Clearing state triggers the useEffect to clear localStorage
    };

    return (
        <AuthContext.Provider value={{ auth, setAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;