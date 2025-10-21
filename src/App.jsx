import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout e Componentes de Rota
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';

// Páginas Principais
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProdutosPage from './pages/ProdutosPage';
import ProdutoFormPage from './pages/ProdutoFormPage';
import CategoriasPage from './pages/CategoriasPage';
import CategoriaFormPage from './pages/CategoriaFormPage';
import ClientesPage from './pages/ClientesPage';
import ClienteFormPage from './pages/ClienteFormPage';
import VendasPage from './pages/VendasPage';
import VendaFormPage from './pages/VendaFormPage';
import VendaDetalhesPage from './pages/VendaDetalhesPage';
import OrcamentosPage from './pages/OrcamentosPage';
import OrcamentoFormPage from './pages/OrcamentoFormPage';
import AlertasPage from './pages/AlertasPage'; // Importe a nova página

// Páginas de Usuário e Configurações
import PerfilPage from './pages/PerfilPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import PesquisaPage from './pages/PesquisaPage';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/alertas" element={<AlertasPage />} />

          <Route path="/produtos" element={<ProdutosPage />} />
          <Route path="/produtos/novo" element={<ProdutoFormPage />} />
          <Route path="/produtos/editar/:id" element={<ProdutoFormPage />} />

          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/categorias/novo" element={<CategoriaFormPage />} />
          <Route path="/categorias/editar/:id" element={<CategoriaFormPage />} />

          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/novo" element={<ClienteFormPage />} />
          <Route path="/clientes/editar/:id" element={<ClienteFormPage />} />
          
          <Route path="/vendas" element={<VendasPage />} />
          <Route path="/vendas/novo" element={<VendaFormPage />} />
          <Route path="/vendas/editar/:id" element={<VendaFormPage />} />
          <Route path="/vendas/detalhes/:id" element={<VendaDetalhesPage />} />

          <Route path="/orcamentos" element={<OrcamentosPage />} />
          <Route path="/orcamentos/novo" element={<OrcamentoFormPage />} />
          <Route path="/orcamentos/editar/:id" element={<OrcamentoFormPage />} />

          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/pesquisa" element={<PesquisaPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
    </Routes>
  );
}

export default App;

