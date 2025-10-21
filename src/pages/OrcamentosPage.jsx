import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FiPlusCircle, FiEye, FiTrash2 } from 'react-icons/fi';
import './OrcamentosPage.css';

const formatTimestamp = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
    return timestamp.toDate().toLocaleDateString('pt-BR');
};

const OrcamentosPage = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const quotesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQuotes(quotesData);
      } catch (error) {
        console.error("Erro ao buscar orçamentos: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotes();
  }, []);
  
  const handleDelete = async (id) => {
    if (window.confirm('Tem a certeza que deseja excluir este orçamento?')) {
        try {
            await deleteDoc(doc(db, 'quotes', id));
            setQuotes(quotes.filter(q => q.id !== id));
        } catch (error) {
            console.error("Erro ao eliminar orçamento: ", error);
            alert('Falha ao excluir o orçamento.');
        }
    }
  };

  if (loading) return <p>A carregar orçamentos...</p>;

  return (
    <>
      <div className="page-header">
        <h2 className="dashboard-title">Orçamentos</h2>
        <Link to="/orcamentos/novo" className="action-button">
          <FiPlusCircle size={20} />
          Criar Novo Orçamento
        </Link>
      </div>

      <div className="data-section">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Data</th>
                <th>Valor Total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length > 0 ? (
                quotes.map(quote => (
                  <tr key={quote.id}>
                    <td className="customer-name-cell">{quote.customerName}</td>
                    <td>{formatTimestamp(quote.createdAt)}</td>
                    <td>{(quote.totalValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td>{quote.status || 'Pendente'}</td>
                    <td className="actions-cell">
                      <Link to={`/orcamentos/editar/${quote.id}`}><button title="Ver / Editar"><FiEye size={18} /></button></Link>
                      <button title="Excluir" onClick={() => handleDelete(quote.id)}><FiTrash2 size={18} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                    Nenhum orçamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default OrcamentosPage;
