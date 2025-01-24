# vibe-cli ![NPM Version](https://img.shields.io/npm/v/vibe-cli)

A CLI tool/wrapper around [Foundry](https://book.getfoundry.sh/) that supercharges and simplifies your decentralised application workflow.

Vibe-CLI allows you to easily fork, compile, deploy, and call contracts on various networks. It also allows you to easily test your contracts, and interact with your contracts using scripts.

Check out the [example project](https://github.com/GreenWojak/vibe-cli-example).

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

This command should be ran in the root directory of your project. It will create a `vibe` directory, a `vibe.config.js` file, a `.vibe` file and a `foundry.toml` file.

Vibe-CLI requires Foundry to be installed on your system. If Foundry is not installed, Vibe-CLI will ask if you would like to install it when running any command.

> [!WARNING]
> If you’re on Windows, you will need to install and use Git BASH or WSL as your terminal, since Foundryup currently does not support Powershell or Cmd.

> [!NOTE]
> Vibe-CLI and Foundry require you to use the `.t.sol` extension for your test files, and `.s.sol` for your script files in order for it to work correctly.

### Forking a network

```bash
vibe fork <network> [-d]
```

(See list of supported networks [here](https://wagmi.sh/core/api/chains).)

For example, to fork the Binance Smart Chain mainnet: `vibe fork bsc`. 

This command can be ran from any directory. It will fork the network specified in the command using [Anvil](https://book.getfoundry.sh/anvil/).

If the `--deploy (-d)` flag is set, the contracts specified in `vibe.config.js` under that chain will be deployed to the network after forking.

Vibe-CLI will pass any other flags directly to Anvil.

### Compiling contracts

```bash
vibe compile
```

This command will compile the contracts specified in the `vibe.config.js` file in your project.

### Deploying contracts

```bash
vibe deploy <network>
```

This command will deploy the contracts specified in the `vibe.config.js` file in your project to the network specified in the command.

Contracts are deployed in order. If one contract depends on an already deployed contract, you can use it as a constructor argument by using the `$` symbol followed by the contract name (e.g. `"$Counter"`).

### Running scripts

```bash
vibe run <network> <command> [args]
```

This command will run the Solidity script defined in the `vibe.config.js` file in your project with the command and arguments specified.

### Supplying test tokens

```bash
vibe supply <network> <address>
```

This command will supply the supply balance in ETH and tokens defined in the `vibe.config.js` file in your project to the specified addresses on a forked network.

### Testing contracts

```bash
vibe check <network>
```

It will run the tests located in the `vibe/tests` directory of your project (unless specified otherwise in the config) on the network specified in the command using `forge test`.

### Running RPC methods

```bash
vibe curl <method> [args]
```

This command will run the RPC method specified in the command with the provided arguments on the currently forked network (e.g. `vibe curl evm_setIntervalMining 2`).

### Refreshing deployment files

```bash
vibe refresh
```

This command will Update all deployment files with the addresses found in the .vibe file.

### vibe.config.js Structure

> [!NOTE]
> Any filenames in the configuration should be specified without any file extensions.

- <kbd>port</kbd>: The port to run the Anvil server on when forking (default: `8545`)
- <kbd>paths</kbd>: An object containing the paths to various directories
  - <kbd>src</kbd>: The directory containing the Solidity files (default: `'vibe/src'`)
  - <kbd>out</kbd>: The directory to output the compiled contracts (default: `'vibe/out'`)
  - <kbd>scripts</kbd>: The directory containing the scripts to be called (default: `'vibe/scripts'`)
  - <kbd>dest</kbd>: An array of directories to copy the ABI and deployment addresses to (default: `['vibe/deployed']`)
- <kbd>chains</kbd>: An object containing the chains to fork and deploy to
  - <kbd>[chain name]</kbd>: Objects containing the chain information (see [here](https://wagmi.sh/core/api/chains) for the list of default chains)
    - <kbd>id</kbd>: The chain ID (e.g. 56 for Binance Smart Chain)
    - <kbd>rpcUrls</kbd>: An array of RPC URLs
    - <kbd>privateKey</kbd>: The private key that will deploy contracts and call scripts
    - <kbd>forkBlockNr</kbd>: The block number to fork from (defaults to the latest block)
    - <kbd>forkBlockTime</kbd>: The duration (mining interval) of each block in seconds (defaults to 5)
    - <kbd>forkScripts</kbd>: An array of scripts to be ran upon forking the chain (e.g. `["name arg1 arg2"]`)
    - <kbd>supplyAddresses</kbd>: An array of addresses that will receive the starting balance and supply tokens upon forking
    - <kbd>supplyBalance</kbd>: The starting balance of the account
    - <kbd>supplyTokens</kbd>: An array of objects that represent the tokens to supply
      - <kbd>address</kbd>: The token address
      - <kbd>from</kbd>: An array of (whale) addresses to transfer from
      - <kbd>amount</kbd>: The amount to transfer
- <kbd>compile</kbd>: An array of contracts to be compiled with `vibe compile`
  - <kbd>fileName</kbd>: The Solidity file containing the contracts
  - <kbd>contracts</kbd>: An array of contract names to compile
- <kbd>deploy</kbd>: An object containing contracts to be deployed per chain with `vibe deploy [chain name]`
  - <kbd>[chain name]</kbd>: An array of objects containing the file names and contracts to be deployed
    - <kbd>fileName</kbd>: The Solidity file containing the contract
    - <kbd>contracts</kbd>: An array of contract objects
      - <kbd>name</kbd>: The contract name
      - <kbd>args</kbd>: An array of arguments to pass to the constructor
- <kbd>scripts</kbd>: An object containing Solidity scripts to be ran with `vibe run [chain name] [command] [args]`
  - <kbd>[chain name]</kbd>: Objects containing commands that can be used to run scripts on the chain
    - <kbd>[command]</kbd>: Objects containing scripts to be ran with the command as key
      - <kbd>fileName</kbd>: The Solidity file containing the script to be ran
      - <kbd>script</kbd>: The script to be ran

### Deployed Contract .json Structure

```json
{
  "abi": [],
  "deployments": {
    "[chain ID]": "contract address (0x...)"
  }
}
```

### .vibe

This file contains the addresses of the deployed contracts. It is automatically generated when deploying contracts.
