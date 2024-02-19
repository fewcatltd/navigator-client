import cryptoJs from 'https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/+esm'
class Logger{
    #socket
    #blockchain
    constructor({socket, blockchain }) {
        this.#blockchain = blockchain
        this.#socket = socket
    }

    log({address, message}) {
        this.#socket.emit('clientLog', {message, address, blockchain: this.#blockchain})
    }
}

export default Logger;