import Logger from "./logger.mjs";

const {
  Vue: { reactive, watch, ref },
  ElementPlus: { ElMessage },
} = window

export const storagePassword = ref(sessionStorage.getItem('storagePassword'))
watch(storagePassword, () => sessionStorage.setItem('storagePassword', storagePassword.value))

export const useLocalStorageRef = (name, defaultValue) => {
  const value = ref(localStorage.getItem(name) || defaultValue)
  watch(value, () => localStorage.setItem(name, value.value))
  return value
}

const version = 3

export const useReactiveEncryptedStorage = async (name, defaultValue, {
  encode = async (data) => encryptData(JSON.stringify(data), storagePassword.value),
  decode = async (data) => JSON.parse(await decryptData(data, storagePassword.value)),
} = {}) => {
  if (!storagePassword.value) return ElMessage.error('Пароль не задан!')
  let storage = null

  if (localStorage.getItem(name)) {
    try {
      storage = await decode(localStorage.getItem(name))
    } catch (error) {
      console.error(error)
      ElMessage.error('Ошибка при чтении хранилища!')
    }
  }

  storage = reactive(storage || defaultValue)

  watch(storage, async () => {
    try {
      localStorage.setItem(name, await encode(storage))
    } catch (error) {
      console.error(error)
      ElMessage.error('Ошибка при записи в хранилище!')
    }
  }, { deep: true, immediate: true })

  return storage
}

export const useAccountsStorage = async ({ socket, blockchain, create, sign }) => {
  const logger = new Logger({socket, blockchain})
  const accounts = await useReactiveEncryptedStorage(blockchain + '-accounts', [], {
    encode: async (data) => encryptData(JSON.stringify(data.map(account => account.privateKey)), storagePassword.value),
    decode: async (data) => JSON.parse(await decryptData(data, storagePassword.value)).map(pk => create(pk)),
  })
  const accountsStatus = reactive(new Map())

  const getAccountByAddress = (address) => accounts.find(account => account.address.toLowerCase() === address?.toLowerCase())

  const createAddress = async () => accounts.push(create())
  const removeAddress = async (address) => {
    const account = getAccountByAddress(address)
    if (!address) return ElMessage.error('Адрес не найден11: ' + address)

    socket.emit('removeAddress', { blockchain, address })
    accountsStatus.delete(address.toLowerCase())
    accounts.splice(accounts.indexOf(account), 1)
  }

  const reconnectAddress = async (address) => {
    const account = getAccountByAddress(address)
    if (!account) return ElMessage.error('Адрес не найден12: ' + address)

    accountsStatus.set(address, 'AUTHORIZING')
    socket.emit('addAddress', { blockchain, address, version })
  }
  const reconnectAllAddresses = async () => {
    for (const account of accounts) {
      accountsStatus.set(account.address, 'AUTHORIZING')
      socket.emit('addAddress', { blockchain, address: account.address, version })
    }
  }

  watch(accounts, () => {
    console.log('accounts', accounts)
    for (const account of accounts) {
      if (!accountsStatus.has(account.address.toLowerCase())) {
        accountsStatus.set(account.address.toLowerCase(), 'AUTHORIZING')
        socket.emit('addAddress', { blockchain, address: account.address, version })
      }
    }
  }, { immediate: true })

  socket.on('connect_error', (error) => {
    console.error(error)
    ElMessage.error('Ошибка подключения: ' + error.message)
  })
  socket.on('connect', () => {
    reconnectAllAddresses()
  })
  socket.on('disconnect', (e) => {
    console.error('AccountStorage', blockchain, 'disconnected')
    setTimeout(() => {
    console.log('AccountStorage', blockchain, 'reconnecting')
      socket.connect();
    }, 1000)
    accountsStatus.clear()
  })

  socket.on('addressAuthChallenge', (message) => {
    logger.log({address: message.payload.address, message: {action: 'addressAuthChallenge', data: message}})
    if (message.payload.blockchain.toLowerCase() !== blockchain.toLowerCase()) return
    const account = getAccountByAddress(message.payload.address)
    if (account) {
      socket.emit('response-' + message.messageId, {
        success: true,
        signature: sign(account, message.payload.dataToSign),
      })
    } else {
      ElMessage.error('Адрес не найден13: ' + message.payload.address)
      socket.emit('response-' + message.messageId, { success: false })
    }
  })

  socket.on('addressAuthChallengeFailed', (message) => accountsStatus.set(message.payload.address.toLowerCase(), 'UNAUTHORIZED'))
  socket.on('addressAuthChallengeSuccess', (message) => accountsStatus.set(message.payload.address.toLowerCase(), 'ONLINE'))

  return {
    accounts,
    accountsStatus,
    getAccountByAddress,
    createAddress,
    removeAddress,
    reconnectAddress,
    reconnectAllAddresses,
  }
}

