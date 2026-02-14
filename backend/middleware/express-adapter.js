/**
 * HyperExpress Request/Response Adapter
 * Creates Express-compatible req/res aliases for HyperExpress handlers
 * Important: MUST NOT call next() - HyperExpress will continue automatically
 */

/**
 * Adapter middleware to convert HyperExpress (request, response) to Express-style (req, res)
 * Also ensures that req and res are available as both request/response and req/res
 */
function expressAdapter() {
  return async (request, response) => {
    // Create aliases for Express compatibility
    request.req = request
    response.res = response

    // Also set as properties
    request.res = response
    response.req = request

    // Ensure body and params are available
    if (!request.body) {
      request.body = {}
    }
    if (!request.params) {
      request.params = {}
    }
    if (!request.query) {
      request.query = {}
    }

    // Do NOT call next() - HyperExpress will continue automatically
  }
}

module.exports = expressAdapter
