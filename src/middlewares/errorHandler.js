'use strict';

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  const isDev    = process.env.NODE_ENV !== 'production';
  const status   = err.status || err.statusCode || 500;
  const message  = err.message || 'Erro interno do servidor';

  if (status >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({
    success: false,
    error:   message,
    ...(isDev && status >= 500 ? { stack: err.stack } : {}),
  });
};
