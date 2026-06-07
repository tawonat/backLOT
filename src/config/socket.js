'use strict';

let _io = null;

function init(httpServer) {
  const { Server } = require('socket.io');
  _io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  _io.on('connection', (socket) => {
    console.log(`[Socket] cliente conectado: ${socket.id}`);

    // Cliente entra numa sala (ex: cozinha entra em 'kitchen', mesa entra em 'table_3')
    socket.on('join', (room) => {
      socket.join(room);
      console.log(`[Socket] ${socket.id} entrou em "${room}"`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] cliente desconectado: ${socket.id}`);
    });
  });

  return _io;
}

function getIO() {
  if (!_io) throw new Error('Socket.io não foi inicializado');
  return _io;
}

// Emite pra cozinha quando chega novo pedido
function emitNewOrder(order) {
  getIO().to('kitchen').emit('new_order', order);
}

// Emite atualização de status pra mesa
function emitOrderStatus(order) {
  getIO().to(`table_${order.table_number}`).emit('order_status', {
    order_id:     order.id,
    order_number: order.order_number,
    status:       order.status,
    items:        order.items,
  });
  // Também avisa a cozinha
  getIO().to('kitchen').emit('order_updated', order);
}

// Emite quando a conta é fechada
function emitTableCheckout(tableNumber, bill) {
  getIO().to(`table_${tableNumber}`).emit('checkout', bill);
}

module.exports = { init, getIO, emitNewOrder, emitOrderStatus, emitTableCheckout };