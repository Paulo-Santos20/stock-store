import axios from 'axios';

const api = axios.create({
  // Coloque a URL do seu worker da Cloudflare aqui
  baseURL: 'https://estampa-fina-api.<SEU_USUARIO>.workers.dev', 
});

// Interceptor para adicionar o token de autenticação em todas as requisições
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;