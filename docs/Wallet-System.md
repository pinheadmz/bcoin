## Notes on wallet system

Bcoin maintains a wallet database which contains every wallet. Wallets are _not
usable_ without also using a wallet database. For testing, the wallet database
can be in-memory, but it must be there.

Wallets in bcoin are based on BIP44. They also originally supported BIP45 for
multisig, but support was removed to reduce code complexity, and also because BIP45
doesn't seem to add any benefit in practice.

The wallet database can contain many wallets, with many accounts, with many
addresses for each account. Bcoin should theoretically be able to scale to
hundreds of thousands of wallets/accounts/addresses.

### Deviation from strict BIP44

Each account can be of a different type. You could have a pubkeyhash account,
a multisig account, and a witness pubkeyhash account all in the same wallet.
Accounts can be configured with or without Segregated Witness and both base58
(nested-in-P2SH) and bech32 (native) P2WPKH addresses can be derived from the
same account.

Bcoin adds a third branch to each account for nested SegWit addresses.
Branch `0` and `1` are for `receive` and `change` addresses respectively (which
is BIP44 standard) but branch `2` is used by bcoin to derive
[nested SegWit addresses.](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki#P2WPKH_nested_in_BIP16_P2SH)

Unlike strict BIP44, bcoin allows empty wallet accounts to exist. This may be
convenient to an enterprise system that matches wallet accounts with users, but
developers must be aware that there is no deterministic method for recovering
BIP44 wallets with empty (unused) accounts. A counter of used accounts must be
recorded outside the wallet so the right number of accounts is re-generated
during recovery from seed phrase.

Accounts in a bcoin wallet can also be configured for multisig and import xpubs
from cosigners. Externally-generated Extended Private Keys (`xpriv`) and non-HD
single address private keys can all be imported into a bcoin wallet. Balances
of those addresses can be watched as well spent from (in the case of a private
key).

Because of these deviations from the standard, it is recommended to backup the
wallet database any time any key of any type is imported. The database is located
by default at `~/.bcoin/wallet` for main net or `~/.bcoin/<network>/wallet` for
others. The RPC calls `dumpwallet` and `dumpprivkey` are also available for exporting
private keys.

### Accounts

Note that accounts should not be accessed directly from the public API. They do
not have locks which can lead to race conditions during writes.
