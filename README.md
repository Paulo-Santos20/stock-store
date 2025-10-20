Estampa Fina - Sistema de Gestão de Estoque

📄 Descrição

Estampa Fina é uma aplicação web completa e moderna para gerenciamento de estoque, desenvolvida para otimizar as operações de pequenas e médias empresas. O sistema oferece uma interface intuitiva e responsiva para controlar produtos, categorias, pedidos, clientes e usuários, tudo em tempo real.

O projeto foi construído seguindo os princípios de Arquitetura Escalável, Performance Total, UI/UX de Excelência, Design Responsivo "Mobile-First" e Código de Alta Qualidade.

✨ Funcionalidades Principais

Dashboard de Administrador: Visão geral completa do negócio com métricas de faturamento, novos clientes, pedidos pendentes e total de produtos. Inclui gráficos de vendas e distribuição de usuários.

Gestão de Estoque: Listagem completa de produtos com busca, filtros e opções para criar, editar e excluir itens.

Gerenciamento de Produtos: Formulário completo para cadastro e edição de produtos, incluindo upload de imagens para o Firebase Storage.

Autenticação Segura: Sistema de login e gerenciamento de sessões utilizando Firebase Authentication.

Notificações em Tempo Real: Um header global notifica sobre eventos importantes como novos pedidos, criação de usuários ou produtos com baixo estoque.

Design Responsivo: A interface se adapta perfeitamente a desktops, tablets e celulares.

🚀 Tecnologias Utilizadas

Front-end:

React (com Vite)

React Router para roteamento

CSS Puro com CSS Modules para estilização

Recharts para visualização de dados e gráficos

Back-end & Banco de Dados (BaaS):

Firebase

Firestore: Banco de dados NoSQL em tempo real.

Authentication: Para gerenciamento de usuários.

Storage: Para upload e armazenamento de imagens.

Ferramentas:

Vite

Git & GitHub

🛠️ Configuração e Instalação

Para rodar este projeto localmente, siga os passos abaixo.

Pré-requisitos

Node.js (versão LTS recomendada)

Conta no Firebase com um projeto criado.

Passo a Passo

Clone o repositório:

git clone [https://github.com/seu-usuario/estampa-fina-gestao.git](https://github.com/seu-usuario/estampa-fina-gestao.git)
cd estampa-fina-gestao


Instale as dependências:

npm install


Configure o Firebase:

Crie um arquivo config.js dentro da pasta src/firebase/.

Navegue até o seu projeto no console do Firebase > Configurações do Projeto > Geral.

Na seção "Seus apps", copie o objeto de configuração do Firebase para a web.

Cole o objeto dentro de src/firebase/config.js e exporte as instâncias, como no exemplo abaixo:

// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  // Seu objeto de configuração aqui
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);


Importante: Este arquivo contém chaves sensíveis e já está incluído no .gitignore para não ser enviado ao repositório público.

Habilite os serviços no Firebase:

No console do Firebase, habilite Authentication (com o provedor Email/Senha), Firestore Database (em modo de produção) e Storage.

Inicie o servidor de desenvolvimento:

npm run dev


A aplicação estará disponível em http://localhost:5173.

📂 Estrutura de Pastas

estampa-fina-web/
├── public/
└── src/
    ├── components/    # Componentes reutilizáveis (Layout, Sidebar, Header)
    ├── context/       # Contexto de Autenticação (AuthContext)
    ├── firebase/      # Configuração do Firebase (config.js)
    ├── pages/         # Componentes de página (Dashboard, Estoque, etc.)
    ├── App.jsx        # Roteador principal
    ├── main.jsx       # Ponto de entrada da aplicação
    └── index.css      # Estilos globais
