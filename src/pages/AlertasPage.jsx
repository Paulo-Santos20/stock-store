import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FiAlertTriangle, FiClock, FiDollarSign } from 'react-icons/fi';
import './AlertasPage.css';

const AlertItem = ({ alert }) => {
  const severityClasses = {
    alta: 'severity-high',
    media: 'severity-medium',
    baixa: 'severity-low',
  };

  const icons = {
    'baixo-stock': <FiAlertTriangle size={24} />,
    'vencimento-proximo': <FiClock size={24} />,
    'pagamento-atrasado': <FiDollarSign size={24} />,
  };

  return (
    <div className={`alert-item ${severityClasses[alert.severity]}`}>
      <div className="alert-icon">{icons[alert.type]}</div>
      <div className="alert-content">
        <p><strong>{alert.title}</strong></p>
        <span>{alert.details}</span>
      </div>
      {alert.ctaLink && (
        <Link to={alert.ctaLink} className="alert-action-button">
          Resolver
        </Link>
      )}
    </div>
  );
};

const AlertasPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndGenerateAlerts = async () => {
      try {
        const [productsSnap, ordersSnap, existingNotifsSnap] = await Promise.all([
          getDocs(collection(db, 'products')),
          getDocs(query(collection(db, 'orders'), where('status', '==', 'Aguardando Pagamento'))),
          getDocs(collection(db, 'notifications'))
        ]);

        const existingNotifIds = new Set(existingNotifsSnap.docs.map(d => d.id));
        const allProducts = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const overdueOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const generatedAlerts = [];
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Nível 1: Alertas de Baixo Stock
        allProducts.forEach(p => {
          const isLowStock = p.currentStock <= (p.minStock || 0);
          if (isLowStock) {
            const alert = {
              id: `stock-${p.id}`, type: 'baixo-stock', severity: 'media',
              title: `Stock Baixo: ${p.name}`,
              details: `Stock Atual: ${p.currentStock}`, ctaLink: `/produtos/editar/${p.id}`
            };
            generatedAlerts.push(alert);
            if (!existingNotifIds.has(alert.id)) {
              setDoc(doc(db, 'notifications', alert.id), {
                message: alert.title, type: alert.type, ctaLink: alert.ctaLink, read: false, timestamp: serverTimestamp()
              });
            }
          }
        });
        
        // Nível 2: Alertas de Vencimento
        allProducts.forEach(p => {
          if (p.expiryDate && p.expiryDate.toDate) {
            const expiry = p.expiryDate.toDate();
            if (expiry < now) {
              const alert = {
                id: `expired-${p.id}`, type: 'vencimento-proximo', severity: 'alta',
                title: `Produto Vencido: ${p.name}`,
                details: `Venceu em: ${expiry.toLocaleDateString('pt-BR')}`,
                ctaLink: `/produtos/editar/${p.id}`,
              };
              generatedAlerts.push(alert);
              if (!existingNotifIds.has(alert.id)) {
                setDoc(doc(db, 'notifications', alert.id), { message: alert.title, type: alert.type, ctaLink: alert.ctaLink, read: false, timestamp: serverTimestamp() });
              }
            } else if (expiry < thirtyDaysFromNow) {
              const alert = {
                id: `expiring-${p.id}`, type: 'vencimento-proximo', severity: 'baixa',
                title: `Vencimento Próximo: ${p.name}`,
                details: `Vence em: ${expiry.toLocaleDateString('pt-BR')}`,
                ctaLink: `/produtos/editar/${p.id}`,
              };
              generatedAlerts.push(alert);
              if (!existingNotifIds.has(alert.id)) {
                setDoc(doc(db, 'notifications', alert.id), { message: alert.title, type: alert.type, ctaLink: alert.ctaLink, read: false, timestamp: serverTimestamp() });
              }
            }
          }
        });

        // Nível 3: Alertas de Pagamento Atrasado
        overdueOrders.forEach(order => {
            if(order.date && order.date.toDate() < sevenDaysAgo) {
                const alert = {
                    id: `overdue-${order.id}`, type: 'pagamento-atrasado', severity: 'alta',
                    title: `Pagamento Atrasado: ${order.customerName}`,
                    details: `Venda de ${order.date.toDate().toLocaleDateString('pt-BR')} ainda aguarda pagamento.`,
                    ctaLink: `/vendas/editar/${order.id}`,
                };
                generatedAlerts.push(alert);
                if (!existingNotifIds.has(alert.id)) {
                    setDoc(doc(db, 'notifications', alert.id), { message: alert.title, type: alert.type, ctaLink: alert.ctaLink, read: false, timestamp: serverTimestamp() });
                }
            }
        });
        
        const severityOrder = { alta: 1, media: 2, baixa: 3 };
        generatedAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
        
        setAlerts(generatedAlerts);

      } catch (error) {
        console.error("Erro ao buscar alertas: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAndGenerateAlerts();
  }, []);

  if (loading) return <p>A carregar alertas...</p>;

  return (
    <>
      <div className="page-header">
        <h2 className="dashboard-title">Central de Alertas ({alerts.length})</h2>
      </div>

      <div className="data-section">
        <div className="alerts-list">
          {alerts.length > 0 ? (
            alerts.map(alert => <AlertItem key={alert.id} alert={alert} />)
          ) : (
            <p>Nenhum alerta no momento. O sistema está em ordem!</p>
          )}
        </div>
      </div>
    </>
  );
};

export default AlertasPage;

