import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import LogList from './pages/LogList';
import NewQSO from './pages/NewQSO';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — redirect to /log if already logged in */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected routes — redirect to /login if not authenticated */}
        <Route element={<ProtectedRoute />}>
          <Route path="/log" element={<LogList />} />
          <Route path="/log/new" element={<NewQSO />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/log" replace />} />
        <Route path="*" element={<Navigate to="/log" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
