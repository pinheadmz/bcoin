/* eslint-env mocha */
/* eslint prefer-arrow-callback: "off" */

'use strict';

const assert = require('bsert');
const Chain = require('../lib/blockchain/chain');
const BlockStore = require('../lib/blockstore/level');
const Pool = require('../lib/net/pool');
const packets = require('../lib/net/packets');
const Miner = require('../lib/mining/miner');
const NetAddress = require('../lib/net/netaddress');
const Network = require('../lib/protocol/network');
const MiniPeer = require('./util/minipeer');

const network = Network.get('regtest');

let blocks, chain, miner, pool, minipeer;
describe('P2P', function() {
  before(async () => {
    blocks = new BlockStore({
      memory: true,
      network
    });

    chain = new Chain({
      memory: true,
      blocks,
      network
    });

    miner = new Miner({
      chain,
      version: 4
    });

    pool = new Pool({
      chain,
      network
    });

    pool.packetWaiter = () => {
      return new Promise((resolve) => {
        pool.once('packet', (packet) => {
          if (packet.type !== packets.types.PING)
            resolve();
        });
      });
    };

    minipeer = new MiniPeer({
      network
    });

    await blocks.open();
    await chain.open();
    await miner.open();

    await pool.open();
    await pool.connect();
    await pool.startSync();

    await minipeer.open();
  });

  after(async () => {
    await minipeer.close();

    await blocks.close();
    await chain.close();
    await miner.close();
    await pool.close();
  });

  it('should connect to minipeer and initialize sync', async() => {
    // Version Handshake reference: https://en.bitcoin.it/wiki/Version_Handshake

    // connect
    let mpWaiter = minipeer.packetWaiter();
    const addr = new NetAddress({
      host: minipeer.host,
      port: minipeer.port
    });
    const peer = pool.createOutbound(addr);
    pool.peers.add(peer);

    // wait for version packet
    await(mpWaiter);
    let pkt = minipeer.packets.shift();
    assert.equal(pkt.cmd, 'version');
    assert.equal(pkt.type, packets.types.VERSION);
    assert(!peer.handshake);

    // send a version back
    let poolWaiter = pool.packetWaiter();
    minipeer.send(new packets.VersionPacket());
    await(poolWaiter);
    assert.strictEqual(peer.version, pkt.version);
    assert(!peer.handshake);

    // send a verack back
    poolWaiter = pool.packetWaiter();
    mpWaiter = minipeer.packetWaiter();
    minipeer.send(new packets.VerackPacket());
    await(poolWaiter);
    assert(peer.ack);
    assert(!peer.handshake);

    // wait for verack
    await(mpWaiter);
    pkt = minipeer.packets.shift();
    assert.equal(pkt.cmd, 'verack');
    assert.equal(pkt.type, packets.types.VERACK);
    assert(peer.handshake);

    // Now that handshake is complete, handleOpen() is called to start sync
    // 1. No AddrPacket in regtest

    // 2. Prefer compact blocks
    assert(pool.options.compact);
    pkt = minipeer.packets.shift();
    assert.equal(pkt.cmd, 'sendcmpct');
    assert.equal(pkt.type, packets.types.SENDCMPCT);

    // 3. Request more peer addresses
    pkt = minipeer.packets.shift();
    assert.equal(pkt.cmd, 'getaddr');
    assert.equal(pkt.type, packets.types.GETADDR);

    // 4. No SPV filter for full node

    // 5. Nothing to broadcast right after launching

    // 6. No fee rate set by default

    // 7. Start syncing the chain!
    pkt = minipeer.packets.shift();
    assert.equal(pkt.cmd, 'getblocks');
    assert.equal(pkt.type, packets.types.GETBLOCKS);

    // minipeer is the only peer, it's the loader peer
    assert(peer.loader);
  });
});
