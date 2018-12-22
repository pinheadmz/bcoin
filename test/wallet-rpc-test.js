/* eslint-env mocha */
/* eslint prefer-arrow-callback: "off" */

'use strict';

const assert = require('./util/assert');
const {rimraf, sleep} = require('./util/common');

const {
  initFullNode,
  initSPVNode,
  initNodeClient,
  initWalletClient,
  initWallet,
  generateInitialBlocks
} = require('./util/regtest');

const testPrefix = '/tmp/bcoin-fullnode';
const spvTestPrefix = '/tmp/bcoin-spvnode';
const genesisTime = 1534965859;

const ports = {
  full: {
    p2p: 49331,
    node: 49332,
    wallet: 49333
  },
  spv: {
    p2p: 49431,
    node: 49432,
    wallet: 49433
  }
};

describe('Wallet RPC', function() {
  this.timeout(60000);

  let node, spvnode, wallet = null;
  let nclient, wclient, spvwclient = null;
  let coinbase = null;

  before(async () => {
    await rimraf(testPrefix);
    await rimraf(spvTestPrefix);

    node = await initFullNode({
      ports,
      prefix: testPrefix,
      logLevel: 'none'
    });

    spvnode = await initSPVNode({
      ports,
      prefix: spvTestPrefix,
      logLevel: 'none'
    });

    nclient = await initNodeClient({ports: ports.full});
    wclient = await initWalletClient({ports: ports.full});
    spvwclient = await initWalletClient({ports: ports.spv});
    wallet = await initWallet(wclient);
    await initWallet(spvwclient);

    await wclient.execute('selectwallet', ['test']);
    coinbase = await wclient.execute('getnewaddress', ['blue']);

    await spvwclient.execute('selectwallet', ['test']);

    await generateInitialBlocks({
      nclient,
      wclient,
      spvwclient,
      coinbase,
      genesisTime,
      blocks: 125,
      count: 1
    });

    // TODO remove this
    await sleep(1000);
  });

  after(async () => {
    await wallet.close();
    await wclient.close();
    await spvwclient.close();
    await nclient.close();
    await node.close();
    await spvnode.close();
  });

  describe('full node', function() {
    describe('getreceivedbyaccount', function() {
      it('will get the correct balance', async () => {
        const bal = await wclient.execute('getreceivedbyaccount',
                                          ['blue']);
        assert.strictEqual(bal, 6250.0004086);
      });
    });

    describe('getreceivedbyaddress', function() {
      it('will get the correct balance', async () => {
        const bal = await wclient.execute('getreceivedbyaddress',
                                          [coinbase]);
        assert.strictEqual(bal, 6250.0004086);
      });
    });

    describe('listreceivedbyaccount', function() {
      it('will get expected number of results', async () => {
        const res = await wclient.execute('listreceivedbyaccount');
        assert.strictEqual(res.length, 2);
      });
    });

    describe('listreceivedbyaddress', function() {
      it('will get expected number of results', async () => {
        const res = await wclient.execute('listreceivedbyaddress');
        assert.strictEqual(res.length, 10);
      });
    });

    describe('listsinceblock', function() {
      it('will get expected number of results', async () => {
        const res = await wclient.execute('listsinceblock');
        assert.strictEqual(res.transactions.length, 2);
      });
    });
  });

  describe('spv node', function() {
    describe('getreceivedbyaccount', function() {
      it('will get the correct balance', async () => {
        const bal = await spvwclient.execute('getreceivedbyaccount',
                                             ['blue']);
        assert.strictEqual(bal, 0.99999999);
      });
    });

    describe('getreceivedbyaddress', function() {
      it('will get the correct balance', async () => {
        const bal = await spvwclient.execute('getreceivedbyaddress',
                                             [coinbase]);
        assert.strictEqual(bal, 0);
      });
    });

    describe('listreceivedbyaccount', function() {
      it('will get expected number of results', async () => {
        const res = await spvwclient.execute('listreceivedbyaccount');
        assert.strictEqual(res[0].account, 'blue');
      });
    });

    describe('listreceivedbyaddress', function() {
      it('will get expected number of results', async () => {
        const res = await spvwclient.execute('listreceivedbyaddress');
        assert.strictEqual(res.length, 9);
      });
    });

    describe('listsinceblock', function() {
      it('will get expected number of results', async () => {
        const res = await spvwclient.execute('listsinceblock');
        assert.strictEqual(res.transactions.length, 1);
      });
    });
  });
});
