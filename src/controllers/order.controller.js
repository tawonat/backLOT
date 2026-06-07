'use strict';

const OrderModel  = require('../models/order.model');
const TableModel  = require('../models/table.model');
const createError = require('http-errors');
const socket      = require('../config/socket');

// GET /orders
exports.list = async (req, res) => {
  const { page = 1, limit = 20, status, customer_id, date_from, date_to } = req.query;
  const result = await OrderModel.findAll({
    page:        Number(page),
    limit:       Math.min(Number(limit), 100),
    status,
    customer_id: customer_id ? Number(customer_id) : undefined,
    date_from,
    date_to,
  });
  res.json({ success: true, ...result });
};

// GET /orders/:id
exports.show = async (req, res) => {
  const order = await OrderModel.findById(Number(req.params.id));
  if (!order) throw createError(404, 'Pedido não encontrado');
  res.json({ success: true, data: order });
};

// POST /orders
exports.create = async (req, res) => {
  // Se vier table_number, busca a sessão aberta e associa
  if (req.body.table_number) {
    const table = await TableModel.findByNumber(req.body.table_number);
    if (!table) throw createError(404, 'Mesa não encontrada');
    if (!table.session_id)
      throw createError(422, 'Mesa não possui comanda aberta. Escaneie o QR code primeiro.');
    req.body.session_id = table.session_id;
  }

  const order = await OrderModel.create(req.body);

  // Dispara pra cozinha em tempo real
  socket.emitNewOrder(order);

  res.status(201).json({ success: true, data: order });
};

// PATCH /orders/:id/status
exports.updateStatus = async (req, res) => {
  const order = await OrderModel.updateStatus(Number(req.params.id), req.body.status);
  if (!order) throw createError(404, 'Pedido não encontrado');

  // Notifica a mesa e a cozinha
  socket.emitOrderStatus(order);

  res.json({ success: true, data: order });
};

// PATCH /orders/:id/payment
exports.updatePayment = async (req, res) => {
  const order = await OrderModel.updatePayment(Number(req.params.id), req.body);
  if (!order) throw createError(404, 'Pedido não encontrado');
  res.json({ success: true, data: order });
};

// DELETE /orders/:id
exports.cancel = async (req, res) => {
  const order = await OrderModel.cancel(Number(req.params.id));
  socket.emitOrderStatus(order);
  res.json({ success: true, data: order });
};

// GET /orders/stats/daily
exports.dailyStats = async (req, res) => {
  const date  = req.query.date || new Date().toISOString().slice(0, 10);
  const stats = await OrderModel.getDailyStats(date);
  res.json({ success: true, data: { date, ...stats } });
};