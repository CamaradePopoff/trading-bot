/**
 * Body Parser Middleware for HyperExpress
 * Parses JSON and URL-encoded request bodies
 * Important: MUST NOT call next() - HyperExpress will continue the chain automatically
 */

/**
 * Parse JSON body
 */
async function parseJSON(request) {
  try {
    const body = await request.json()
    return body || {}
  } catch (error) {
    return {}
  }
}

/**
 * Parse URL-encoded body
 */
async function parseURLEncoded(request) {
  try {
    const body = await request.text()
    if (!body) return {}

    const params = new URLSearchParams(body)
    const result = {}
    for (const [key, value] of params) {
      result[key] = value
    }
    return result
  } catch (error) {
    return {}
  }
}

/**
 * Body parser middleware for HyperExpress
 * Automatically parses JSON and URL-encoded bodies
 */
function bodyParser() {
  return async (request, response) => {
    const contentType = request.headers['content-type'] || ''

    // Parse request body based on content type
    if (contentType.includes('application/json')) {
      request.body = await parseJSON(request)
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      request.body = await parseURLEncoded(request)
    } else {
      request.body = {}
    }

    // Parse query string - HyperExpress may have query_parameters
    if (request.query_parameters) {
      request.query = request.query_parameters
    } else if (!request.query) {
      request.query = {}
    }

    // Parse URL parameters - HyperExpress may have path_parameters
    if (request.path_parameters) {
      request.params = request.path_parameters
    } else if (!request.params) {
      request.params = {}
    }

    // Create Express-compatible aliases
    request.req = request
    response.res = response

    // Create backlinks
    request.res = response
    response.req = request

    // Do NOT call next() - HyperExpress will continue automatically
  }
}

module.exports = bodyParser
