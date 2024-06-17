const {notarize} = require('@electron/notarize')

require('dotenv').config()

exports.default = async function notarizing(context) {
  const {electronPlatformName, appOutDir} = context
  if (electronPlatformName !== 'darwin') {
    return undefined
  }
  const appName = context.packager.appInfo.productFilename
  return await notarize({
    appBundleId: 'airdrop.navigator.id',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: 'dokotov@gmail.com',
    appleIdPassword: '@keychain:Electron Notarization Password',
    teamId: '29KC6J33QQ',
  })
}
