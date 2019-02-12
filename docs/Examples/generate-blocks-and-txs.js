'use strict';

const bcoin = require('bcoin');
const client = require('bclient');
const network = bcoin.Network.get('regtest');

const walletClient = new client.WalletClient({
  port: network.walletPort
});

const nodeClient = new client.NodeClient({
  port: network.rpcPort
});

(async () => {
  const feeRate = network.minRelay * 10;

  // Initial blocks mined to
  // wallet/account primary/default then evenly disperses
  // all funds to other wallet accounts
  const numInitBlocks = 300; 

  const numTxBlocks = 10; // How many blocks to randomly fill with txs
  const numTxPerBlock = 10; // How many txs to try to put in each block

  const maxOutputsPerTx = 4; // Each tx will have a random # of outputs
  const minSend = 50000; // Each tx output will have a random value
  const maxSend = 100000;

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
  const minerReceive = await primary.createAddress('default');

  await nodeClient.execute('generatetoaddress', [numInitBlocks, minerReceive.address]);  

  console.log('Air-dropping funds to the people...');
  const balance = await primary.getBalance('default');

  // hack the available balance bc of coinbase maturity
  const totalAmt = balance.confirmed * 0.25;
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
  await nodeClient.execute('generatetoaddress', [1, minerReceive.address]);  

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
  await nodeClient.execute('generatetoaddress', [1, minerReceive.address]);  
  }

  console.log('All done! Go play.');
})();
