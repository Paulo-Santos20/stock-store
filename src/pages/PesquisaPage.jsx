import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import './PesquisaPage.css'; // CSS específico para os resultados

const PesquisaPage = () => {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q');
  
  const [results, setResults] = useState({ products: [], users: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!searchTerm) {
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        // ATENÇÃO: Firestore não é ideal para busca full-text.
        // Isto é uma simulação. O ideal é usar Algolia ou similar.
        
        // Busca em Produtos (exemplo: busca por nome)
        const productsQuery = query(collection(db, 'products'), where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));
        const productsSnapshot = await getDocs(productsQuery);
        const productsResult = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Busca em Usuários (exemplo: busca por nome)
        const usersQuery = query(collection(db, 'users'), where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));
        const usersSnapshot = await getDocs(usersQuery);
        const usersResult = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setResults({ products: productsResult, users: usersResult });
      } catch (error) {
        console.error("Erro ao realizar pesquisa:", error);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [searchTerm]);

  return (
    <>
      <h2 className="dashboard-title">Resultados da Pesquisa por: "{searchTerm}"</h2>

      {loading && <p>Pesquisando...</p>}
      
      {!loading && (
        <div className="results-container">
          <div className="results-section">
            <h3>Produtos Encontrados ({results.products.length})</h3>
            {results.products.length > 0 ? (
              <ul className="results-list">
                {results.products.map(product => (
                  <li key={product.id}>{product.name} (SKU: {product.sku})</li>
                ))}
              </ul>
            ) : <p>Nenhum produto encontrado.</p>}
          </div>

          <div className="results-section">
            <h3>Usuários Encontrados ({results.users.length})</h3>
            {results.users.length > 0 ? (
              <ul className="results-list">
                {results.users.map(user => (
                  <li key={user.id}>{user.name} ({user.email})</li>
                ))}
              </ul>
            ) : <p>Nenhum usuário encontrado.</p>}
          </div>
        </div>
      )}
    </>
  );
};

export default PesquisaPage;
