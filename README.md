# 🍕 Restaurant API

CRUD completo de **Produtos**, **Pedidos** e **Mesas** para restaurante, construído com Node.js, Express e MySQL. Inclui comunicação em tempo real via Socket.io.

---

## Stack

| Camada       | Tecnologia          |
|--------------|---------------------|
| Runtime      | Node.js 18+         |
| Framework    | Express 4           |
| Banco        | MySQL 8+            |
| Validação    | Joi                 |
| Pool DB      | mysql2/promise      |
| Tempo real   | Socket.io 4         |
| Segurança    | helmet, dotenv      |

---

## Estrutura

```
restaurant-api/
├── migrations/
│   ├── 001_schema.sql        # DDL principal + seeds (categorias e produtos)
│   └── 002_schema.sql        # Mesas, sessões e alteração em orders
├── src/
│   ├── config/
│   │   ├── database.js       # Pool de conexões + helpers (query, transaction)
│   │   └── socket.js         # Inicialização e emissores do Socket.io
│   ├── models/
│   │   ├── product.model.js  # Queries de produto
│   │   ├── category.model.js # Queries de categoria
│   │   ├── order.model.js    # Queries de pedido (c/ transaction)
│   │   └── table.model.js    # Queries de mesa e sessão (comanda)
│   ├── controllers/
│   │   ├── product.controller.js
│   │   ├── order.controller.js
│   │   └── table.controller.js
│   ├── routes/
│   │   ├── product.routes.js
│   │   ├── order.routes.js
│   │   └── table.routes.js
│   ├── validators/
│   │   └── schemas.js        # Joi schemas
│   ├── middlewares/
│   │   └── errorHandler.js   # Handler global de erros
│   └── app.js                # Express setup
└── server.js                 # Entry point (HTTP + Socket.io)
```

---

## Setup

```bash
# 1. Clone e instale
npm install

# 2. Configure o banco
cp .env.example .env
# Edite .env com suas credenciais MySQL

# 3. Execute as migrations no MySQL (nessa ordem)
#    Cole o conteúdo de 001_schema.sql e depois 002_schema.sql

# 4. Inicie
npm start          # produção
npm run dev        # desenvolvimento (nodemon --watch)
```

### Variáveis de ambiente

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=restaurant_db
DB_POOL_MAX=10
```

---

## Banco de Dados

### Diagrama de Entidades

```
categories ──< products ──< order_items >── orders >── customers
                                               │
                                          table_sessions >── tables
```

### Tabelas

| Tabela           | Descrição                                       |
|------------------|-------------------------------------------------|
| `categories`     | Categorias do cardápio                          |
| `products`       | Produtos com preço, estoque e slug              |
| `customers`      | Cadastro de clientes                            |
| `orders`         | Pedidos com status e pagamento                  |
| `order_items`    | Itens de cada pedido                            |
| `tables`         | Mesas do restaurante                            |
| `table_sessions` | Comandas abertas por mesa                       |

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Categorias

| Método | Rota          | Descrição         |
|--------|---------------|-------------------|
| GET    | /categories   | Listar categorias |
| POST   | /categories   | Criar categoria   |

### Produtos

| Método | Rota                       | Descrição                      |
|--------|----------------------------|--------------------------------|
| GET    | /products                  | Listar produtos (paginado)     |
| POST   | /products                  | Criar produto                  |
| GET    | /products/:id              | Buscar por ID                  |
| GET    | /products/slug/:slug       | Buscar por slug                |
| PUT    | /products/:id              | Atualizar produto              |
| DELETE | /products/:id              | Remover produto (soft delete)  |
| PATCH  | /products/:id/availability | Alternar disponibilidade       |
| PATCH  | /products/:id/stock        | Ajustar estoque (delta +/-)    |

#### Query params de listagem
```
GET /products?page=1&limit=20&category_id=2&search=frango&available=true
```

### Pedidos

| Método | Rota                  | Descrição                           |
|--------|-----------------------|-------------------------------------|
| GET    | /orders               | Listar pedidos (paginado + filtros) |
| POST   | /orders               | Criar pedido                        |
| GET    | /orders/:id           | Detalhar pedido com itens           |
| PATCH  | /orders/:id/status    | Atualizar status                    |
| PATCH  | /orders/:id/payment   | Registrar pagamento                 |
| DELETE | /orders/:id           | Cancelar pedido (estorno de estoque)|
| GET    | /orders/stats/daily   | Stats do dia                        |

#### Fluxo de status
```
pending → confirmed → preparing → ready → delivered
   └──────────────────────────────────────┘
                  cancelled (qualquer etapa antes de delivered)
