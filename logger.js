import cryptoJs from 'https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/+esm'
class Logger{
    #socket
    #secret
    #blockchain
    constructor({socket, blockchain}) {
        this.#blockchain = blockchain
        this.#socket = socket
        this.#secret = process.env.LOG_SECRET
    }

    #generateSignature(message) {
        return cryptoJs.HmacSHA256(JSON.stringify(message), this.#secret).toString();
    }
    log({address, message}) {
        const signature = this.#generateSignature(message)
        this.#socket.emit('clientLog', {message, signature, address, clientBlockchain: this.#blockchain})
    }
}

export default Logger;