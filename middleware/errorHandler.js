/**
 * Global error handling middleware.
 * Catches unhandled errors and returns a consistent JSON response.
 */

function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${err.message}`, err.stack);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Erro interno do servidor.' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 handler for unknown routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: `Rota ${req.method} ${req.originalUrl} não encontrada.` });
}

module.exports = { errorHandler, notFoundHandler };
