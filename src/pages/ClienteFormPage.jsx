import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './FormPages.css'; // Reutilizando o CSS de formulários

const ClienteFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [client, setClient] = useState({
    name: '',
    email: '',
    phone: '',
    address: { rua: '', cidade: '', estado: '', cep: '' }, // Objeto para o endereço
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  useEffect(() => {
    if (isEditing) {
      const fetchClient = async () => {
        try {
          const docRef = doc(db, 'clients', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setClient({
              name: data.name || '',
              email: data.email || '',
              phone: data.phone || '',
              address: data.address || { rua: '', cidade: '', estado: '', cep: '' },
              notes: data.notes || '',
            });
          } else {
            navigate('/clientes');
          }
        } catch (error) {
          console.error("Erro ao buscar cliente:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchClient();
    } else {
      setLoading(false); // Garante que o loading termine se não estiver editando
    }
  }, [id, isEditing, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
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
            rua: data.logradouro,
            cidade: data.localidade,
            estado: data.uf,
          }
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const clientData = { ...client, updatedAt: serverTimestamp() };

    try {
      if (isEditing) {
        const docRef = doc(db, 'clients', id);
        await updateDoc(docRef, clientData);
      } else {
        clientData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'clients'), clientData);
      }
      navigate('/clientes');
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      alert('Falha ao salvar o cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <p>A carregar cliente...</p>;

  return (
    <>
      <form className="form-container large" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <div className="form-grid equal-columns">
            <div className="form-group span-2"><label htmlFor="name">Nome Completo</label><input type="text" id="name" name="name" value={client.name} onChange={handleChange} required /></div>
            <div className="form-group"><label htmlFor="email">Email</label><input type="email" id="email" name="email" value={client.email} onChange={handleChange} required /></div>
            <div className="form-group"><label htmlFor="phone">Telefone</label><input type="text" id="phone" name="phone" value={client.phone} onChange={handleChange} /></div>
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