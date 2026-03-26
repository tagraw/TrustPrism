import { createContext, useState, useEffect } from "react";

// 1. Create and export the context itself (for useContext)
const AuthContext = createContext({});

// 2. Export the provider (for main.jsx)
export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState(() => {
        const isAuthenticated = localStorage.getItem("isAuthenticated");
        const role = localStorage.getItem("role");
        return isAuthenticated === 'true' ? { isAuthenticated: true, role } : {};
    });

    useEffect(() => {
        if (auth?.isAuthenticated) {
            localStorage.setItem("isAuthenticated", "true");
            localStorage.setItem("role", auth.role);
        } else {
            localStorage.removeItem("isAuthenticated");
            localStorage.removeItem("role");
            localStorage.removeItem("token");
        }
    }, [auth]);

    console.log("AuthContext State:", auth); // DEBUG

    const logout = () => setAuth({});

    return (
        <AuthContext.Provider value={{ auth, setAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

// Default export the context
export default AuthContext;