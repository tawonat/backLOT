# 🍕 Restaurant API

CRUD completo de **Produtos** e **Pedidos** para restaurante, construído com Node.js, Express e MySQL.

---

## Stack

| Camada      | Tecnologia |
|-------------|------------|
| Runtime     | Node.js 18+ |
| Framework   | Express 4  |
| Banco       | MySQL 8+   |
| Validação   | Joi        |
| Pool DB     | mysql2/promise |
| Segurança   | helmet, dotenv |

---

## Estrutura

```
restaurant-api/
├── migrations/
│   └── 001_schema.sql        # DDL completo + seeds
├── src/
│   ├── config/
│   │   └── database.js       # Pool de conexões + helpers
│   ├── models/
│   │   ├── product.model.js  # Queries de produto
│   │   ├── category.model.js # Queries de categoria
│   │   └── order.model.js    # Queries de pedido (c/ transaction)
│   ├── controllers/
│   │   ├── product.controller.js
│   │   └── order.controller.js
│   ├── routes/
│   │   ├── product.routes.js
│   │   └── order.routes.js
│   ├── validators/
│   │   └── schemas.js        # Joi schemas
│   ├── middlewares/
│   │   └── errorHandler.js   # Handler global
│   └── app.js                # Express setup
└── server.js                 # Entry point
```

---

## Setup

```bash
# 1. Clone e instale
npm install

# 2. Configure o banco
cp .env.example .env
# Edite .env com suas credenciais MySQL

# 3. Execute o schema (cria tabelas + seeds)
Cole o migrations no mysql o 1 e dps o 2 (vai por mim foi mais facil que executar o comando maldito tmnc)

# 4. Inicie
npm start          # produção
npm run dev        # desenvolvimento (--watch)
```

---

## Banco de Dados

### Diagrama de Entidades

```
categories ──< products ──< order_items >── orders >── customers
```

### Tabelas

| Tabela        | Descrição                          |
|---------------|------------------------------------|
| `categories`  | Categorias do cardápio             |
| `products`    | Produtos com preço, estoque, slug  |
| `customers`   | Cadastro de clientes               |
| `orders`      | Pedidos com status e pagamento     |
| `order_items` | Itens de cada pedido               |

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Categorias

| Método | Rota            | Descrição          |
|--------|-----------------|--------------------|
| GET    | /categories     | Listar categorias  |
| POST   | /categories     | Criar categoria    |

### Produtos

| Método | Rota                        | Descrição                        |
|--------|-----------------------------|----------------------------------|
| GET    | /products                   | Listar produtos (paginado)       |
| POST   | /products                   | Criar produto                    |
| GET    | /products/:id               | Buscar por ID                    |
| GET    | /products/slug/:slug        | Buscar por slug                  |
| PUT    | /products/:id               | Atualizar produto                |
| DELETE | /products/:id               | Remover produto (soft delete)    |
| PATCH  | /products/:id/availability  | Alternar disponibilidade         |
| PATCH  | /products/:id/stock         | Ajustar estoque (delta +/-)      |

#### Query params de listagem
```
GET /products?page=1&limit=20&category_id=2&search=frango&available=true
```

### Pedidos

| Método | Rota                    | Descrição                          |
|--------|-------------------------|------------------------------------|
| GET    | /orders                 | Listar pedidos (paginado + filtros)|
| POST   | /orders                 | Criar pedido                       |
| GET    | /orders/:id             | Detalhar pedido com itens          |
| PATCH  | /orders/:id/status      | Atualizar status                   |
| PATCH  | /orders/:id/payment     | Registrar pagamento                |
| DELETE | /orders/:id             | Cancelar pedido (estorno de estoque)|
| GET    | /orders/stats/daily     | Stats do dia                       |

#### Fluxo de status
```
pending → confirmed → preparing → ready → delivered
   └──────────────────────────────────────┘
                  cancelled (qualquer etapa antes de delivered)
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

---

## Respostas padrão

```json
// Sucesso
{ "success": true, "data": { ... } }

// Lista paginada
{ "success": true, "data": [...], "meta": { "total": 50, "page": 1, "limit": 20, "pages": 3 } }

// Erro
{ "success": false, "error": "mensagem do erro" }

// Validação
{ "success": false, "errors": ["campo obrigatório", "..."] }
```
