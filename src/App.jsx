import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout e Componentes de Rota
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';

// Páginas Principais
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EstoquePage from './pages/EstoquePage';
import ProdutoFormPage from './pages/ProdutoFormPage';
import CategoriaFormPage from './pages/CategoriaFormPage';

// Novas Páginas
import PerfilPage from './pages/PerfilPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import PesquisaPage from './pages/PesquisaPage';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Rota pública de Login */}
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
      
      {/* Container para Rotas Protegidas que usam o Layout principal */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/estoque" element={<EstoquePage />} />
          <Route path="/produtos/novo" element={<ProdutoFormPage />} />
          <Route path="/produtos/editar/:id" element={<ProdutoFormPage />} />
          
          {/* Novas Rotas */}
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/pesquisa" element={<PesquisaPage />} />
          <Route path="/categorias/novo" element={<CategoriaFormPage />} />
          {/* Adicione outras rotas aqui (ex: /categorias/novo) */}
        </Route>
      </Route>

      {/* Rota "Catch-all" para redirecionar URLs inválidas */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
    </Routes>
  );
}

export default App;
