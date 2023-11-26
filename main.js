const { app, BrowserWindow } = require('electron')
const { autoUpdater } = require('electron-updater');

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  // Load your index.html file
  win.loadFile('index.html')

  // Проверка обновлений
  autoUpdater.checkForUpdatesAndNotify();

  // Обработка событий обновления
  autoUpdater.on('update-available', () => {
    console.log('Update available.');
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded; will install in 5 seconds');
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 5000);
  });
}

app.whenReady().then(createWindow)
