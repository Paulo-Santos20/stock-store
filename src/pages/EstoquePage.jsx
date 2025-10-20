import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FiEdit, FiTrash2, FiPlusCircle } from 'react-icons/fi';
import './EstoquePage.css';

const EstoquePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);
      } catch (error) {
        console.error("Erro ao buscar produtos: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        setProducts(products.filter(p => p.id !== id));
      } catch (error) {
        console.error("Erro ao deletar produto: ", error);
        alert('Falha ao excluir o produto.');
      }
    }
  };
  
  const filteredProducts = useMemo(() =>
    products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [products, searchTerm]);

  if (loading) return <p>Carregando estoque...</p>;

  return (
    <>
      <div className="estoque-header">
        <h2 className="dashboard-title">Estoque de Produtos</h2>
        <Link to="/produtos/novo" className="action-button">
          <FiPlusCircle size={20} />
          Adicionar Produto
        </Link>
      </div>

      <div className="data-section">
        <div className="table-header">
          <input
            type="text"
            placeholder="Buscar por nome ou SKU..."
            className="table-search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Imagem</th>
                <th>Produto</th>
                <th>SKU</th>
                <th>Estoque</th>
                <th>Preço Venda</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id}>
                  <td>
                    <img src={product.imageUrl || 'https://placehold.co/60x60/800000/FFF?text=SF'} alt={product.name} className="product-table-image"/>
                  </td>
                  <td>{product.name}</td>
                  <td>{product.sku || 'N/A'}</td>
                  <td>{product.quantity || 0}</td>
                  <td>
                    {/* AQUI ESTÁ A CORREÇÃO */}
                    {(product.salePrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="actions-cell">
                    <Link to={`/produtos/editar/${product.id}`}><button title="Editar"><FiEdit size={18} /></button></Link>
                    <button title="Excluir" onClick={() => handleDelete(product.id)}><FiTrash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default EstoquePage;
