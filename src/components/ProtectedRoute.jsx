import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice.js';

export default function ProtectedRoute() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token && user?.status === 'banned') {
      dispatch(logout());
    }
  }, [dispatch, token, user?.status]);

  if (!token) return <Navigate to="/users/login" replace />;
  if (user?.status === 'banned') return <Navigate to="/users/login" replace />;

  return <Outlet />;
}
