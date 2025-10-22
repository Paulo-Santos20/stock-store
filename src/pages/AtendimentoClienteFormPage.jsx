import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FiArrowLeft } from 'react-icons/fi';
import './FormPages.css'; // Reutiliza estilos existentes
import './ModoAtendimentoPage.css'; // Estilos específicos do modo atendimento

const AtendimentoClienteFormPage = () => {
  const navigate = useNavigate();
  const [client, setClient] = useState({ name: '', email: '', phone: '', cpf: '', address: { rua: '', cidade: '', estado: '', cep: '' }, notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setClient(prev => ({ ...prev, address: { ...prev.address, [addressField]: value } }));
    } else {
      setClient(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCepBlur = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setClient(prev => ({ ...prev, address: { ...prev.address, rua: data.logradouro, cidade: data.localidade, estado: data.uf } }));
      }
    } catch (error) { console.error("Erro ao buscar CEP:", error); } 
    finally { setIsFetchingCep(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const clientData = { ...client, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    try {
      const docRef = await addDoc(collection(db, 'clients'), clientData);
      // Navega de volta para o modo atendimento, passando o ID do novo cliente
      navigate('/atendimento', { state: { newClientId: docRef.id } });
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      alert('Falha ao salvar o cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="atendimento-page"> {/* Reutiliza a classe base para o fundo */}
       <header className="atendimento-header">
         {/* Botão para voltar ao modo atendimento */}
        <Link to="/atendimento" className="back-to-admin">
          <FiArrowLeft />
          Voltar ao Atendimento
        </Link>
        <h1>Novo Cliente</h1>
       </header>
       <main className="atendimento-main single-column"> {/* Layout de coluna única */}
          <form className="form-container large no-border" onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Dados Pessoais</h3>
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
                  <div className="form-group"><label htmlFor="address.cep">CEP {isFetchingCep && <small>(a procurar...)</small>}</label><input type="text" id="address.cep" name="address.cep" value={client.address.cep} onChange={handleChange} onBlur={handleCepBlur} /></div>
                  <div className="form-group span-2"><label htmlFor="address.rua">Rua e Número</label><input type="text" id="address.rua" name="address.rua" value={client.address.rua} onChange={handleChange} /></div>
                  <div className="form-group"><label htmlFor="address.cidade">Cidade</label><input type="text" id="address.cidade" name="address.cidade" value={client.address.cidade} onChange={handleChange} /></div>
                  <div className="form-group"><label htmlFor="address.estado">Estado</label><input type="text" id="address.estado" name="address.estado" value={client.address.estado} onChange={handleChange} /></div>
              </div>
            </div>
            <div className="form-section">
              <h3>Informações Adicionais</h3>
              <div className="form-group"><label htmlFor="notes">Observações</label><textarea id="notes" name="notes" value={client.notes} onChange={handleChange} rows="4"></textarea></div>
            </div>
            <div className="form-actions">
              <button type="button" className="form-button secondary" onClick={() => navigate('/atendimento')}>Cancelar</button>
              <button type="submit" className="form-button" disabled={isSubmitting}>{isSubmitting ? 'A Guardar...' : 'Guardar Cliente'}</button>
            </div>
          </form>
       </main>
    </div>
  );
};

export default AtendimentoClienteFormPage;
