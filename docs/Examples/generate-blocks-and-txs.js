'use strict';

const bcoin = require('../..');
const client = require('bclient');
const plugin = bcoin.wallet.plugin;
const network = bcoin.Network.get('regtest');

bcoin.consensus.COINBASE_MATURITY = 0;

const node = new bcoin.FullNode({
  network: 'regtest',
  db: 'memory'
});

node.use(plugin);

const miner = node.miner;

const walletClient = new client.WalletClient({
  port: network.walletPort
});

const nodeClient = new client.NodeClient({
  port: network.rpcPort
});

(async () => {
  await node.open();

  const feeRate = network.minRelay * 10;

  // Initial blocks mined to
  // wallet/account primary/default then evenly disperses
  // all funds to other wallet accounts
  const numInitBlocks = 100;

  const numTxBlocks = 10; // How many blocks to randomly fill with txs
  const numTxPerBlock = 10; // How many txs to try to put in each block

  const maxOutputsPerTx = 4; // Each tx will have a random # of outputs
  const minSend = 50000; // Each tx output will have a random value
  const maxSend = 100000;

  // We are going to bend time, and start our blockchain in the past!
  let virtualNow = network.now() - 60 * 10 * (numInitBlocks + numTxBlocks + 1);
  const blockInterval = 60 * 10; // ten minutes

  const walletNames = [
    'Powell',
    'Yellen',
    'Bernanke',
    'Greenspan',
    'Volcker',
    'Miller',
    'Burns',
    'Martin',
    'McCabe',
    'Eccles'
  ];

  const accountNames = ['hot', 'cold'];

  const wallets = [];

  const mineRegtestBlockToPast = async function(coinbaseAddr) {
    const entry = await node.chain.getEntry(node.chain.tip.hash);
    const job = await node.miner.createJob(entry, coinbaseAddr);
    job.attempt.time = virtualNow;
    virtualNow += blockInterval;
    job.refresh();
    const block = await job.mineAsync();
    await node.chain.add(block);
  };

  console.log('Creating wallets and accounts...');
  for (const wName of walletNames) {
    try {
      const wwit = Boolean(Math.random() < 0.5);
      await walletClient.createWallet(
        wName,
        {
          witness: wwit
        }
      );

      const newWallet = await walletClient.wallet(wName);
      wallets.push(newWallet);

      for (const aName of accountNames) {
        const awit = Boolean(Math.random() < 0.5);
        await newWallet.createAccount(
          aName,
          {
            witness: awit
          }
        );
      }
    } catch (e) {
      console.log(`Error creating wallet ${wName}:`, e.message);
    }
  }

  if (!wallets.length) {
    console.log('No wallets created, likely this script has already been run');
    return;
  }
  accountNames.push('default');

  console.log('Mining initial blocks...');
  const primary = walletClient.wallet('primary');
  const addrObject = await primary.createAddress('default');
  const minerReceive = addrObject.address;
  for (let i = 0; i < numInitBlocks; i++) {
    await mineRegtestBlockToPast(minerReceive);
  }

  console.log('Air-dropping funds to the people...');
  const balance = await primary.getBalance('default');

  const totalAmt = balance.confirmed;
  const amtPerAcct = Math.floor(
    totalAmt / (walletNames.length * accountNames.length)
  );
  const outputs = [];
  for (const wallet of wallets) {
    for (const aName of accountNames) {
      const recAddr = await wallet.createAddress(aName);
      outputs.push({
        value: amtPerAcct,
        address: recAddr.address
      });
    }
  }

  await primary.send({
    outputs: outputs,
    rate: feeRate,
    subtractFee: true
  });

  console.log('Confirming airdrop...');
  await mineRegtestBlockToPast(minerReceive);

  console.log('Creating a big mess!...');
  for (let b = 0; b < numTxBlocks; b++) {
    for (let t = 0; t < numTxPerBlock; t++) {
      // Randomly select recipients for this tx
      const outputs = [];
      const numOutputs = Math.floor(Math.random() * maxOutputsPerTx) + 1;
      for (let o = 0; o < numOutputs; o++) {
        const recWallet = wallets[Math.floor(Math.random() * wallets.length)];
        const recAcct =
          accountNames[Math.floor(Math.random() * accountNames.length)];
        const recAddr = await recWallet.createAddress(recAcct);
        const value = Math.floor(
          Math.random() * (maxSend - minSend) + minSend / numOutputs
        );
        outputs.push({
          value: value,
          address: recAddr.address
        });
      }

      // Randomly choose a sender for this tx
      const sendWallet = wallets[Math.floor(Math.random() * wallets.length)];
      const sendAcct = accountNames[Math.floor(Math.random() * wallets.length)];
      try {
        const tx = await sendWallet.send({
          account: sendAcct,
          outputs: outputs,
          rate: feeRate,
          subtractFee: true
        });
      } catch (e) {
        console.log(`Problem sending tx: ${e}`);
      }
    }

    // CONFIRM
    await mineRegtestBlockToPast(minerReceive);
  }

  console.log('All done! Go play.');
})();
