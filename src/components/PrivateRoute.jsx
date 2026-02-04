import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function PrivateRoute({ isAuthenticated, testMode, loading }) {
  const location = useLocation();
  if (testMode) return <Outlet />;
  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
