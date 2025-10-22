import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { FiCalendar, FiDownload } from 'react-icons/fi';
import './RelatoriosPage.css'; // CSS específico

// Componente reutilizável para cards de métricas
const ReportCard = ({ title, value, description }) => (
    <div className="report-card">
        <h3>{title}</h3>
        <p className="report-value">{value}</p>
        {description && <span className="report-description">{description}</span>}
    </div>
);

// Função para formatar Timestamp
const formatTimestamp = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
    return timestamp.toDate().toLocaleDateString('pt-BR');
};

// Função para exportar dados para CSV
const exportToCsv = (filename, rows) => {
    if (!rows || rows.length === 0) return;
    const header = Object.keys(rows[0]).join(',');
    const csvContent = rows.map(row => Object.values(row).join(',')).join('\n');
    const blob = new Blob([header + '\n' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const RelatoriosPage = () => {
  const { currentUserData } = useAuth();
  const navigate = useNavigate();

  // Estados para os dados
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para os filtros
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));

  // Verifica permissão de acesso
  useEffect(() => {
    const canAccess = currentUserData?.role === 'administrador' || currentUserData?.role === 'gerente';
    if (!canAccess && currentUserData) {
      alert("Acesso negado."); navigate('/');
    } else if (!currentUserData && !loading) {
         navigate('/');
    }
  }, [currentUserData, navigate, loading]);

  // Busca todos os dados necessários
  useEffect(() => {
    if (currentUserData?.role === 'administrador' || currentUserData?.role === 'gerente') {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [ordersSnap, productsSnap, clientsSnap] = await Promise.all([
            getDocs(query(collection(db, 'orders'), orderBy('date', 'desc'))),
            getDocs(collection(db, 'products')),
            getDocs(collection(db, 'clients'))
          ]);
          setOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error("Erro ao carregar dados:", error); } 
        finally { setLoading(false); }
      };
      fetchData();
    } else { setLoading(false); }
  }, [currentUserData]);

  // Calcula métricas e dados para gráficos com base nos filtros
  const reportData = useMemo(() => {
    if (orders.length === 0 || products.length === 0 || !startDate || !endDate) return null;

    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(new Date(endDate.setHours(23, 59, 59, 999))); // Inclui o dia final inteiro

    const filteredOrders = orders.filter(o => o.date >= startTimestamp && o.date <= endTimestamp && o.status === 'Concluído');
    
    // Métricas Financeiras
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalValue, 0);
    const numberOfSales = filteredOrders.length;
    const averageTicket = numberOfSales > 0 ? totalRevenue / numberOfSales : 0;
    // Custo Total (aproximado, buscando custo do produto no momento do relatório)
    const totalCost = filteredOrders.reduce((sum, order) => {
        return sum + order.items.reduce((itemSum, item) => {
           const product = products.find(p => p.id === item.productId);
           return itemSum + ((product?.costPrice || 0) * item.quantity);
        }, 0);
    }, 0);
    const totalProfit = totalRevenue - totalCost;

    // Vendas por Dia (no período selecionado)
    const salesByDay = {};
    filteredOrders.forEach(order => {
        const dayString = order.date.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        salesByDay[dayString] = (salesByDay[dayString] || 0) + order.totalValue;
    });
    const salesChartData = Object.entries(salesByDay).map(([name, Vendas]) => ({ name, Vendas })).sort((a,b) => new Date(a.name.split('/').reverse().join('-')) - new Date(b.name.split('/').reverse().join('-'))); // Ordena por data
    
    // Top Produtos Vendidos
    const productSalesCount = filteredOrders.reduce((acc, order) => {
        order.items.forEach(item => { acc[item.productId] = (acc[item.productId] || 0) + item.quantity; }); return acc;
    }, {});
    const topProducts = Object.entries(productSalesCount).sort(([, qtyA], [, qtyB]) => qtyB - qtyA).slice(0, 5).map(([productId, quantity]) => {
            const product = products.find(p => p.id === productId); return { name: product?.name || 'Desconhecido', Quantidade: quantity };
        });

    // Top Clientes
     const clientSalesValue = filteredOrders.reduce((acc, order) => {
        acc[order.clientId] = (acc[order.clientId] || 0) + order.totalValue; return acc;
    }, {});
     const topClients = Object.entries(clientSalesValue).sort(([, valA], [, valB]) => valB - valA).slice(0, 5).map(([clientId, value]) => {
            const client = clients.find(c => c.id === clientId); return { name: client?.name || 'Desconhecido', Valor: value };
        });


    // Métricas de Stock
    const totalStockValue = products.reduce((sum, p) => sum + ((p.currentStock || 0) * (p.salePrice || 0)), 0);
    const lowStockProductsCount = products.filter(p => (p.currentStock || 0) <= (p.minStock || 0)).length;

    return { totalRevenue, numberOfSales, averageTicket, totalProfit, salesChartData, topProducts, topClients, totalStockValue, lowStockProductsCount };

  }, [orders, products, clients, startDate, endDate]);

  const handleExport = (dataKey, filename) => {
      if(reportData && reportData[dataKey]) {
          // Formata os dados se necessário (ex: moeda) antes de exportar
          const dataToExport = reportData[dataKey].map(item => {
              const newItem = {...item};
              // Exemplo de formatação de valor para CSV (sem R$)
              if(newItem.Valor) newItem.Valor = newItem.Valor.toFixed(2);
              if(newItem.Vendas) newItem.Vendas = newItem.Vendas.toFixed(2);
              return newItem;
          });
          exportToCsv(filename, dataToExport);
      }
  }


  if (loading) return <p>A carregar relatórios...</p>;
  if (!currentUserData || (currentUserData.role !== 'administrador' && currentUserData.role !== 'gerente')) {
       return <p>Acesso negado.</p>;
  }

  return (
    <>
      <div className="page-header reports-header">
        <h2 className="dashboard-title">Relatórios</h2>
        {/* Filtros de Data */}
        <div className="date-filters">
          <FiCalendar />
          <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} selectsStart startDate={startDate} endDate={endDate} dateFormat="dd/MM/yyyy" className="date-picker-input"/>
          <span>até</span>
          <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} dateFormat="dd/MM/yyyy" className="date-picker-input"/>
        </div>
      </div>

      {reportData ? (
        <>
          {/* Métricas Financeiras */}
          <h3 className="report-section-title">Financeiro (Período Selecionado)</h3>
          <div className="report-metrics-grid">
            <ReportCard title="Faturamento Total" value={reportData.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
            <ReportCard title="Lucro Bruto (Aprox.)" value={reportData.totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
            <ReportCard title="Nº de Vendas" value={reportData.numberOfSales} />
            <ReportCard title="Ticket Médio" value={reportData.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
          </div>

          {/* Gráfico de Vendas por Dia */}
          <div className="report-chart-container">
            <div className="chart-header">
                <h3>Vendas por Dia</h3>
                <button className="export-button" onClick={() => handleExport('salesChartData', 'vendas_por_dia')}> <FiDownload/> Exportar CSV</button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.salesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `R$${value}`}/>
                <Tooltip formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/>
                <Legend />
                <Line type="monotone" dataKey="Vendas" stroke="var(--cor-vinho)" strokeWidth={2} name="Valor Vendido" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="report-charts-grid">
             {/* Gráfico/Tabela Top Produtos */}
             <div className="report-chart-container">
                 <div className="chart-header">
                    <h3>Top 5 Produtos Mais Vendidos (Qtd.)</h3>
                    <button className="export-button" onClick={() => handleExport('topProducts', 'top_produtos')}> <FiDownload/> Exportar CSV</button>
                 </div>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.topProducts} layout="vertical"> {/* Gráfico de barras vertical */}
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} fontSize={10}/>
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Quantidade" fill="#6c757d" />
                    </BarChart>
                </ResponsiveContainer>
             </div>

             {/* Gráfico/Tabela Top Clientes */}
             <div className="report-chart-container">
                 <div className="chart-header">
                     <h3>Top 5 Clientes (Valor)</h3>
                     <button className="export-button" onClick={() => handleExport('topClients', 'top_clientes')}> <FiDownload/> Exportar CSV</button>
                 </div>
                 <ResponsiveContainer width="100%" height={300}>
                     <BarChart data={reportData.topClients} layout="vertical">
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis type="number" tickFormatter={(value) => `R$${value}`}/>
                         <YAxis dataKey="name" type="category" width={150} fontSize={10}/>
                         <Tooltip formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                         <Legend />
                         <Bar dataKey="Valor" fill="var(--cor-vinho)" name="Valor Gasto"/>
                     </BarChart>
                 </ResponsiveContainer>
             </div>
          </div>

          {/* Métricas de Stock */}
          <h3 className="report-section-title">Stock</h3>
           <div className="report-metrics-grid">
              <ReportCard title="Valor Total do Stock" value={reportData.totalStockValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} description="Baseado no preço de venda" />
              <ReportCard title="Itens com Baixo Stock" value={reportData.lowStockProductsCount} description="Produtos <= stock mínimo ou 0" />
           </div>

        </>
      ) : (
        <p>A calcular relatórios com base nos filtros selecionados...</p>
      )}
    </>
  );
};

export default RelatoriosPage;