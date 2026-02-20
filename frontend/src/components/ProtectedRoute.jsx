import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from '../auth';
import NavBar from './NavBar';

export function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}

// Redirect logged-in users away from auth pages
export function PublicRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/log" replace />;
  }
  return <Outlet />;
}
