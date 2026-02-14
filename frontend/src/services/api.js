import { useMainStore } from "@/store"
import { pinia } from "@/plugins"

const apiUrl = import.meta.env.VITE_API_ROOT_URL

function getFullApiUrl() {
  const store = useMainStore(pinia)
  const exchange = store.exchange
  if (!exchange) {
    throw new Error('Exchange not set in store')
  }
  // console.log('Using exchange:', exchange)
  return `${apiUrl}/${exchange.toLowerCase()}`
}

function authHeaders() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const token = localStorage.getItem('token')
  if (user && user.username && token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  }
  return {}
}

function requestConfig(method) {
  return {
    GET: {
      method: 'GET',
      headers: authHeaders()
    },
    POST: {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' }
    },
    PUT: {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' }
    },
    DELETE: {
      method: 'DELETE',
      headers: authHeaders()
    }
  }[method]
}

function logout() {
  document.location.href = '/logout'
}

async function sendRequestGET(path) {
  return await (
    await fetch(`${getFullApiUrl()}/${path}`, requestConfig('GET')).then((response) => {
      if (response.status === 401) {
        console.log('Unauthorized')
        return logout()
      }
      return response
    })
  ).json()
}

async function sendRequestPOST(path, body) {
  return await (
    await fetch(`${getFullApiUrl()}/${path}`, {
      body: JSON.stringify(body),
      ...requestConfig('POST')
    }).then((response) => {
      if (response.status === 401) {
        console.log('Unauthorized')
        return logout()
      }
      return response
    })
  ).json()
}

async function sendRequestPUT(path, body) {
  return await (
    await fetch(`${getFullApiUrl()}/${path}`, {
      body: JSON.stringify(body),
      ...requestConfig('PUT')
    }).then((response) => {
      if (response.status === 401) {
        console.log('Unauthorized')
        return logout()
      }
      return response
    })
  ).json()
}

async function sendRequestDELETE(path) {
  return await (
    await fetch(`${getFullApiUrl()}/${path}`, requestConfig('DELETE')).then(
      (response) => {
        if (response.status === 401) {
          console.log('Unauthorized')
          return logout()
        }
        return response
      }
    )
  ).json()
}

export default {
  sendRequestGET,
  sendRequestPOST,
  sendRequestPUT,
  sendRequestDELETE
}
