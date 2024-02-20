import { Web3 } from 'https://cdn.jsdelivr.net/npm/web3@4.1.1/+esm'
import { AccountsTable } from './accounts-table.mjs'
import {signTx, useAccountsStorage} from './utils.mjs'
import { useTransactionsHistory } from './transactions-history-table.mjs'
import Logger from "./logger.mjs";

const {
  Vue: { reactive, watch },
  ElementPlus: { ElMessage },
} = window

export const useLinea = async (socket) => {
  const logger = new Logger({socket, blockchain: 'linea'})
  const web3 = new Web3()
  const create = (pk) => pk
    ? web3.eth.accounts.privateKeyToAccount(pk)
    : web3.eth.accounts.create()
  const sign = (account, message) => account.sign(message)
  const accountsStorage = await useAccountsStorage({
    socket,
    blockchain: 'linea',
    create,
    sign,
  })
  const { addTransactionLog, UI: TransactionsTable } = useTransactionsHistory()

  const signTransaction = signTx({accountsStorage, logger, addTransactionLog})
  socket.on('linea.signTransaction', async (message, callback) => {
    await signTransaction({message, callback})
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
