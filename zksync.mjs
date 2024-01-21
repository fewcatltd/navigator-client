import {Web3} from 'https://cdn.jsdelivr.net/npm/web3@4.1.1/+esm'
import {AccountsTable} from './accounts-table.mjs'
import {signTransactionHandler, signTransactionHandler_v2, useAccountsStorage} from './utils.mjs'
import {useTransactionsHistory} from './transactions-history-table.mjs'
import {parseTransaction} from 'https://cdn.jsdelivr.net/npm/viem@2.4.0/+esm'
import {privateKeyToAccount} from 'https://cdn.jsdelivr.net/npm/viem@2.4.0/accounts/+esm'

const {
    Vue: {reactive, watch},
    ElementPlus: {ElMessage},
} = window

export const useZkSync = async (socket) => {
    const web3 = new Web3()
    const create = (pk) => pk
        ? web3.eth.accounts.privateKeyToAccount(pk)
        : web3.eth.accounts.create()
    const sign = (account, message) => account.sign(message)
    const accountsStorage = await useAccountsStorage({
        socket,
        blockchain: 'zksync',
        create,
        sign,
    })
    const {UI: TransactionsTable} = useTransactionsHistory()

    socket.on('zksync.signTransaction', signTransactionHandler(accountsStorage, socket))
    socket.on('zksync_signTransaction', signTransactionHandler_v2(accountsStorage))

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
