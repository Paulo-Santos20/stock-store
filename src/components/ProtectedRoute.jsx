import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  // Se o usuário estiver autenticado, renderiza a página filha (o componente da rota).
  // O <Outlet /> é um placeholder para a página que a rota protegida está envolvendo.
  if (isAuthenticated) {
    return <Outlet />;
  }

  // Se não estiver autenticado, redireciona para a página de login.
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;