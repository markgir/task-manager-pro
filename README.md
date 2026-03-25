# 📋 Task Manager Pro

Uma aplicação moderna de gestão de tarefas construída com **Node.js**, **Express** e **JavaScript vanilla**.

## ✨ Funcionalidades

- 🔐 **Autenticação completa** — Registo e login com JWT tokens e hash bcrypt
- 📝 **CRUD de tarefas** — Criar, ler, atualizar e eliminar tarefas
- 🔍 **Pesquisa e filtros** — Pesquisa por texto, filtro por status e prioridade
- 📄 **Paginação** — Backend e frontend com controlo de páginas
- 🔔 **Notificações toast** — Feedback visual para todas as ações
- ✅ **Validação robusta** — Validação no frontend (tempo real) e backend (express-validator)
- 🎨 **Design moderno** — Interface responsiva, minimalista e intuitiva
- 🛡️ **Segurança** — Helmet, CORS, rate limiting, sanitização de inputs, proteção XSS
- 📊 **Estatísticas** — Dashboard com contadores de tarefas por estado

## 🚀 Começar

### Pré-requisitos

- Node.js 16+ 
- npm

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar o servidor
npm start

# Ou com auto-reload (desenvolvimento)
npm run dev
```

O servidor inicia em `http://localhost:3000`

### Testes

```bash
npm test
```

## 📁 Estrutura do Projeto

```
├── server.js              # Entry point - Express server
├── data/
│   └── store.js           # In-memory data store (CRUD)
├── middleware/
│   ├── auth.js            # JWT authentication middleware
│   └── errorHandler.js    # Global error handling
├── routes/
│   ├── auth.js            # Auth routes (register, login, me)
│   └── tasks.js           # Task CRUD routes
├── services/
│   └── ping.js            # Health check service
├── utils/
│   └── sanitize.js        # Input sanitization utilities
├── public/
│   ├── index.html         # SPA entry point
│   ├── css/style.css      # Modern CSS design
│   └── js/app.js          # Frontend application
└── test/
    ├── api.test.js        # API integration tests
    └── store.test.js      # Data store unit tests
```

## 🔑 API Endpoints

### Autenticação
| Método | Rota               | Descrição        | Auth |
|--------|--------------------|-----------------|----- |
| POST   | `/api/auth/register` | Criar conta     | ❌   |
| POST   | `/api/auth/login`    | Iniciar sessão  | ❌   |
| GET    | `/api/auth/me`       | Perfil do user  | ✅   |

### Tarefas
| Método | Rota               | Descrição                    | Auth |
|--------|--------------------|-----------------------------|------|
| GET    | `/api/tasks`       | Listar tarefas (paginadas)  | ✅   |
| GET    | `/api/tasks/stats` | Estatísticas                | ✅   |
| GET    | `/api/tasks/:id`   | Obter tarefa                | ✅   |
| POST   | `/api/tasks`       | Criar tarefa                | ✅   |
| PUT    | `/api/tasks/:id`   | Atualizar tarefa            | ✅   |
| DELETE | `/api/tasks/:id`   | Eliminar tarefa             | ✅   |

### Query Parameters (GET /api/tasks)
- `page` — Número da página (default: 1)
- `limit` — Items por página (default: 10, max: 100)
- `status` — Filtrar por status (pending, in_progress, completed)
- `priority` — Filtrar por prioridade (low, medium, high)
- `search` — Pesquisa por título/descrição
- `sortBy` — Campo de ordenação (createdAt, title, status, priority)
- `sortOrder` — Direção (asc, desc)

## 🛡️ Segurança

- **Helmet** — Headers HTTP seguros
- **CORS** — Controlo de origens permitidas
- **Rate Limiting** — 100 req/15min (API), 20 req/15min (auth)
- **bcrypt** — Hash de passwords com salt (12 rounds)
- **JWT** — Tokens de sessão com expiração de 24h
- **Validação** — express-validator em todos os endpoints
- **Sanitização** — Remoção de HTML/XSS dos inputs
- **Body limit** — Limite de 10KB no body dos requests

## 📝 Licença

MIT
