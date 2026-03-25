/**
 * Health check / ping service.
 * Returns server status and uptime information.
 */

function getStatus() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memoryUsage: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
    },
  };
}

module.exports = { getStatus };
