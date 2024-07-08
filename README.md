# vibe-cli ![NPM Version](https://img.shields.io/npm/v/vibe-cli)

A CLI tool that supercharges and simplifies your Dapp development workflow.

## Installation

<table>
  <tr>
    <td align="center">npm</td>
    <td align="center">pnpm</td>
    <td align="center">Bun</td>
  </tr>
  <tr>
    <td width="33%" align="center">
      <code>npm install -g vibe-cli</code>
    </td>
    <td width="33%" align="center">
      <code>pnpm add -g vibe-cli</code>
    </td>
    <td width="33%" align="center">
      <code>bun add -g vibe-cli</code>
    </td>
  </tr>
</table>

## Usage
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
