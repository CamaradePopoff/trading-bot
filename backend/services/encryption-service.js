/**
 * Encryption Service
 * Provides AES-256-GCM encryption/decryption for sensitive data like API keys
 */

const crypto = require('crypto')

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // For AES, this is always 16
const AUTH_TAG_LENGTH = 16

/**
 * Get encryption key from environment variable
 * Key must be 32 bytes (64 hex characters)
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)'
    )
  }

  return Buffer.from(key, 'hex')
}

/**
 * Generate a new encryption key (for setup purposes)
 * @returns {string} A 64-character hexadecimal string
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Encrypt a string
 * @param {string} text - The text to encrypt
 * @returns {string} Encrypted text in format: iv:authTag:encryptedData (all hex encoded)
 */
function encrypt(text) {
  if (!text) {
    return null
  }

  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: 16
    })

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    // Return format: iv:authTag:encryptedData
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error.message)
    throw new Error('Failed to encrypt data', { cause: error })
  }
}

/**
 * Decrypt a string
 * @param {string} encryptedText - The encrypted text in format: iv:authTag:encryptedData
 * @returns {string} Decrypted text
 */
function decrypt(encryptedText) {
  if (!encryptedText) {
    return null
  }

  try {
    const key = getEncryptionKey()
    const parts = encryptedText.split(':')

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }

    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: 16
    })
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption error:', error.message)
    throw new Error('Failed to decrypt data', { cause: error })
  }
}

/**
 * Encrypt an object's sensitive fields
 * @param {object} obj - The object containing sensitive data
 * @param {string[]} fields - Array of field names to encrypt
 * @returns {object} Object with encrypted fields
 */
function encryptFields(obj, fields) {
  if (!obj || !fields || fields.length === 0) {
    return obj
  }

  const encrypted = { ...obj }

  fields.forEach((field) => {
    if (encrypted[field]) {
      encrypted[field] = encrypt(encrypted[field])
    }
  })

  return encrypted
}

/**
 * Decrypt an object's encrypted fields
 * @param {object} obj - The object containing encrypted data
 * @param {string[]} fields - Array of field names to decrypt
 * @returns {object} Object with decrypted fields
 */
function decryptFields(obj, fields) {
  if (!obj || !fields || fields.length === 0) {
    return obj
  }

  const decrypted = { ...obj }

  fields.forEach((field) => {
    if (decrypted[field]) {
      try {
        decrypted[field] = decrypt(decrypted[field])
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error.message)
        // Keep encrypted value if decryption fails
      }
    }
  })

  return decrypted
}

/**
 * Check if a value is encrypted (has the expected format)
 * @param {string} value - The value to check
 * @returns {boolean} True if the value appears to be encrypted
 */
function isEncrypted(value) {
  if (!value || typeof value !== 'string') {
    return false
  }

  const parts = value.split(':')
  return (
    parts.length === 3 &&
    parts[0].length === IV_LENGTH * 2 &&
    parts[1].length === AUTH_TAG_LENGTH * 2
  )
}

module.exports = {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  isEncrypted,
  generateEncryptionKey
}
