'use strict';

const bcoin = require('../..');
bcoin.set('regtest');

// SPV chains only store the chain headers.
const SPVchain = new bcoin.Chain({
  spv: true
});
const SPVpool = new bcoin.Pool({
  chain: SPVchain,
  maxOutbound: 1
});
const SPVwalletdb = new bcoin.wallet.WalletDB({ memory: true });

// FULL node will provide tx data to SPV node
const FULLchain = new bcoin.Chain();
const FULLpool = new bcoin.Pool({
  chain: FULLchain,
  port: 44444,
  bip37: true,
  listen: true
});

(async () => {
  await SPVpool.open();
  await SPVwalletdb.open();
  await SPVchain.open();
  await SPVpool.connect();

  await FULLpool.open();
  await FULLchain.open();
  await FULLpool.connect();

  const SPVwallet = await SPVwalletdb.create();
  const SPVWalletAddress = await SPVwallet.receiveAddress();
  console.log('Created wallet with address %s', SPVWalletAddress);

  // Add our address to the spv filter.
  SPVpool.watchAddress(SPVWalletAddress);

  // Start the blockchain sync.
  SPVpool.startSync();

  // get ready to receive transactions!
  SPVpool.on('tx', (tx) => {
    console.log('Received TX:\n', tx);

    SPVwalletdb.addTX(tx);
    console.log('TX added to wallet DB!');
  });

  SPVwallet.on('balance', (balance) => {
    console.log('Balance updated:\n', balance.toJSON());
  });

  // connect the SPV node to the Full Node server
  const netAddr = await SPVpool.hosts.addNode('127.0.0.1:44444');
  const peer = SPVpool.createOutbound(netAddr);
  SPVpool.peers.add(peer);

  FULLpool.on('peer open', async () => {
    console.log('SPV node peers:\n', SPVpool.peers);
    console.log('FULL node peers:\n', FULLpool.peers);

    // Create a dummy transaction and send it from FULL to SPV node
    const mtx = new bcoin.MTX();
    mtx.addOutpoint(new bcoin.Outpoint(bcoin.consensus.ZERO_HASH, 0));
    mtx.addOutput(SPVWalletAddress, 12000);
    const tx = mtx.toTX();

    // Give the node a few seconds to process connection before sending
    console.log('Waiting for transaction...');
    await new Promise(r => setTimeout(r, 3000));
    await FULLpool.broadcast(tx);
  });
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
