const path = require('path')

const {app, BrowserWindow, ipcMain} = require('electron')
const {updateElectronApp} = require('update-electron-app')

const packageJson = require('./package.json')

let mainWindow

if (require('electron-squirrel-startup')) {
  app.quit()
}

function createWindow() {
  if (require('electron-squirrel-startup')) {
    return
  }
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'resources/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  mainWindow.loadFile('index.html')
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('version', packageJson.version)
  })
  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', () => {
  updateElectronApp()
  return createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.on('open-dev-tools', () => {
  if (!mainWindow) {
    return
  }
  mainWindow.webContents.openDevTools()
})
