# locking-contract

This contract is separated from the Blindex's protocol contracts as it's meant to be a contract to hold the code contributors/maintainers in a dedicated contract with a well-defined tokens locking system.

This makes sure Blindex will always have people helping push it forward and reach the community's goals.

Blindex belongs to no one except its community.

# Setup

## Environment variables

Create a `.env` file in your root folder and make sur eyou have the following environment arguments in it:

```shell
CMC_TOKEN=<your_coinmarketcap_token_for_gas_reports>
```

## Node.js

Please use the Node.js version mentioned in the `.nmvrc` file. We recommand using [nvm](https://github.com/nvm-sh/nvm) for that.
