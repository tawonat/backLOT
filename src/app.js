'use strict';

require('dotenv').config();
require('express-async-errors');

const express      = require('express');
const helmet       = require('helmet');
const morgan       = require('morgan');
const createError  = require('http-errors');

const productRoutes = require('./routes/product.routes');
const orderRoutes   = require('./routes/order.routes');
const tableRoutes   = require('./routes/table.routes');
const errorHandler  = require('./middlewares/errorHandler');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

const v1 = express.Router();
v1.use('/products', productRoutes);
v1.use('/orders',   orderRoutes);
v1.use('/tables',   tableRoutes);
app.use('/api/v1', v1);

app.use((req, res, next) => next(createError(404, `Rota ${req.method} ${req.path} não encontrada`)));
app.use(errorHandler);

module.exports = app;