'use strict';

const TableModel  = require('../models/table.model');
const createError = require('http-errors');
const socket      = require('../config/socket');

// GET /tables
exports.list = async (req, res) => {
  const tables = await TableModel.findAll();
  res.json({ success: true, data: tables });
};

// GET /tables/:id
exports.show = async (req, res) => {
  const table = await TableModel.findById(Number(req.params.id));
  if (!table) throw createError(404, 'Mesa não encontrada');
  res.json({ success: true, data: table });
};

// POST /tables/:id/open  — cliente escaneia o QR e abre a comanda
exports.openSession = async (req, res) => {
  const table = await TableModel.openSession(Number(req.params.id));
  // Avisa o painel que a mesa foi ocupada
  socket.getIO().emit('table_opened', { table_number: table.number, table_id: table.id });
  res.status(201).json({ success: true, data: table });
};

// GET /tables/:id/bill  — ver a comanda atual
exports.getBill = async (req, res) => {
  const bill = await TableModel.getBill(Number(req.params.id));
  res.json({ success: true, data: bill });
};

// POST /tables/:id/checkout  — cliente paga, mesa é liberada
exports.checkout = async (req, res) => {
  const { payment_method } = req.body;
  if (!payment_method) throw createError(422, 'Campo "payment_method" obrigatório');

  const bill = await TableModel.checkout(Number(req.params.id), { payment_method });

  // Avisa a mesa que o pagamento foi confirmado
  socket.emitTableCheckout(bill.table_number, bill);
  // Avisa o painel geral que a mesa foi liberada
  socket.getIO().emit('table_free', { table_number: bill.table_number });

  res.json({ success: true, data: bill });
};