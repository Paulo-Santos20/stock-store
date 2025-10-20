import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, updateDoc, collection } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import './FormPages.css'; // Reutilizando o CSS

const ProdutoFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [product, setProduct] = useState({ name: '', description: '', sku: '', quantity: 0, costPrice: 0, salePrice: 0, imageUrl: '' });
  const [imageFile, setImageFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing) {
      const fetchProduct = async () => {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ ...docSnap.data(), id: docSnap.id });
        } else {
          console.log("Produto não encontrado!");
          navigate('/estoque');
        }
      };
      fetchProduct();
    }
  }, [id, isEditing, navigate]);

  const handleChange = (e) => setProduct({ ...product, [e.target.name]: e.target.value });
  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (imageFile) {
      // 1. Se há uma nova imagem, faça o upload primeiro
      const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, imageFile);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Erro no upload:", error);
          setIsSubmitting(false);
        },
        () => {
          // 2. Upload completo, pegue a URL da imagem
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            // 3. Salve o produto no Firestore com a URL da imagem
            saveProduct({ ...product, imageUrl: downloadURL });
          });
        }
      );
    } else {
      // Se não há nova imagem, apenas salve os dados do produto
      saveProduct(product);
    }
  };

  const saveProduct = async (productData) => {
    try {
      if (isEditing) {
        const productRef = doc(db, 'products', id);
        await updateDoc(productRef, productData);
      } else {
        await addDoc(collection(db, 'products'), productData);
      }
      navigate('/estoque');
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      alert('Falha ao salvar o produto.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <h2 className="dashboard-title">{isEditing ? 'Editar Produto' : 'Cadastrar Produto'}</h2>
      <div className="form-container">
        <form onSubmit={handleSubmit}>
          {/* ... campos do formulário (name, sku, quantity, etc.) ... */}
          <div className="form-group">
            <label>Nome do Produto</label>
            <input type="text" name="name" value={product.name} onChange={handleChange} required />
          </div>
          {/* ... outros campos ... */}
          <div className="form-group">
            <label>Imagem do Produto</label>
            <input type="file" onChange={handleImageChange} />
            {isSubmitting && uploadProgress > 0 && <progress value={uploadProgress} max="100" />}
            {product.imageUrl && !imageFile && <img src={product.imageUrl} alt="preview" style={{width: '100px', marginTop: '10px'}}/>}
          </div>
          <div className="form-actions">
            <button type="submit" className="form-button" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ProdutoFormPage;