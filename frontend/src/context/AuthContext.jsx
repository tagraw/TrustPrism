import { createContext, useState, useEffect } from "react";

// 1. Create and export the context itself (for useContext)
const AuthContext = createContext({});

// 2. Export the provider (for main.jsx)
export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState(() => {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");
        return token ? { token, role } : {};
    });

    useEffect(() => {
        if (auth?.token) {
            localStorage.setItem("token", auth.token);
            localStorage.setItem("role", auth.role);
        } else {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
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