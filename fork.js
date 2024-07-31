#!/usr/bin/env node
// @ts-nocheck

import { Child, mergeConfig, curl } from './util.js'
import dotenv from 'dotenv'
import { spawn } from 'child_process';
import inquirer from 'inquirer';

dotenv.config()

let config = await mergeConfig()

const networkName = process.argv[3]
const network = config.chains[networkName]
const localhost = config.chains.localhost
console.log(`Forking ${networkName}...`)
const doDeploy = process.argv.includes('--deploy') || process.argv.includes('-d')
if (doDeploy) console.log(`The contracts will be deployed after forking is done`)
const silent = process.argv.includes('--silent')
const flags = process.argv
  .filter((arg) => arg.startsWith('--') || arg.startsWith('-'))
  .filter((arg) => arg !== '--deploy' && arg !== '-d')
  .filter((arg) => arg !== '--silent' && arg !== '-S')
  .join(' ')
let forkChild = null

export async function main() {
  if (!network) {
    console.error(`Network ${networkName} not found in config`)
    process.exit(1)
  }

  if (network.rpcUrls.default?.http || network.rpcUrls[0]) {
    startFork()
  } else {
    console.log(`No rpcUrl for ${networkName}`)
  }
}

const startFork = () => {
  const port = config.port ? `--port ${config.port}` : ''
  const blockNr = network.forkBlockNr ? `--fork-block-number ${network.forkBlockNr}` : ''
  const rpcUrl = network?.rpcUrls.default?.http ?? network?.rpcUrls[0]
  const slotsInEpoch = flags.includes('--slots-in-an-epoch') ? '' : '--slots-in-an-epoch 1'
  const balance = flags.includes('--balance') ? '' : '--balance 10000000000000000000'

  forkChild = new Child('fork', `anvil --host 0.0.0.0 --fork-url ${rpcUrl} --chain-id ${localhost.id} ${balance} ${slotsInEpoch} ${blockNr} ${flags}`, { respawn: false, onData: async (data) => {
    if (!silent) console.log(data.toString())
      if (data.toString().includes('Listening on 0.0.0.0:' + config.port)) {
        console.log(`Fork started!`)
        if (silent) await curl('anvil_setLoggingEnabled', 'false')
        await doTransfers()
      }
    }
  })
  
  const terminateForkChild = () => {
    if (forkChild) {
      forkChild.kill()
      forkChild = null
    }
  }

  process.on('exit', terminateForkChild)
  process.on('SIGINT', terminateForkChild)
  process.on('SIGTERM', terminateForkChild)
  process.on('SIGHUP', terminateForkChild) // On console close
  process.on('SIGBREAK', terminateForkChild) // On windows ctrl + break
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err)
    terminateForkChild()
    process.exit(1)
  });

  forkChild.onClose = (code) => {
    process.exit(code.toString())
  }

  forkChild.onError = (code) => {
    console.error(code.toString())
  }

  const doTransfers = async () => {
    if (doDeploy) {
      console.log(`Deploying contracts to ${networkName}...`)
      process.argv[3] = 'localhost'
      await (await import("./deploy.js")).main()
    }

    if (network.supplyAddresses && network.supplyAddresses[0]) {
      const supply = await import("./supply.js")
      const child2 = new Child('impersonate', `cast rpc anvil_impersonateAccount 0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)
      
      child2.onData = (data) => {
        console.log(data.toString())
      }

      child2.onClose = (code) => {
        if (code !== 0) {
          console.error(`Failed to impersonate account`)
          process.exit(code)
        }
        else console.log(`Impersonated account`)
      }

      child2.onError = (code) => { 
        console.error(code)
      }

      process.argv[3] = networkName

      for (let i = 0; i < network.supplyAddresses.length; i++) {
        const address = network.supplyAddresses[i]
        process.argv[4] = address
        console.log(`Transferring to ${address}...`)
        await supply.main()
        console.log(`Transfers for ${address} complete!`)
      }
    }

    if (doDeploy) {
      process.argv[3] = 'localhost'
      network.forkScripts?.forEach(async (script) =>	{
        const args = script.split(' ')
        process.argv[4] = args[0]
        process.argv[5] = args[1]
        await (await import("./run.js")).main();
      })
    }

    await curl('evm_setIntervalMining', network.forkBlockTime?.toString() ?? '5').then(() => { 
      console.debug('Mining interval set to ' + (network.forkBlockTime?.toString() ?? '5') + ' seconds')
    })

    forkChild.onData = async (data) => {
      console.log(data.toString())
    }
  }
}