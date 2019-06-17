/*!
 * minipeer.js - in-memory peer object for bcoin testing
 * Copyright (c) 2019, Matthew Zipkin (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const EventEmitter = require('events');
const tcp = require('btcp');
const Parser = require('../../lib/net/parser');
const Framer = require('../../lib/net/framer');
const packets = require('../../lib/net/packets');

class MiniPeer extends EventEmitter {
  constructor(options) {
    super();

    this.network = options.network;

    this.server = tcp.createServer();
    this.socket = null;
    this.host = '127.0.0.1';
    this.port = 60000;

    this.parser = new Parser(this.network);
    this.framer = new Framer(this.network);
    this.packets = [];
  }

  async open() {
    await this.server.listen(this.port, this.host);

    this.server.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    this.parser.on('packet', (packet) => {
      if (packet.type !== packets.types.PING)
        this.packets.push(packet);
    });
  }

  handleConnection(socket) {
    this.socket = socket;
    this.socket.on('data', (data) => {
      this.parser.feed(data);
    });
  }

  packetWaiter() {
    return new Promise((resolve) => {
      this.parser.once('packet', (packet) => {
        if (packet.type !== packets.types.PING)
          resolve();
      });
    });
  }

  send(packet) {
    const payload = this.framer.packet(packet.cmd, packet.toRaw());
    this.socket.write(payload);
  }

  async close() {
    this.socket.destroy();
    this.socket = null;
    await this.server.close();
  }
}

module.exports = MiniPeer;