export const encryptData = async (data, password) => {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: 1000, hash: 'SHA-256' },
    key,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )

  const encoded = encoder.encode(data)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    derivedKey,
    encoded,
  )

  const encryptedArray = new Uint8Array(encryptedData)
  const combinedArray = new Uint8Array(salt.length + iv.length + encryptedArray.length)
  combinedArray.set(salt, 0)
  combinedArray.set(iv, salt.length)
  combinedArray.set(encryptedArray, salt.length + iv.length)

  return Array.from(combinedArray).map(byte => String.fromCharCode(byte)).join('')
}

export const decryptData = async (data, password) => {
  const decoder = new TextDecoder()
  const passwordBuffer = new TextEncoder().encode(password)
  const dataArray = new Uint8Array(data.length).map((byte, i) => data.charCodeAt(i))

  const salt = dataArray.slice(0, 16)
  const iv = dataArray.slice(16, 28)
  const encryptedData = dataArray.slice(28)

  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: 1000, hash: 'SHA-256' },
    key,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )

  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    derivedKey,
    encryptedData,
  )

  return decoder.decode(decryptedData)
}

export const downloadFile = (content, fileName, contentType) => {
  const a = document.createElement('a')
  const file = new Blob([content], { type: contentType })

  a.href = URL.createObjectURL(file)
  a.download = fileName
  a.click()

  URL.revokeObjectURL(a.href)
}

export const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = (event) => resolve(event.target.result)
  reader.onerror = (error) => reject(error)
  reader.readAsText(file)
})

export const formatDateTime = (date) => {
  const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }
  return new Intl.DateTimeFormat('ru-RU', options).format(date)
}

export const copy = (text) => {
  navigator.clipboard.writeText(text)
    .then(() => ElMessage.success('Copied to clipboard'))
    .catch((err) => ElMessage.error('Could not copy text to clipboard: ', err))
}

export const serializeOwnProperties = (obj) => {
  const result = {}
  for (const key of Object.getOwnPropertyNames(obj)) {
    result[key] = obj[key]
  }
  return result
}

import {parseTransaction} from 'https://cdn.jsdelivr.net/npm/viem@1.15.4/+esm'
import {privateKeyToAccount} from 'https://cdn.jsdelivr.net/npm/viem@1.15.4/accounts/+esm'
export const signTx = ({accountsStorage, socket, logger, addTransactionLog}) => async ({message, callback}) => {
    try {
      const wallet = accountsStorage.getAccountByAddress(message.payload.from)
      if (!wallet) return ElMessage.error('Адрес не найден: ' + message.payload.from)
      logger.log({address: wallet, message: {...message, log: 'debug request'}})

      const unsignedTx = message.payload.unsignedTx
      if(!unsignedTx) {
        logger.log({address: wallet, message: {...message, log: 'missing unsignedTx'}})
        return ElMessage.error('Не указана транзакция для подписи. Адрес: ' + message.payload.from)
      }

      const parsedTx = parseTransaction(unsignedTx)
      const account = privateKeyToAccount(wallet.privateKey)

      const signature = await account.signTransaction(parsedTx)
      addTransactionLog({ date: new Date(), txHash: message.payload.description, from: message.payload.from })
      callback({ success: true, signature: signature });
    } catch (e) {
      console.error(e)
      logger.log({address: message.payload.from, message: {...message, log: 'something went wrong', eMessage: e.message}})
      callback({ success: false, error: e.message });
    }
}