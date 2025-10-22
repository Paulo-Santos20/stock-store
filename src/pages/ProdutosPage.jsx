import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext'; // Importe o hook de autenticação
import { FiEdit, FiTrash2, FiPlusCircle } from 'react-icons/fi';
import './EstoquePage.css'; // Mantenha o nome do CSS ou renomeie se preferir

const ProdutosPage = () => {
  const { currentUserData } = useAuth(); // Pega os dados do utilizador logado (incluindo a role)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Define as permissões com base na role
  const canAdd = currentUserData?.role === 'administrador' || currentUserData?.role === 'gerente' || currentUserData?.role === 'operador';
  const canEdit = canAdd; // Mesma permissão para editar
  const canDelete = currentUserData?.role === 'administrador' || currentUserData?.role === 'gerente'; // Apenas Admin e Gerente podem excluir

  // Busca os produtos do Firestore
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

  // Função para deletar um produto (já verifica a permissão no frontend)
  const handleDelete = async (id) => {
    if (!canDelete) {
      alert("Você não tem permissão para excluir produtos.");
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este produto? A ação não pode ser desfeita.')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        setProducts(products.filter(p => p.id !== id));
      } catch (error) {
        console.error("Erro ao deletar produto: ", error);
        alert('Falha ao excluir o produto.');
      }
    }
  };
  
  // Filtra os produtos
  const filteredProducts = useMemo(() =>
    products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [products, searchTerm]);

  if (loading) return <p>A carregar produtos...</p>;

  return (
    <>
      <div className="estoque-header">
         {/* Botão Adicionar visível apenas se houver permissão */}
        {canAdd && (
          <Link to="/produtos/novo" className="action-button">
            <FiPlusCircle size={20} />
            Adicionar Novo Produto
          </Link>
        )}
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
                {/* Mostra a coluna Ações apenas se o utilizador puder Editar OU Excluir */}
                {(canEdit || canDelete) && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td>
                      <img 
                        src={product.imageUrl || 'https://placehold.co/60x60/800000/FFF?text=SF'} 
                        alt={product.name} 
                        className="product-table-image"
                      />
                    </td>
                    <td className="product-name-cell">{product.name}</td>
                    <td>{product.sku || 'N/A'}</td>
                    <td>{product.quantity || 0}</td>
                    <td>
                      {(product.salePrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    {/* Renderiza a célula de ações apenas se houver permissão */}
                    {(canEdit || canDelete) && (
                      <td className="actions-cell">
                        {/* Botão Editar visível se puder editar */}
                        {canEdit && (
                          <Link to={`/produtos/editar/${product.id}`}><button title="Editar"><FiEdit size={18} /></button></Link>
                        )}
                        {/* Botão Excluir visível se puder excluir */}
                        {canDelete && (
                          <button title="Excluir" onClick={() => handleDelete(product.id)}><FiTrash2 size={18} /></button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  {/* Ajusta o colSpan dinamicamente */}
                  <td colSpan={(canEdit || canDelete) ? 6 : 5} style={{ textAlign: 'center', padding: '40px' }}>
                    Nenhum produto encontrado.
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

export default ProdutosPage;
