import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function PrivateRoute({ isAuthenticated, testMode }) {
  const location = useLocation();
  if (testMode) return <Outlet />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
