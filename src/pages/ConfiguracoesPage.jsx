import React from 'react';
import './FormPages.css'; // Reutilizando o CSS de formulários

const ConfiguracoesPage = () => {
  return (
    <>
      <h2 className="dashboard-title">Configurações</h2>
      <div className="settings-container">
        
        <div className="settings-section">
          <h3>Conta</h3>
          <div className="form-group">
            <label>Alterar Senha</label>
            <button className="form-button secondary">Enviar email de redefinição</button>
          </div>
        </div>

        <div className="settings-section">
          <h3>Notificações</h3>
          <div className="form-group-inline">
            <label htmlFor="email-notifications">Receber notificações por email</label>
            <input type="checkbox" id="email-notifications" />
          </div>
        </div>
        
      </div>
    </>
  );
};

export default ConfiguracoesPage;
