import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function AdminRoute({ children }) {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner size="large" text="Loading..." fullScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return children;
}
