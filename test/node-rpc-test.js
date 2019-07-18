/* eslint-env mocha */
/* eslint prefer-arrow-callback: "off" */

'use strict';

const assert = require('bsert');
const FullNode = require('../lib/node/fullnode');
const Address = require('../lib/primitives/address');
const TX = require('../lib/primitives/tx');

const ports = {
  p2p: 49331,
  node: 49332,
  wallet: 49333
};

const node = new FullNode({
  network: 'regtest',
  apiKey: 'foo',
  walletAuth: true,
  memory: true,
  workers: true,
  workersSize: 2,
  plugins: [require('../lib/wallet/plugin')],
  port: ports.p2p,
  httpPort: ports.node,
  env: {
    'BCOIN_WALLET_HTTP_PORT': ports.wallet.toString()
  }});

const {NodeClient} = require('bclient');

const nclient = new NodeClient({
  port: ports.node,
  apiKey: 'foo',
  timeout: 15000
});

describe('RPC', function() {
  this.timeout(15000);

  before(async () => {
    await node.open();
  });

  after(async () => {
    await node.close();
  });

  it('should rpc help', async () => {
    assert(await nclient.execute('help', []));

    await assert.rejects(async () => {
      await nclient.execute('help', ['getinfo']);
    }, {
      name: 'Error',
      message: /^getinfo/
    });
  });

  it('should rpc getinfo', async () => {
    const info = await nclient.execute('getinfo', []);
    assert.strictEqual(info.blocks, 0);
  });

  describe('createrawtransaction', function() {
    const txid0 = Buffer.alloc(32, 8).toString('hex');
    const vout0 = 9;
    const addr0 = new Address();
    const value0 = 120000;
    const locktime = 1563489605;

    it('should create a tx with default sequence', async() => {
      const txHex = await nclient.execute(
        'createrawtransaction',
        [
          [{txid: txid0, vout: vout0}],
          {[addr0.toString('regtest')]:  value0}
        ]);

      const tx = TX.fromRaw(Buffer.from(txHex, 'hex'));

      assert.strictEqual(tx.inputs.length, 1);
      assert.bufferEqual(tx.inputs[0].prevout.hash, txid0);
      assert.strictEqual(tx.inputs[0].prevout.index, vout0);
      assert.strictEqual(tx.inputs[0].sequence, 0xffffffff);

      assert.strictEqual(tx.outputs.length, 1);
      assert.strictEqual(tx.outputs[0].value, value0 * 1e8);
      assert.deepStrictEqual(tx.outputs[0].getAddress(), addr0);
    });

    it('should create a tx with locktime', async() => {
      const txHex = await nclient.execute(
        'createrawtransaction',
        [
          [{txid: txid0, vout: vout0}],
          {[addr0.toString('regtest')]:  value0},
          locktime
        ]);

      const tx = TX.fromRaw(Buffer.from(txHex, 'hex'));

      assert.strictEqual(tx.locktime, locktime);

      assert.strictEqual(tx.inputs.length, 1);
      assert.bufferEqual(tx.inputs[0].prevout.hash, txid0);
      assert.strictEqual(tx.inputs[0].prevout.index, vout0);
      assert.strictEqual(tx.inputs[0].sequence, 0xfffffffe);

      assert.strictEqual(tx.outputs.length, 1);
      assert.strictEqual(tx.outputs[0].value, value0 * 1e8);
      assert.deepStrictEqual(tx.outputs[0].getAddress(), addr0);
    });

    it('should create a tx with opt-in RBF', async() => {
      const txHex = await nclient.execute(
        'createrawtransaction',
        [
          [{txid: txid0, vout: vout0}],
          {[addr0.toString('regtest')]:  value0},
          locktime,
          true
        ]);

      const tx = TX.fromRaw(Buffer.from(txHex, 'hex'));

      assert.strictEqual(tx.locktime, locktime);

      assert.strictEqual(tx.inputs.length, 1);
      assert.bufferEqual(tx.inputs[0].prevout.hash, txid0);
      assert.strictEqual(tx.inputs[0].prevout.index, vout0);
      assert.strictEqual(tx.inputs[0].sequence, 0xfffffffd);

      assert.strictEqual(tx.outputs.length, 1);
      assert.strictEqual(tx.outputs[0].value, value0 * 1e8);
      assert.deepStrictEqual(tx.outputs[0].getAddress(), addr0);

      assert(tx.isRBF());
    });

    it('should reject a tx with conflicting sequence', async() => {
      await assert.rejects(async() => {
        await nclient.execute(
          'createrawtransaction',
          [
            [{txid: txid0, vout: vout0, sequence: 0xffff0000}],
            {[addr0.toString('regtest')]:  value0},
            locktime,
            false
          ]);
      }, {
        name: 'Error',
        message: 'Sequence conflicts with replaceability.'
      });
    });
  });
});
