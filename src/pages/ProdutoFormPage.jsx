import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import './FormPages.css';
import { FiUploadCloud } from 'react-icons/fi';

const ProdutoFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [product, setProduct] = useState({
    name: '', sku: '', description: '', category: '', supplier: '',
    unit: 'Unidade', location: '', currentStock: 0, minStock: 0, maxStock: 0,
    weight: 0, costPrice: 0, salePrice: 0, observations: '', imageUrl: ''
  });

  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Busca dados para os dropdowns e para o produto (se estiver editando)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesSnap, suppliersSnap, locationsSnap] = await Promise.all([
          getDocs(collection(db, 'categories')),
          getDocs(collection(db, 'suppliers')),
          getDocs(collection(db, 'locations'))
        ]);
        setCategories(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setSuppliers(suppliersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLocations(locationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        if (isEditing) {
          const docRef = doc(db, 'products', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const productData = docSnap.data();
            setProduct({ ...productData, id: docSnap.id });
            setImagePreview(productData.imageUrl);
          } else {
            navigate('/estoque');
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditing, navigate]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setProduct(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const generateRandomSku = () => {
    const randomSku = 'SKU-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    setProduct(prev => ({ ...prev, sku: randomSku }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    let productData = { ...product, updatedAt: serverTimestamp() };

    try {
      if (imageFile) {
        const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, imageFile);
        const downloadURL = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => reject(error),
            async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
          );
        });
        productData.imageUrl = downloadURL;
      }

      if (isEditing) {
        await updateDoc(doc(db, 'products', id), productData);
      } else {
        productData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'products'), productData);
      }
      navigate('/estoque');
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      alert('Falha ao salvar o produto.');
      setIsSubmitting(false);
    }
  };

  if (loading) return <p>Carregando formulário...</p>;

  return (
    <>
      <form className="form-container large" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Informações Básicas</h3>
          <div className="form-grid">
            <div className="form-group span-2"><label>Nome do Produto</label><input type="text" name="name" value={product.name} onChange={handleChange} required /></div>
            <div className="form-group">
              <label>SKU</label>
              <div className="input-group">
                <input type="text" name="sku" value={product.sku} onChange={handleChange} />
                <button type="button" className="input-group-button" onClick={generateRandomSku}>Gerar</button>
              </div>
            </div>
            <div className="form-group span-3"><label>Descrição</label><textarea name="description" value={product.description} onChange={handleChange} rows="3"></textarea></div>
          </div>
        </div>

        <div className="form-section">
          <h3>Classificação</h3>
          <div className="form-grid">
            <div className="form-group"><label>Categoria</label><select name="category" value={product.category} onChange={handleChange}><option value="">Selecione</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
            <div className="form-group"><label>Fornecedor</label><select name="supplier" value={product.supplier} onChange={handleChange}><option value="">Selecione</option>{suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
            <div className="form-group"><label>Unidade de Medida</label><select name="unit" value={product.unit} onChange={handleChange}><option>Unidade</option><option>Peça</option><option>Caixa</option></select></div>
            <div className="form-group span-3"><label>Localização</label><select name="location" value={product.location} onChange={handleChange}><option value="">Selecione</option>{locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select></div>
          </div>
        </div>

        <div className="form-section">
          <h3>Controle de Estoque</h3>
          <div className="form-grid">
            <div className="form-group"><label>Estoque Atual</label><input type="number" name="currentStock" value={product.currentStock} onChange={handleChange} /></div>
            <div className="form-group"><label>Estoque Mínimo</label><input type="number" name="minStock" value={product.minStock} onChange={handleChange} /></div>
            <div className="form-group"><label>Estoque Máximo</label><input type="number" name="maxStock" value={product.maxStock} onChange={handleChange} /></div>
            <div className="form-group"><label>Peso (kg)</label><input type="number" name="weight" step="0.01" value={product.weight} onChange={handleChange} /></div>
          </div>
        </div>

        <div className="form-section">
          <h3>Preços e Margem</h3>
          <div className="form-grid">
            <div className="form-group"><label>Preço de Custo</label><div className="input-group"><span className="input-addon">R$</span><input type="number" name="costPrice" step="0.01" value={product.costPrice} onChange={handleChange} /></div></div>
            <div className="form-group"><label>Preço de Venda</label><div className="input-group"><span className="input-addon">R$</span><input type="number" name="salePrice" step="0.01" value={product.salePrice} onChange={handleChange} required /></div></div>
          </div>
        </div>

        <div className="form-section">
            <h3>Mídia</h3>
            <div className="form-group">
                <label>Imagem do Produto</label>
                <label htmlFor="image-upload" className="image-upload-box">
                    {imagePreview ? <img src={imagePreview} alt="Preview"/> : <div><FiUploadCloud size={30}/><p>Arraste e solte ou clique para enviar</p></div>}
                </label>
                <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} />
                {uploadProgress > 0 && <progress value={uploadProgress} max="100" />}
            </div>
        </div>
        
        <div className="form-section">
            <h3>Informações Adicionais</h3>
            <div className="form-group"><label>Observações</label><textarea name="observations" value={product.observations} onChange={handleChange} rows="4"></textarea></div>
        </div>

        <div className="form-actions">
          <button type="button" className="form-button secondary" onClick={() => navigate('/estoque')}>Cancelar</button>
          <button type="submit" className="form-button" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Cadastrar Produto')}
          </button>
        </div>
      </form>
    </>
  );
};

export default ProdutoFormPage;