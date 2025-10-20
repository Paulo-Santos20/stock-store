// src/components/Layout/Layout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header'; // <-- Importe o Header
import { FiMenu } from 'react-icons/fi';
import './Layout.css';

const Layout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar className={isSidebarOpen ? 'active' : ''} />
      <Header /> {/* <-- Adicione o Header */}
      <button className="menu-toggle" onClick={() => setSidebarOpen(!isSidebarOpen)}>
        <FiMenu size={24} />
      </button>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;