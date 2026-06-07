'use strict';

require('dotenv').config();

const http   = require('http');
const app    = require('./src/app');
const socket = require('./src/config/socket');

const PORT   = process.env.PORT || 3000;

const httpServer = http.createServer(app);

// Inicializa socket.io no servidor HTTP
socket.init(httpServer);

httpServer.listen(PORT, () => {
  console.log(`\n🍕 Restaurant API rodando em http://localhost:${PORT}`);
  console.log(`   Ambiente  : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health    : http://localhost:${PORT}/health`);
  console.log(`   Socket.io : habilitado\n`);
});

process.on('SIGTERM', () => { httpServer.close(() => process.exit(0)); });
process.on('SIGINT',  () => { httpServer.close(() => process.exit(0)); });