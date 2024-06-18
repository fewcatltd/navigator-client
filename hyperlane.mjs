import {Web3} from 'https://cdn.jsdelivr.net/npm/web3@4.1.1/+esm'
import {AccountsTable} from './accounts-table.mjs'
import {signTx, useAccountsStorage} from './utils.mjs'
import {useTransactionsHistory} from './transactions-history-table.mjs'
import Logger from './logger.mjs'

const viem = require('viem')
const cosmJsLaunchpad = require('@cosmjs/launchpad')
const cosmJsEncoding = require('@cosmjs/encoding')
const cosmJsCosmwasmStargate = require('@cosmjs/cosmwasm-stargate')

const {
  Vue: {reactive, watch},
  ElementPlus: {ElMessage},
} = window

export const useHyperlane = async socket => {
  const logger = new Logger({socket, blockchain: 'hyperlane'})
  const web3 = new Web3()
  const create = pk =>
    pk ? web3.eth.accounts.privateKeyToAccount(pk) : web3.eth.accounts.create()
  const sign = (account, message) => account.sign(message)
  const accountsStorage = await useAccountsStorage({
    socket,
    blockchain: 'hyperlane',
    create,
    sign,
  })
  const {addTransactionLog, UI: TransactionsTable} = useTransactionsHistory()
  const signEvmTx = signTx({accountsStorage, logger, addTransactionLog})
  const signNeutrontx = async ({message: wsMessage, callback}) => {
    try {
      const evmAddress = wsMessage.payload.from
      const storageWallet = accountsStorage.getAccountByAddress(evmAddress)
      if (!storageWallet) {
        return ElMessage.error(`there is no evmAddress=${evmAddress}`)
      }
      const {gasPriceInt, message} = JSON.parse(
        wsMessage.payload.neutronPayload,
      )
      const l = message.value.msg
      message.value.msg = l.reduce((a, n, i) => {
        a[i] = n
        return a
      }, new Uint8Array(l.length))
      const neutronWallet = await cosmJsLaunchpad.Secp256k1Wallet.fromKey(
        Buffer.from(storageWallet.privateKey.slice(2), 'hex'),
        'neutron',
      )
      const rpcUrl = 'https://rpc-neutron.whispernode.com'
      const signingClient =
        await cosmJsCosmwasmStargate.SigningCosmWasmClient.connectWithSigner(
          rpcUrl,
          neutronWallet,
        )
      const neutronAddress = (await neutronWallet.getAccounts())[0].address
      const a1 = viem.bytesToBigInt(
        cosmJsEncoding.fromBech32(message.value.sender).data,
      )
      const a2 = viem.bytesToBigInt(
        cosmJsEncoding.fromBech32(neutronAddress).data,
      )
      if (a1 !== a2) {
        throw new Error(
          `sender and current addresses are not equal ` +
            `(${message.value.sender}, ${neutronAddress})`,
        )
      }
      const gas = await signingClient.simulate(neutronAddress, [message])
      const gasAmount = parseInt(gas * 1.4, 10)
      const neutronSignedTx = await signingClient.sign(
        neutronAddress,
        [message],
        {
          amount: [{denom: 'untrn', amount: gasPriceInt.toString()}],
          gas: gasAmount.toString(),
        },
      )
      neutronSignedTx.authInfoBytes = Array.from(neutronSignedTx.authInfoBytes)
      neutronSignedTx.bodyBytes = Array.from(neutronSignedTx.bodyBytes)
      neutronSignedTx.signatures = neutronSignedTx.signatures.map(l =>
        Array.from(l),
      )
      addTransactionLog({
        date: new Date(),
        txHash: wsMessage.payload.description,
        from: `${neutronAddress}/${evmAddress}`,
      })
      callback({success: true, neutronSignedTx})
    } catch (e) {
      console.error(e)
      callback({success: false, error: e.message})
    }
  }
  socket.on('hyperlane.signTransaction', async (message, callback) => {
    if (message?.payload?.neutronPayload?.length > 0) {
      return await signNeutrontx({message, callback})
    }
    await signEvmTx({message, callback})
  })
  const UI = {
    components: {AccountsTable, TransactionsTable},
    data: () => ({...accountsStorage, create}),
    template: `
      <AccountsTable
        v-bind="{
          accounts,
          accountsStatus,
          getAccountByAddress,
          createAddress,
          removeAddress,
          reconnectAddress,
          reconnectAllAddresses,
          create,
        }"
      />
      <TransactionsTable/>
    `,
  }
  return {
    UI,
    ...accountsStorage,
  }
}