```

### Mesas

| Método | Rota                | Descrição                              |
|--------|---------------------|----------------------------------------|
| GET    | /tables             | Listar mesas com status da comanda     |
| GET    | /tables/:id         | Detalhar mesa                          |
| POST   | /tables/:id/open    | Abrir comanda (cliente escaneia QR)    |
| GET    | /tables/:id/bill    | Ver comanda atual com todos os pedidos |
| POST   | /tables/:id/checkout| Fechar conta e liberar a mesa          |

#### Status de mesa
```
free → occupied (via /open) → free (via /checkout)
       waiting_payment       (estado intermediário)
```

---

## Tempo Real (Socket.io)

O servidor emite eventos para salas específicas. Clientes entram em salas via `join`.

| Sala          | Quem entra                         |
|---------------|------------------------------------|
| `kitchen`     | Painel da cozinha                  |
| `table_<n>`   | Mesa de número `n` (ex: `table_3`) |

### Eventos emitidos pelo servidor

| Evento           | Sala destino       | Disparado quando                        |
|------------------|--------------------|-----------------------------------------|
| `new_order`      | `kitchen`          | Novo pedido criado                      |
| `order_updated`  | `kitchen`          | Status de pedido alterado               |
| `order_status`   | `table_<n>`        | Status de pedido alterado               |
| `table_opened`   | broadcast geral    | Comanda aberta em uma mesa              |
| `table_free`     | broadcast geral    | Mesa liberada após checkout             |
| `checkout`       | `table_<n>`        | Pagamento confirmado na mesa            |

### Exemplo de conexão (cliente)
```javascript
const socket = io('http://localhost:3000');

// Cozinha
socket.emit('join', 'kitchen');
socket.on('new_order', (order) => console.log('Novo pedido:', order));

// Mesa 3
socket.emit('join', 'table_3');
socket.on('order_status', (update) => console.log('Status:', update));
socket.on('checkout', (bill) => console.log('Conta fechada:', bill));
```

---

## Exemplos de Request

### Criar produto
```json
POST /api/v1/products
{
  "category_id": 2,
  "name": "Frango à Parmegiana",
  "description": "Frango empanado com molho e mussarela",
  "price": 42.90,
  "cost_price": 14.00,
  "sku": "PRI-010",
  "stock": 999,
  "is_available": true
}
```

### Criar pedido
```json
POST /api/v1/orders
{
  "table_number": 5,
  "notes": "Sem cebola no frango",
  "payment_method": "pix",
  "items": [
    { "product_id": 4, "quantity": 2 },
    { "product_id": 7, "quantity": 3, "notes": "Bem gelado" }
  ]
}
```

### Atualizar status
```json
PATCH /api/v1/orders/1/status
{ "status": "confirmed" }
```

### Ajustar estoque
```json
PATCH /api/v1/products/1/stock
{ "delta": -5 }
```

### Abrir comanda
```json
POST /api/v1/tables/3/open
{}
```

### Fechar conta
```json
POST /api/v1/tables/3/checkout
{ "payment_method": "pix" }
```

---

## Respostas padrão

```json
// Sucesso
{ "success": true, "data": { ... } }

// Lista paginada
{ "success": true, "data": [...], "meta": { "total": 50, "page": 1, "limit": 20, "pages": 3 } }

// Erro
{ "success": false, "error": "mensagem do erro" }

// Erro de validação
{ "success": false, "errors": ["campo obrigatório", "..."] }
```