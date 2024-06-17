#!/usr/bin/env node

import { Child } from './util.js'
const configPath = `file://${process.cwd()}/vibe.config.js`
const config = (await import(configPath)).default
import dotenv from 'dotenv'
import { spawn } from 'child_process';
import inquirer from 'inquirer';
dotenv.config()

const networkName = process.argv[3]
const network = config.networks[networkName]
console.log(`Forking ${networkName}`)
const doDeploy = process.argv.includes('-d') || process.argv.includes('--deploy')

let forkChild = null

export async function main() {
  if (network.rpcUrl) {
    startFork()
  } else {
    console.log(`No rpcUrl for ${networkName}`)
  }
}

const killFork = async () => {
  if (process.platform === 'win32') {
    const child = new Child('kill', 'Stop-Process -Id (Get-NetTCPConnection -LocalPort 8545).OwningProcess -Force', { env: "powershell", respawn: false })
    child.onClose = (code) => {
      startFork()
    }
  }
  else {
    const child = new Child('kill', 'kill -9 $(lsof -t -i:8545)', { respawn: false })
    child.onClose = (code) => {
      startFork()
    }
  }
}

const startFork = () => {
  forkChild = new Child('fork', `anvil --host 0.0.0.0 --fork-url ${network?.rpcUrl} --chain-id 31337 --balance 10000000000000000000 --slots-in-an-epoch 1`)

  const terminateForkChild = () => {
    if (forkChild) {
      forkChild.kill();
      forkChild = null;
    }
  }

  process.on('exit', terminateForkChild);
  process.on('SIGINT', terminateForkChild);
  process.on('SIGTERM', terminateForkChild);
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    terminateForkChild();
    process.exit(1);
  });

  forkChild.onClose = (code) => {
    if (code !== 0) {
      console.log(`Failed to start fork`)
      process.exit(code)
    }
  }

  forkChild.onError = (code) => {
    console.log(`Error: ${code}`)
  }

  forkChild.onData = async (data) => {
    console.log(data.toString())
    if (data.toString().includes('Listening on 0.0.0.0:8545')) {
      console.log('Fork started')
      await doTransfers()
    }
  }

  const doTransfers = async () => {
    if (doDeploy) {
      process.argv[3] = 'localhost'
      await (await import("./deploy.js")).main();
    }
    if (network.forkParticipants[0]) {
      const supply = await import("./supply.js")
      const child2 = new Child('impersonate', `cast rpc anvil_impersonateAccount 0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)
      
      child2.onData = (data) => {
        console.log(data.toString())
      }

      child2.onClose = (code) => {
        if (code !== 0) {
          console.log(`Failed to impersonate account`)
          process.exit(code)
        }
        else console.log(`Impersonated account`)
      }

      child2.onError = (code) => { 
        console.log(`Error: ${code}`)
      }

      process.argv[3] = networkName

      for (let i = 0; i < network.forkParticipants.length; i++) {
        const address = network.forkParticipants[i]
        process.argv[4] = address
        console.log(`Transferring to ${address}`)
        await supply.main()
        console.log(`Transfers for ${address} complete`)
      }
    }
    if (doDeploy) {
      process.argv[3] = 'localhost'
      network.forkCalls.forEach(async (call) =>	{
        const args = call.split(' ')
        process.argv[4] = args[0]
        process.argv[5] = args[1]
        await (await import("./call.js")).main();
      })
    }
    await curl('evm_setIntervalMining', '5').then(() => { console.log('Interval mining set') })
    forkChild.onData = async (data) => {
      console.log(data.toString())
    }
  }
}

async function curl(method, params) {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '-H', 'Content-Type: application/json',
      '-d', `{"id":1, "jsonrpc":"2.0", "method":"${method}", "params":[${params}]}`,
      'http://localhost:8545'
    ]);
    
    curl.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });
    
    curl.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
    
    curl.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        if (code === 0) {
          resolve()
        } else {
          reject()
        }
    });
  })
}

// For when you need to kill the fork
// kill -9 $(lsof -t -i:8545)