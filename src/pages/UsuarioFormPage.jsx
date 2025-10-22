import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { FiEye, FiEyeOff } from 'react-icons/fi';
import './FormPages.css';

// --- Definição de Permissões ---
const allPermissions = {
  // Utilizadores
  viewUsers: { label: 'Ver Utilizadores', category: 'Utilizadores' },
  createUser: { label: 'Criar Utilizadores', category: 'Utilizadores' },
  editUser: { label: 'Editar Dados de Utilizadores', category: 'Utilizadores' },
  editUserPermissions: { label: 'Editar Permissões de Utilizadores', category: 'Utilizadores' },
  toggleUserActive: { label: 'Ativar/Desativar Utilizadores', category: 'Utilizadores' },
  deleteUser: { label: 'Excluir Utilizadores', category: 'Utilizadores' },
  // Produtos
  viewProducts: { label: 'Ver Produtos', category: 'Produtos' },
  createProduct: { label: 'Criar Produtos', category: 'Produtos' },
  editProduct: { label: 'Editar Produtos', category: 'Produtos' },
  deleteProduct: { label: 'Excluir Produtos', category: 'Produtos' },
  // Categorias
  viewCategories: { label: 'Ver Categorias', category: 'Categorias' },
  createCategory: { label: 'Criar Categorias', category: 'Categorias' },
  editCategory: { label: 'Editar Categorias', category: 'Categorias' },
  deleteCategory: { label: 'Excluir Categorias', category: 'Categorias' },
  // Clientes
  viewClients: { label: 'Ver Clientes', category: 'Clientes' },
  createClient: { label: 'Criar Clientes', category: 'Clientes' },
  editClient: { label: 'Editar Clientes', category: 'Clientes' },
  deleteClient: { label: 'Excluir Clientes', category: 'Clientes' },
   // Vendas
  viewSales: { label: 'Ver Vendas', category: 'Vendas' },
  createSale: { label: 'Criar Vendas', category: 'Vendas' },
  editSaleStatus: { label: 'Editar Status de Vendas', category: 'Vendas' },
   // Orçamentos
  viewQuotes: { label: 'Ver Orçamentos', category: 'Orçamentos' },
  createQuote: { label: 'Criar Orçamentos', category: 'Orçamentos' },
  editQuote: { label: 'Editar Orçamentos', category: 'Orçamentos' },
  deleteQuote: { label: 'Excluir Orçamentos', category: 'Orçamentos' },
  // Configurações
  viewSettings: { label: 'Ver Configurações', category: 'Configurações' },
  editSettings: { label: 'Editar Configurações', category: 'Configurações' },
};

// Modelos de permissão para cada role
const rolePermissionsTemplates = {
  administrador: Object.keys(allPermissions).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
  gerente: {
    ...Object.keys(allPermissions).reduce((acc, key) => ({ ...acc, [key]: true }), {}), // Começa com tudo
    // Restrições do Gerente
    createUser: false, editUserPermissions: false, deleteUser: false,
    deleteCategory: false, deleteClient: false, deleteQuote: false, editSettings: false,
  },
  operador: {
    // Permissões básicas do Operador
    viewProducts: true, createProduct: true, editProduct: true,
    viewCategories: true, createCategory: true, editCategory: true,
    viewClients: true, createClient: true, editClient: true,
    viewSales: true, createSale: true, editSaleStatus: true,
    viewQuotes: true, createQuote: true, editQuote: true,
  },
  cliente: {
    // Permissões do Cliente (apenas leitura de vendas próprias - tratado nas regras do Firestore)
  },
};

const UsuarioFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUserData } = useAuth();
  const isEditing = Boolean(id);

  const [userData, setUserData] = useState({ name: '', email: '', role: 'operador' });
  const [permissions, setPermissions] = useState({});
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  // --- Funções de Permissão ---
  const canEditPassword = (editorRole, targetRole) => {
    if (!isEditing) return true;
    if (editorRole === 'administrador') return true;
    if (editorRole === 'gerente') {
      return targetRole === 'operador' || targetRole === 'cliente';
    }
    return false;
  };
  const canEditRoleAndPermissions = currentUserData?.role === 'administrador';
  // CORREÇÃO: Definição da variável canEditFields
  const canEditFields = currentUserData?.role === 'administrador' || currentUserData?.role === 'gerente';

  // Verifica permissão de acesso
  useEffect(() => {
    let canAccessPage = isEditing ? canEditFields : canEditRoleAndPermissions; // Ajusta a lógica de acesso
    if (!canAccessPage && currentUserData) {
      alert("Sem permissão para aceder a esta página.");
      navigate('/usuarios');
    } else if (canAccessPage) {
      setHasPermission(true);
      if (!isEditing) setLoading(false);
    }
  }, [currentUserData, navigate, isEditing, canEditRoleAndPermissions, canEditFields]); // Adiciona canEditFields

  // Busca dados do utilizador
  useEffect(() => {
    if (isEditing && hasPermission) {
      setLoading(true);
      const fetchUser = async () => {
        try {
          const docRef = doc(db, 'users', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({ id: docSnap.id, ...data });
            setPermissions(data.permissions || rolePermissionsTemplates[data.role] || {});
          } else { navigate('/usuarios'); }
        } catch (error) { console.error("Erro:", error); }
        finally { setLoading(false); }
      };
      fetchUser();
    }
  }, [id, isEditing, navigate, hasPermission]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
    if (name === 'role' && canEditRoleAndPermissions) {
        setPermissions(rolePermissionsTemplates[value] || {});
    }
  };

  const handlePermissionChange = (e) => {
      const { name, checked } = e.target;
      setPermissions(prev => ({...prev, [name]: checked }));
  };

  const generatePassword = () => {
     const length = 10;
     const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
     let retVal = "";
     for (let i = 0, n = charset.length; i < length; ++i) {
         retVal += charset.charAt(Math.floor(Math.random() * n));
     }
     setPassword(retVal);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasPermission) return;
    setIsSubmitting(true);
    setMessage(''); setError('');

    const firestoreData = {
        name: userData.name,
        role: userData.role,
        permissions: permissions,
        updatedAt: serverTimestamp(),
    };
    if (!isEditing) firestoreData.email = userData.email;

    try {
      if (isEditing) {
        // Garante que apenas Admin pode alterar a role e permissões
        if (!canEditRoleAndPermissions) {
            delete firestoreData.role;
            delete firestoreData.permissions;
        }
        const docRef = doc(db, 'users', id);
        await updateDoc(docRef, firestoreData);

        if (password) {
           if (!canEditPassword(currentUserData?.role, userData.role)) {
               setError("Sem permissão para alterar a senha.");
               setIsSubmitting(false); return;
           }
           if (password.length < 6) {
               setError("Nova senha mínima: 6 caracteres.");
               setIsSubmitting(false); return;
           }
           console.warn(`Nova senha "${password}" para ${userData.email}. Implementar no backend!`);
           setMessage("Dados atualizados. Processamento de senha pendente.");
        } else {
           setMessage("Utilizador atualizado com sucesso!");
        }
        setPassword('');

      } else { // Criação
        if (!password || password.length < 6) { /* ... */ }
        const auth = getAuth();
        let userCredential;
        try {
            userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
        } catch (authError) { /* ... */ }
        const userUid = userCredential.user.uid;
        firestoreData.createdAt = serverTimestamp();
        firestoreData.active = true;
        firestoreData.permissions = rolePermissionsTemplates[userData.role] || {};
        await setDoc(doc(db, 'users', userUid), firestoreData);
        setMessage("Utilizador criado com sucesso!");
        navigate('/usuarios');
      }
    } catch (error) {
      console.error("Erro:", error); setError('Falha ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <p>A carregar...</p>;
  if (!hasPermission && !loading) return null;

  const permissionsByCategory = Object.entries(allPermissions).reduce((acc, [key, value]) => {
      const category = value.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push({ key, label: value.label });
      return acc;
  }, {});

  return (
    <>
      <form className="form-container" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</h3>
           <div className="form-group">
            <label htmlFor="name">Nome Completo</label>
            {/* Aplica a variável canEditFields aqui */}
            <input type="text" id="name" name="name" value={userData.name} onChange={handleChange} required disabled={!canEditFields}/>
          </div>
          <div className="form-group">
            <label htmlFor="email">Email (para login)</label>
            <input type="email" id="email" name="email" value={userData.email} onChange={handleChange} required disabled={isEditing} />
            {isEditing && <small>O email não pode ser alterado após a criação.</small>}
          </div>

          {/* Campo de Senha */}
          {(!isEditing || canEditPassword(currentUserData?.role, userData.role)) && (
            <div className="form-group">
               <label htmlFor="password">{isEditing ? 'Nova Senha (Opcional)' : 'Senha'}</label>
               <div className="input-group password-group">
                 <input type={showPassword ? "text" : "password"} id="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!isEditing} placeholder={isEditing ? 'Deixe em branco para manter a atual' : ''} />
                 <button type="button" className="input-group-button icon-button" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "Ocultar" : "Mostrar"}> {showPassword ? <FiEyeOff /> : <FiEye />}</button>
                 <button type="button" className="input-group-button" onClick={generatePassword}>Gerar</button>
               </div>
               <small>{isEditing ? 'Preencha apenas se desejar alterar.' : 'Mínimo 6 caracteres.'}</small>
            </div>
          )}

          {/* Campo Role (Dropdown) */}
          <div className="form-group">
            <label htmlFor="role">Permissão Principal (Role)</label>
            <select id="role" name="role" value={userData.role} onChange={handleChange} required disabled={!canEditRoleAndPermissions}>
              <option value="administrador">Administrador</option>
              <option value="gerente">Gerente</option>
              <option value="operador">Operador</option>
              <option value="cliente">Cliente</option>
            </select>
             {!canEditRoleAndPermissions && isEditing && <small>Apenas Administradores podem alterar a permissão principal.</small>}
          </div>
        </div>

        {/* Secção Permissões Granulares */}
        {canEditRoleAndPermissions && (
            <div className="form-section permissions-section">
                <h3>Permissões Detalhadas</h3>
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category} className="permission-category">
                        <h4>{category}</h4>
                        <div className="permission-checkboxes">
                            {perms.map(p => (
                                <div key={p.key} className="permission-item">
                                    <input type="checkbox" id={p.key} name={p.key} checked={permissions[p.key] || false} onChange={handlePermissionChange} />
                                    <label htmlFor={p.key}>{p.label}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="button" className="form-button secondary" onClick={() => navigate('/usuarios')}>Cancelar</button>
          <button type="submit" className="form-button" disabled={isSubmitting}>
            {isSubmitting ? 'A Guardar...' : (isEditing ? 'Guardar Alterações' : 'Guardar Usuário')}
          </button>
        </div>
      </form>
    </>
  );
};

export default UsuarioFormPage;

