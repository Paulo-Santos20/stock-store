import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext'; // Importe para verificar permissão
import './FormPages.css'; // Reutilizando o CSS de formulários

const ClienteFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUserData } = useAuth(); // Pega os dados do utilizador logado
  const isEditing = Boolean(id);

  const [client, setClient] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    address: { rua: '', cidade: '', estado: '', cep: '' }, // Objeto para o endereço
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing); // Só carrega se estiver editando
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [hasPermission, setHasPermission] = useState(false); // Estado para controlar permissão

  // Verifica a permissão de acesso à página
  useEffect(() => {
    // Apenas Admin, Gerente e Operador podem criar/editar clientes
    const canAccess = currentUserData?.role === 'administrador' ||
                      currentUserData?.role === 'gerente' ||
                      currentUserData?.role === 'operador';

    if (!canAccess && currentUserData) {
      alert("Você não tem permissão para aceder a esta página.");
      navigate('/'); // Redireciona para o Dashboard
    } else if (canAccess) {
        setHasPermission(true); // Permite a renderização
        // Se não estiver editando, define loading como false imediatamente
        if (!isEditing) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserData, navigate]);


  useEffect(() => {
    // Só busca dados se tiver permissão e estiver editando
    if (!hasPermission || !isEditing) return;

    const fetchClient = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'clients', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          // Garante que o estado tenha a mesma estrutura
          const data = docSnap.data();
          setClient({
            id: docSnap.id, // Guarda o ID para edição
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            cpf: data.cpf || '',
            address: data.address || { rua: '', cidade: '', estado: '', cep: '' },
            notes: data.notes || '',
            // Guarda outros campos como createdAt se precisar exibi-los
            createdAt: data.createdAt || null
          });
        } else {
          console.error("Cliente não encontrado!");
          navigate('/clientes');
        }
      } catch (error) {
        console.error("Erro ao buscar cliente:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [id, isEditing, navigate, hasPermission]); // Adiciona hasPermission

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Lógica para atualizar o objeto de endereço aninhado
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setClient(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setClient(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCepBlur = async (e) => {
    const cep = e.target.value.replace(/\D/g, ''); // Remove caracteres não numéricos
    if (cep.length !== 8) {
      return;
    }
    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setClient(prev => ({
          ...prev,
          address: {
            ...prev.address,
            cep: cep, // Guarda o CEP formatado ou não, como preferir
            rua: data.logradouro,
            cidade: data.localidade,
            estado: data.uf,
          }
        }));
      } else {
         alert("CEP não encontrado.");
         // Opcional: Limpar campos de endereço se CEP for inválido
         setClient(prev => ({ ...prev, address: { ...prev.address, rua: '', cidade: '', estado: '' } }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
       alert("Falha ao buscar CEP. Tente novamente.");
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasPermission) return; // Segurança extra
    setIsSubmitting(true);

    // Remove o ID do objeto antes de salvar para evitar conflito
    const { id: clientId, ...clientDataToSave } = client;
    clientDataToSave.updatedAt = serverTimestamp();

    try {
      if (isEditing) {
        const docRef = doc(db, 'clients', id);
        await updateDoc(docRef, clientDataToSave);
      } else {
        clientDataToSave.createdAt = serverTimestamp();
        // Adicione aqui outros campos padrão para novos clientes se necessário
        // ex: clientDataToSave.status = 'Novo';
        await addDoc(collection(db, 'clients'), clientDataToSave);
      }
      navigate('/clientes');
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      alert('Falha ao salvar o cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Se ainda está a verificar permissão ou a carregar dados
  if (!hasPermission || loading) return <p>A verificar permissão e carregar dados...</p>;

  // Renderiza o formulário
  return (
    <>
      <form className="form-container large" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <div className="form-grid equal-columns">
            <div className="form-group span-2"><label htmlFor="name">Nome Completo</label><input type="text" id="name" name="name" value={client.name} onChange={handleChange} required /></div>
            <div className="form-group"><label htmlFor="email">Email</label><input type="email" id="email" name="email" value={client.email} onChange={handleChange} required /></div>
            <div className="form-group"><label htmlFor="phone">Telefone</label><input type="text" id="phone" name="phone" value={client.phone} onChange={handleChange} /></div>
            <div className="form-group"><label htmlFor="cpf">CPF</label><input type="text" id="cpf" name="cpf" value={client.cpf} onChange={handleChange} /></div>
          </div>
        </div>

        <div className="form-section">
            <h3>Endereço</h3>
            <div className="form-grid equal-columns">
                <div className="form-group">
                  <label htmlFor="address.cep">CEP {isFetchingCep && <small>(a procurar...)</small>}</label>
                  <input type="text" id="address.cep" name="address.cep" value={client.address.cep} onChange={handleChange} onBlur={handleCepBlur} />
                </div>
                <div className="form-group span-2"><label htmlFor="address.rua">Rua e Número</label><input type="text" id="address.rua" name="address.rua" value={client.address.rua} onChange={handleChange} /></div>
                <div className="form-group"><label htmlFor="address.cidade">Cidade</label><input type="text" id="address.cidade" name="address.cidade" value={client.address.cidade} onChange={handleChange} /></div>
                <div className="form-group"><label htmlFor="address.estado">Estado</label><input type="text" id="address.estado" name="address.estado" value={client.address.estado} onChange={handleChange} /></div>
            </div>
        </div>

        <div className="form-section">
            <h3>Informações Adicionais</h3>
            <div className="form-group">
                <label htmlFor="notes">Observações</label>
                <textarea id="notes" name="notes" value={client.notes} onChange={handleChange} rows="4"></textarea>
            </div>
        </div>

        <div className="form-actions">
          <button type="button" className="form-button secondary" onClick={() => navigate('/clientes')}>Cancelar</button>
          <button type="submit" className="form-button" disabled={isSubmitting}>
            {isSubmitting ? 'A Guardar...' : (isEditing ? 'Guardar Alterações' : 'Guardar Cliente')}
          </button>
        </div>
      </form>
    </>
  );
};

export default ClienteFormPage;

