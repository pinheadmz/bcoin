Bcoin ships with [bclient](https://github.com/bcoin-org/bclient)
as its default HTTP client for command line access.

See the full API docs at https://bcoin.io/api-docs

The most important thing to remember about the bcoin API is that there are
effectively four total domains: There are separate servers for both node and wallet,
and each of those has both REST HTTP API endpoints and JSON-RPC API endpoints.

### Examples: passing arguments

Store network name and API key in environment variables:

```bash
$ export BCOIN_API_KEY=hunter2
$ export BCOIN_NETWORK=testnet
```

bcoin will read the environment variables on launch...

```bash
$ bcoin --daemon
```

...and so will the CLI:

```bash
$ bcoin-cli info
```

Or they can be passed as command-line arguments:

```bash
$ bcoin-cli --network=testnet --api-key=hunter2 info
```

### Examples: Common node commands

```bash
# View the genesis block
$ bcoin-cli block 0

# View the mempool
$ bcoin-cli mempool

# Execute an RPC command to list network peers
$ bcoin-cli rpc getpeerinfo
```

### Examples: Common wallet commands

```bash
# View primary wallet
$ bwallet-cli get

# View transaction history
$ bwallet-cli history

# Send a transaction
$ bwallet-cli send <address> 0.01

# View balance
$ bwallet-cli balance

# Derive new address
$ bwallet-cli address

# Create a new account
$ bwallet-cli account create foo

# Send from account
$ bwallet-cli send <address> 0.01 --account=foo
```

### Get more help

```bash
$ bcoin-cli help
$ bcoin-cli rpc help
$ bwallet-cli help
$ bwallet-cli rpc help
```