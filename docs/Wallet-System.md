## Notes on wallet system

Bcoin maintains a wallet database which contains every wallet. Wallets are _not
usable_ without also using a wallet database. For testing, the wallet database
can be in-memory, but it must be there.

Wallets in bcoin are based on BIP44. They also originally supported bip45 for
multisig, but support was removed to reduce code complexity, and also because BIP45
doesn't seem to add any benefit in practice.

The wallet database can contain many different wallets, with many different
accounts, with many different addresses for each account. Bcoin should
theoretically be able to scale to hundreds of thousands of
wallets/accounts/addresses.

Each account can be of a different type. You could have a pubkeyhash account,
as well as a multisig account, a witness pubkeyhash account, etc. This is where
the bcoin wallet begins to deviate from strict BIP44: Accounts in a bcoin wallet
(for example) can be arbitrarily configured for multisig and import xpubs from
cosigners. Accounts can be configured for Segregrated Witness or not, all within
the same wallet. Bcoin also deviates from strict BIP44 by using a third branch
for each acoount. Branch `0` and `1` are for `receive` and `change` addresses
respectively (which is BIP44 standard) but branch `2` is used by bcoin to derive
[nested SegWit addresses.](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki#P2WPKH_nested_in_BIP16_P2SH)

Note that accounts should not be accessed directly from the public API. They do
not have locks which can lead to race conditions during writes.
