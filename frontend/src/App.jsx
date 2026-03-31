import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import Researcher from "./pages/Researcher";
import User from "./pages/User";
import Home from "./pages/Home";
import ProtectedRoute from "./components/protectedRoute";
import VerifyEmail from "./pages/VerifyEmail";
import AuthContext from "./context/AuthContext";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { useContext, useEffect } from "react";
import SessionLock from "./components/SessionLock";
export default function App() {
    const { setAuth } = useContext(AuthContext);
    useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const role = localStorage.getItem("role");
    const id = localStorage.getItem("userId");

    if (isAuthenticated === 'true' && role) {
      setAuth({ isAuthenticated: true, role, id });
    }
  }, [setAuth]);

  // TACC §3.05 — Global fetch interceptor: dispatch session:invalidated on SESSION_INVALIDATED 401
  useEffect(() => {
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await origFetch(...args);
      if (response.status === 401) {
        const clone = response.clone();
        try {
          const body = await clone.json();
          if (body.code === "SESSION_INVALIDATED") {
            window.dispatchEvent(new CustomEvent("session:invalidated", { detail: body }));
          }
        } catch (_) {}
      }
      return response;
    };
    return () => { window.fetch = origFetch; };
  }, []);
  return (
    
    
    
    <BrowserRouter>
      <SessionLock timeoutMinutes={30} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/researcher"
          element={
            <ProtectedRoute role="researcher">
              <Researcher />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user"
          element={
            <ProtectedRoute role="user">
              <User />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
