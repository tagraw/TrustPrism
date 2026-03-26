import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const userRole = localStorage.getItem("role");

  if (isAuthenticated !== 'true') return <Navigate to="/login" />;
  if (role && userRole !== role) return <Navigate to="/login" />;

  return children;
}
