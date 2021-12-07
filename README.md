# Locking Contract

This contract is separated from the Blindex's protocol contracts as it's meant to be a contract to hold the code contributors/maintainers in a dedicated contract with a well-defined tokens time locking system.

This makes sure Blindex will always have people helping push it forward and reach the community's goals.

Blindex belongs to no one except its community.

# Setup

## Environment variables

Create a `.env` file in your root folder and make sure you have the following environment variables in it:

```shell
CMC_TOKEN=<your_coinmarketcap_token_for_gas_reports>
```

You can [get your free tier token here](https://coinmarketcap.com/api).

## Node.js

Please use the Node.js version mentioned in the `.nmvrc` file. We recommand using [nvm](https://github.com/nvm-sh/nvm) for that.

And then run:

```shell
npm install
```

# Run

## Local

Please run the [hardhat local network](https://hardhat.org/hardhat-network/):

```shell
npm run node
```

#### Development

And in a seperate terminal run:

```shell
npm run local
```

#### Tests

Please run:

```shell
npm test
```

##### Test your gas usage

You can use your tests to see how much gas your contract functions cost by running:

```shell
npm run test:gas
```
