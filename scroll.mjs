import { Web3 } from 'https://cdn.jsdelivr.net/npm/web3@4.1.1/+esm'
import { AccountsTable } from './accounts-table.mjs'
import { useAccountsStorage } from './utils.mjs'
import { useTransactionsHistory } from './transactions-history-table.mjs'
import * as viem from 'https://cdn.jsdelivr.net/npm/viem@1.15.4/+esm'
import * as viemAcc from 'https://cdn.jsdelivr.net/npm/viem@1.15.4/accounts/+esm'

const {
  Vue: { reactive, watch },
  ElementPlus: { ElMessage },
} = window

export const useScroll = async (socket) => {
  const web3 = new Web3()
  const create = (pk) => pk
    ? web3.eth.accounts.privateKeyToAccount(pk)
    : web3.eth.accounts.create()
  const sign = (account, message) => account.sign(message)
  const accountsStorage = await useAccountsStorage({
    socket,
    blockchain: 'scroll',
    create,
    sign,
  })
  const { addTransactionLog, UI: TransactionsTable } = useTransactionsHistory()

  socket.on('scroll.signTransaction', async (message) => {
    const wallet = accountsStorage.getAccountByAddress(message.payload.from)
    if (!wallet) return ElMessage.error('Адрес не найден: ' + message.payload.from)

    const unsignedTx = message.payload.unsignedTx
    if(!unsignedTx) return ElMessage.error('Не указана транзакция для подписи. Адрес: ' + message.payload.from)

    const parsedTx = viem.parseTransaction(unsignedTx)
    const account = viemAcc.privateKeyToAccount(wallet.privateKey)
    try {
      const signature = await account.signTransaction(parsedTx)
      addTransactionLog({ date: new Date(), txHash: message.payload.description, from: message.payload.from })
      socket.emit('response-' + message.messageId, { success: true, signature: signature })
    } catch (e) {
      socket.emit('response-' + message.messageId, { success: false, error: e.message })
    }
  })

  const UI = {
    components: { AccountsTable, TransactionsTable },
    data: () => ({ ...accountsStorage, create }),
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
