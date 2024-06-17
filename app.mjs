import io from 'https://cdn.jsdelivr.net/npm/socket.io-client@4.0.1/+esm'
import * as viem from 'https://cdn.jsdelivr.net/npm/viem@1.15.4/+esm'

const {ipcRenderer} = require('electron')

import {useAuth} from './auth.mjs'
import * as utils from './utils.mjs'
import {useZora} from './zora.mjs'
import {useZkSync} from './zksync.mjs'
import {useScroll} from './scroll.mjs'
import {useLinea} from './linea.mjs'
import {useBase} from './base.mjs'
import {useHyperlane} from './hyperlane.mjs'

const cosmJsEncoding = require('@cosmjs/encoding')
const packageJson = require('./package.json')

const {createApp, ref} = window.Vue

const SOCKET_SERVER_URL_DEFAULT =
  `https://fewcats.com/?version=` + packageJson.version
const SOCKET_SERVER_URL =
  process.env.SOCKET_SERVER_URL || SOCKET_SERVER_URL_DEFAULT

window.debug = {
  vars: {SOCKET_SERVER_URL, cosmJsEncoding, viem},
  envs: {SOCKET_SERVER_URL: process.env.SOCKET_SERVER_URL},
}

const isConnected = ref(false)
const isUpdateAvailable = ref(false)
const isUpdateDownloaded = ref(false)

const socket = io(SOCKET_SERVER_URL)
socket.on('connect', () => {
  isConnected.value = true
})
socket.on('disconnect', () => {
  isConnected.value = false
})
socket.on('error', () => {
  console.log('Error from server', 'SocketID:', socket.id)
  socket.disconnect()
  setTimeout(() => {
    socket.connect()
  }, 5000)
})

ipcRenderer.on('update_available', () => {
  isUpdateAvailable.value = true
})

ipcRenderer.on('update_downloaded', () => {
  isUpdateDownloaded.value = true
})

ipcRenderer.on('version', (event, version) => {
  window.VERSION = version
  document.querySelector('.Version').innerHTML = 'Version: ' + version
})
let workspaceInstance = null
const WorkspaceUI = {
  async setup() {
    if (workspaceInstance) return workspaceInstance
    const activeBlockchainTab = utils.useLocalStorageRef(
      'active-blockchain-tab',
      'zora',
    )
    const zora = await useZora(socket)
    const zkSync = await useZkSync(socket)
    const scroll = await useScroll(socket)
    const linea = await useLinea(socket)
    const base = await useBase(socket)
    const hyperlane = await useHyperlane(socket)
    workspaceInstance = {
      ZoraUI: zora.UI,
      ZkSyncUI: zkSync.UI,
      ScrollUI: scroll.UI,
      LineaUI: linea.UI,
      BaseUI: base.UI,
      HyperlaneUI: hyperlane.UI,
      activeBlockchainTab,
    }

    return workspaceInstance
  },
  template: `
    <div class="WorkspaceView" style="margin-top: 50px;">
      <h2>Добро пожаловать в Airdrop Navigator!</h2>
      <el-tabs v-model="activeBlockchainTab">
        <el-tab-pane label="Zora" name="zora">
          <component :is="ZoraUI"/>
        </el-tab-pane>
        <el-tab-pane label="Zk-Sync" name="zkSync">
          <component :is="ZkSyncUI"/>
        </el-tab-pane>
        <el-tab-pane label="Scroll" name="Scroll">
          <component :is="ScrollUI"/>
        </el-tab-pane>
        <el-tab-pane label="Linea" name="Linea">
          <component :is="LineaUI"/>
        </el-tab-pane>
        <el-tab-pane label="Base" name="Base">
          <component :is="BaseUI"/>
        </el-tab-pane>
        <el-tab-pane label="Hyperlane" name="Hyperlane">
          <component :is="HyperlaneUI"/>
        </el-tab-pane>
      </el-tabs>
    </div>
  `,
}

const app = createApp({
  setup() {
    const auth = useAuth(socket)
    return {
      AuthUI: auth.UI,
      WorkspaceUI,
      isConnected,
      isAuthorized: auth.isAuthorized,
    }
  },
  data() {
    return {
      isUpdateAvailable,
      isUpdateDownloaded,
    }
  },
  methods: {
    restartApp() {
      ipcRenderer.send('restart_app')
    },
  },
  template: `
    <div>
      <div v-if="isUpdateAvailable" class="update-notification">
      <el-alert 
        title="Доступно новое обновление!" 
        type="info"
        description="Обновление будет установлено после перезагрузки."
        :closable="false"
        show-icon>
      </el-alert>
      <el-button 
        @click="restartApp"
        type="primary"
        :disabled="!isUpdateDownloaded"
        style="margin-top: 10px;">
        Перезагрузить
      </el-button>
    </div>
      <div v-if="!isAuthorized" class="AuthView">
        <component :is="AuthUI"/>
      </div>
      <div v-else-if="!isConnected" class="ConnectingView">
        <h2 class="PageTitle">Подключение к серверу...</h2>
      </div>
      <suspense v-else>
        <component :is="WorkspaceUI"/>
      </suspense>
    </div>
  `,
})

app.use(window.ElementPlus)
Object.entries(window.ElementPlusIconsVue).map(([key, value]) =>
  app.component(key, value),
)
app.mount('#app')

class ListenDoubleClicks {
  #pressedKeys
  #callbacks

  constructor(callbacks) {
    this.#pressedKeys = {}
    this.#callbacks = callbacks
  }

  initialize = () => {
    document.addEventListener('keydown', this.#handleKeyDown)
  }

  #handleKeyDown = event => {
    const code = event.code
    const now = Date.now()
    if (!(code in this.#pressedKeys)) {
      this.#pressedKeys[code] = now
      return
    }
    const ts = this.#pressedKeys[code]
    if (now - ts > 1000) {
      this.#pressedKeys[code] = now
      return
    }
    delete this.#pressedKeys[code]
    const key = `${code}-${code}`
    if (!(key in this.#callbacks)) {
      return
    }
    this.#callbacks[key]()
  }
}

window.addEventListener('load', () => {
  const handleKK = () => ipcRenderer.send('open-dev-tools')
  // eslint-disable-next-line no-console
  console.debug('added k+k listener')
  new ListenDoubleClicks({'KeyK-KeyK': handleKK}).initialize()
})
