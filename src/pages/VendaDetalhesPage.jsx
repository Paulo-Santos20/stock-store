import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './VendaDetalhesPage.css'; // CSS específico para esta página

const VendaDetalhesPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const docRef = doc(db, 'orders', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.error("Venda não encontrada!");
          navigate('/vendas');
        }
      } catch (error) {
        console.error("Erro ao buscar detalhes da venda:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, navigate]);

  if (loading) return <p>A carregar detalhes da venda...</p>;
  if (!order) return <p>Venda não encontrada.</p>;

  return (
    <>
      <div className="form-container large">
        <div className="form-section">
          <h3>Detalhes da Venda</h3>
          <div className="details-grid">
            <div className="detail-item">
              <label>Cliente</label>
              <p>{order.customerName}</p>
            </div>
            <div className="detail-item">
              <label>Data da Venda</label>
              <p>{order.date?.toDate().toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <p>{order.status}</p>
            </div>
            <div className="detail-item">
              <label>Forma de Pagamento</label>
              <p>{order.paymentMethod}</p>
            </div>
            {order.paymentMethod === 'Cartão de Crédito' && (
                <div className="detail-item">
                    <label>Parcelas</label>
                    <p>{order.paymentDetails?.installments || 1}x</p>
                </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <h3>Produtos Vendidos</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Preço Unit.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{(item.salePrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td>{(item.salePrice * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="total-value-section">
            <strong>Valor Total:</strong>
            <span>{(order.totalValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="form-button secondary" onClick={() => navigate('/vendas')}>Voltar para Vendas</button>
        </div>
      </div>
    </>
  );
};

export default VendaDetalhesPage;
