# vibe-cli ![NPM Version](https://img.shields.io/npm/v/vibe-cli)

A CLI tool/wrapper around [Foundry](https://book.getfoundry.sh/) that supercharges and simplifies your decentralised application workflow.

## Installation

<table>
  <tr>
    <td>npm</td>
    <td><code>npm install -g vibe-cli</code></td>
  </tr>
  <tr>
    <td>pnpm</td>
    <td><code>pnpm add -g vibe-cli</code></td>
  </tr>
  <tr>
    <td>Bun</td>
    <td><code>bun add -g vibe-cli</code></td>
  </tr>
</table>

## Usage
### Initialising / adding Vibe-CLI to a project
```bash
vibe init
```
This command should be ran in the root directory of your project. It will create a `vibe` directory, a `vibe.config.js` file, a `.vibe` file
### Forking a network
```bash
vibe fork <network>
```
(See list of supported networks [here](https://wagmi.sh/core/api/chains).)

For example, to fork the Binance Smart Chain mainnet: `vibe fork bsc`. 

This command can be ran from anywhere.

### Compiling contracts
```bash
vibe compile
```

## vibe.config.js Structure
-  <kbd>chains</kbd>:
    - <kbd>id</kbd>: The chain ID (e.g. 56 for BSC)
  - <kbd>rpcUrls</kbd>: An array of RPC URLs
  - <kbd>privateKey</kbd>: The private key that will deploy contracts and call scripts
  - <kbd>supplyAddresses</kbd>: An array of addresses that will receive the starting balance and supply tokens when forking
  - <kbd>supplyBalance</kbd>: The starting balance of the account
  - <kbd>supplyTokens</kbd>: An array of objects that represent the tokens to supply
    - <kbd>address</kbd>: The token address
    - <kbd>from</kbd>: An array of addresses to transfer from (whales)
    - <kbd>amount</kbd>: The amount to transfer
  - <kbd>compile</kbd>: An array of contracts to be compiled with `vibe compile`
    - fileName: The Solidity file containing the contracts
    - contracts: An array of contract names to compile
  - <kbd>deploy</kbd>: An array of contracts to be deployed with `vibe deploy` with names as keys
    - <kbd>fileName</kbd>: The Solidity file containing the contract
    - <kbd>contracts</kbd>: An array of contract objects
      - <kbd>name</kbd>: The contract name
      - <kbd>args</kbd>: An array of arguments to pass to the constructor
  - <kbd>calls</kbd>: An object containing calls to be made with `vibe call` with chain names as keys
    - <kbd>contract</kbd>: 
