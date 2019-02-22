Welcome to the bcoin docs!

## Getting Started
- [Getting Started](Beginner's-Guide.md)
- [Configuration](Configuration.md)
- [Wallet System](Wallet-System.md)
- [Design](Design.md)
- [Guides](https://bcoin.io/guides.html)

## Running
- [Bcoin CLI](CLI.md)
- [Running in the Browser](https://bcoin.io/guides/browser.html)
- [REST and RPC API](https://bcoin.io/api-docs/index.html#introduction)

## Code Examples

These code examples are designed to demonstrate how to integrate bcoin modules
with minimal configuration. They can all be run from the command line without
interaction and produce some kind of meaningful output. All examples run in
memory (including databases) to keep the user's disk clean. They mostly run in
`regtest` mode with a few that connect to the live `main` or `testnet` networks.
Scripts will either terminate on their own or can be canceled with `ctrl-c`.

Example usage, unless otherwise specified:

```
$ node Examples/wallet.js
```

- [Simple Fullnode](Examples/fullnode.js) -
Creates a `FullNode` object and connects to `testnet`. Prints out blocks as they
are loaded from peers and added to the chain. When completely synced, will begin
to print out transactions as they are added to the mempool.

- [Connect to Peer](Examples/connect-to-peer.js) -
Connects to a user-defined peer in `regtest` mode. Prints out packets received
from that peer and decodes `block` packets. Requires launching a local `regtest`
node first:

```
$ bcoin --network=regtest --daemon
$ node Examples/connect-to-peer.js 127.0.0.1:48444
```

- [Connecting to the P2P Network](Examples/connect-to-the-p2p-network.js) -
Creates `chain`, `pool`, and `mempool` objects for both main and testnet networks.
Syncs to both networks (at the same time!) and prints out blocks as they are
synced (in red for main and green for testnet).

- [Creating a Blockchain and Mempool](Examples/create-a-blockchain-and-mempool.js) -
Creates a blockchain and mempool, then mines a block from the mempool to the chain.

- [Wallet with Dummy TX](Examples/wallet.js) -
Creates a wallet database and a "dummy" transaction to the wallet's address. TX
is added to wallet and `tx` event is caught.

- [SPV Sync](Examples/spv-sync-wallet.js) -
Effectively creates two nodes: one FULL and one SPV. Connects the SPV node to the
FULL node, and prints the peer info. After a pause, a transaction matching the SPV
node's bloom filter is broadcast by the FULL node to the SPV peer.

- [Plugin Example](Examples/peers-plugin.js) -
Demonstrates the `plugin` feature of bcoin's `node` object. Example plugin returns
the number of peers, after the node connects to the `testnet` network.

- [Client API Usage](Examples/client-api.js) -
Demonstrates usage of the client API [bclient](https://github.com/bcoin-org/bclient).
The code uses direct endpoint requests, but comments in the code indicate the more
convenient API calls (see the docs at https://bcoin.io/api-docs/).
The script returns wallet and node server information, sends a transaction, and
reports the wallet balance.

- [Miner with WorkerPool](Examples/miner-configs.js) -
Creates a regtest `chain` and `miner`, which mines a block using workers
(a `child_process` that searches the nonce space in a parallel thread).

- [Create and Sign TX](Examples/create-sign-tx.js) -
Demonstrates how to use `mtx` and `keyring` modules to sign a transaction.

- [Get Transaction from Chain](Examples/get-tx-from-chain.js) -
Connects to live testnet network and syncs the first 1000 blocks with indexing
active. Demonstrates how to request tx by hash from the chain database, and retrieve
blocks.

- [Create Watch Only Wallet](Examples/watch-only-wallet.js) -
Derives a BIP32 Extended Public Key from a mnemonic phrase, and imports that `xpub`
into a new watch-only wallet that can derive addresses.
