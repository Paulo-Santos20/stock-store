import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, where } from 'firebase/firestore';
import { db, storage } from '../firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import './FormPages.css';

const ConfiguracoesPage = () => {
  const { settings: globalSettings, updateSettings, loading: loadingSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState(globalSettings);
  const [activityLogs, setActivityLogs] = useState([]);
  const [stats, setStats] = useState({ activeUsers: 0, totalProducts: 0, totalClients: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    setLocalSettings(globalSettings);
  }, [globalSettings]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Busca de dados em paralelo para performance
        const [logsSnapshot, usersCountSnap, productsCountSnap, clientsCountSnap] = await Promise.all([
          getDocs(query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(20))),
          getCountFromServer(query(collection(db, "users"), where("active", "==", true))),
          getCountFromServer(collection(db, 'products')),
          getCountFromServer(collection(db, 'clients')),
        ]);
        
        setActivityLogs(logsSnapshot.docs.map(doc => doc.data()));
        setStats({
          activeUsers: usersCountSnap.data().count,
          totalProducts: productsCountSnap.data().count,
          totalClients: clientsCountSnap.data().count,
        });

      } catch (error) {
        console.error("Erro ao carregar dados da página:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);
  
  const handleSettingsChange = (e) => {
      const { name, value, type, checked } = e.target;
      setLocalSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = (e, setFile) => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  const uploadFile = (file, path) => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on('state_changed', 
        (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
        (error) => reject(error),
        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
      );
    });
  };

  const handleSave = async (section) => {
      setMessage('');
      setUploadProgress(0);
      let settingsToSave = { ...localSettings };
      
      try {
        if (section === 'Aparência') {
          if (logoFile) settingsToSave.logoUrl = await uploadFile(logoFile, 'branding');
          if (faviconFile) settingsToSave.faviconUrl = await uploadFile(faviconFile, 'branding');
        }
        await updateSettings(settingsToSave);
        setMessage(`${section} salvas com sucesso!`);
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
          console.error(`Erro ao salvar ${section}:`, error);
      }
  };

  if (loadingSettings || loadingData) return <p>A carregar configurações...</p>;

  return (
    <>
      <div className="settings-page-layout">
        
        <div className="settings-card">
          <h3>Status do Sistema</h3>
          <div className="status-grid">
            <div className="status-item"><span>Status</span><strong className="status-online">Online</strong></div>
            <div className="status-item"><span>Versão</span><strong>1.0.0</strong></div>
            <div className="status-item"><span>Última Atualização</span><strong>{new Date().toLocaleDateString('pt-BR')}</strong></div>
            <div className="status-item"><span>Usuários Ativos</span><strong>{stats.activeUsers}</strong></div>
            <div className="status-item"><span>Produtos Cadastrados</span><strong>{stats.totalProducts}</strong></div>
            <div className="status-item"><span>Clientes Cadastrados</span><strong>{stats.totalClients}</strong></div>
          </div>
        </div>

        <div className="settings-card">
          <h3>Dados da Empresa</h3>
          <div className="form-group"><label>Nome da Empresa</label><input type="text" name="companyName" value={localSettings.companyName || ''} onChange={handleSettingsChange} /></div>
          <div className="form-group"><label>Email de Contato</label><input type="email" name="companyEmail" value={localSettings.companyEmail || ''} onChange={handleSettingsChange} /></div>
          <div className="form-group"><label>PIX (Chave)</label><input type="text" name="pixKey" value={localSettings.pixKey || ''} onChange={handleSettingsChange} /></div>
          <div className="form-actions"><button className="form-button" onClick={() => handleSave('Dados da Empresa')}>Salvar Dados</button></div>
        </div>
        
        <div className="settings-card">
          <h3>Aparência</h3>
          <div className="form-group"><label>Cor Principal (Fundo Sidebar)</label><input type="color" name="primaryColor" value={localSettings.primaryColor || '#1a1a1a'} onChange={handleSettingsChange} className="color-input"/></div>
          <div className="form-group"><label>Cor Secundária (Títulos)</label><input type="color" name="secondaryColor" value={localSettings.secondaryColor || '#800000'} onChange={handleSettingsChange} className="color-input"/></div>
          <div className="form-group"><label>Cor Terciária (Fontes)</label><input type="color" name="tertiaryColor" value={localSettings.tertiaryColor || '#a0a0a0'} onChange={handleSettingsChange} className="color-input"/></div>
          <div className="form-group"><label>Logo</label><input type="file" onChange={(e) => handleFileChange(e, setLogoFile)} />{localSettings.logoUrl && <img src={localSettings.logoUrl} alt="Preview" className="image-preview" />}</div>
          <div className="form-group"><label>Favicon</label><input type="file" onChange={(e) => handleFileChange(e, setFaviconFile)} />{localSettings.faviconUrl && <img src={localSettings.faviconUrl} alt="Preview" className="image-preview" />}</div>
          {uploadProgress > 0 && uploadProgress < 100 && <progress value={uploadProgress} max="100" />}
          <div className="form-actions"><button className="form-button" onClick={() => handleSave('Aparência')}>Salvar Aparência</button></div>
        </div>

        <div className="settings-card">
            <h3>Notificações</h3>
            <div className="form-group-inline"><label>Email para novos pedidos</label><input type="checkbox" name="notify_newSale" checked={localSettings.notify_newSale || false} onChange={handleSettingsChange} /></div>
            <div className="form-group-inline"><label>Alerta de baixo stock</label><input type="checkbox" name="notify_outOfStock" checked={localSettings.notify_outOfStock || false} onChange={handleSettingsChange} /></div>
            <div className="form-group-inline"><label>Alerta de pagamentos atrasados</label><input type="checkbox" name="notify_overduePayment" checked={localSettings.notify_overduePayment || false} onChange={handleSettingsChange} /></div>
            <div className="form-actions"><button className="form-button" onClick={() => handleSave('Notificações')}>Salvar Notificações</button></div>
        </div>

        <div className="settings-card">
          <h3>Segurança</h3>
          <div className="form-group-inline"><label>Ativar Autenticação de 2 Fatores (2FA)</label><input type="checkbox" name="twoFactorAuth" checked={localSettings.twoFactorAuth || false} onChange={handleSettingsChange} /></div>
          <div className="form-group-inline"><label>Manter Logs de Atividade</label><input type="checkbox" name="logActivity" checked={localSettings.logActivity || true} onChange={handleSettingsChange} /></div>
          <div className="form-group"><label>Política de Senhas</label><p className="description-text">Funcionalidade não implementada.</p></div>
          <div className="form-group"><label>Sessões Ativas</label><p className="description-text">Funcionalidade não implementada.</p></div>
          <div className="form-actions"><button className="form-button" onClick={() => handleSave('Segurança')}>Salvar Segurança</button></div>
        </div>

        <div className="settings-card">
          <h3>Backup e Restauração</h3>
          <div className="form-group-inline"><label>Ativar Backup Automático (Semanal)</label><input type="checkbox" name="autoBackup" checked={localSettings.autoBackup || false} onChange={handleSettingsChange} /></div>
          <p className="description-text">Último backup: Não implementado.</p>
          <div className="backup-actions">
            <button className="form-button">Fazer Backup Agora</button>
            <button className="form-button secondary">Restaurar Backup</button>
          </div>
          <div className="form-actions"><button className="form-button" onClick={() => handleSave('Backup')}>Salvar Config. de Backup</button></div>
        </div>

        <div className="settings-card full-width">
          <h3>Atividades Recentes no Sistema</h3>
          <div className="activity-log-section">
            {activityLogs.length > 0 ? (
              <ul className="activity-log-list">{activityLogs.map((log, index) => (<li key={index} className="log-item"><p><strong>{log.userId.substring(0, 8)}...:</strong> {log.action}</p><span>{log.timestamp?.toDate().toLocaleString('pt-BR')}</span></li>))}</ul>
            ) : <p>Nenhuma atividade recente encontrada.</p>}
          </div>
        </div>

        {message && <div className="floating-message">{message}</div>}
      </div>
    </>
  );
};

export default ConfiguracoesPage;

