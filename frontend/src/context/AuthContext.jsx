import { createContext, useState, useEffect } from "react";

// 1. Create and export the context itself (for useContext)
const AuthContext = createContext({});

// 2. Export the provider (for main.jsx)
export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState(() => {
        const isAuthenticated = localStorage.getItem("isAuthenticated");
        const role = localStorage.getItem("role");
        const id = localStorage.getItem("userId");
        return isAuthenticated === 'true' ? { isAuthenticated: true, role, id } : {};
    });

    useEffect(() => {
        if (auth?.isAuthenticated) {
            localStorage.setItem("isAuthenticated", "true");
            localStorage.setItem("role", auth.role);
            if (auth.id) localStorage.setItem("userId", auth.id);
        } else {
            localStorage.removeItem("isAuthenticated");
            localStorage.removeItem("role");
            localStorage.removeItem("userId");
            localStorage.removeItem("token");
        }
    }, [auth]);

    console.log("AuthContext State:", auth); // DEBUG

    const logout = async () => {
        setAuth({});
        try {
            await fetch("http://localhost:5000/auth/logout", {
                method: "POST",
                credentials: "include"
            });
        } catch (err) {
            console.error("Logout error", err);
        }
    };

    return (
        <AuthContext.Provider value={{ auth, setAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Default export the context
export default AuthContext;