#!/usr/bin/env node
// @ts-nocheck

import { Child, mergeConfig } from './util.js'
import dotenv from 'dotenv'
import fs from 'fs';
import { createWalletClient, createPublicClient, http, getContractAddress, toBytes } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const vibeFilePath = `.vibe`

let config = await mergeConfig()

dotenv.config()

const networkName = process.argv[3]
const network = config.chains[networkName]

const deployments = {}

export async function main() {
  const client = createWalletClient({
    chain: network,
    transport: http(),
  })

  const publicClient = createPublicClient({
    chain: network,
    transport: http(),
  })

  config.compile?.forEach(c => {
    c.contracts.forEach(contract => {
      const path = `${config.paths.out}/${c.fileName}.sol/${contract}.json`

      if (!fs.existsSync(path)) {
        console.error(`Contract ${contract} not found at ${path}`)
        process.exit(1)
      }

      for (let i = 0; i < config.paths.dest.length; i++) {
        if (fs.existsSync(`${config.paths.dest[i]}/${contract}.json`)) {
          const destJson = JSON.parse(fs.readFileSync(`${config.paths.dest[i]}/${contract}.json`))
          const json = JSON.parse(fs.readFileSync(path))
          if (JSON.stringify(destJson.abi) === JSON.stringify(json.abi)) {
            console.log(`Skipping ${contract} for ${config.paths.dest[i]}`)
            continue
          }
        }
        console.log(`Copying ${contract} to ${config.paths.dest[i]}`)
        fs.copyFileSync(path, `${config.paths.dest[i]}/${contract}.json`)
      }
    })
  })

  if (!config.deploy) return

  for (const c of config.deploy[networkName]) {
    for (const contract of c.contracts) {
      try {
        await deploy(c, contract, client, publicClient)
      } catch (error) {
        console.error(`Failed to deploy ${contract.name}:`, error)
        process.exit(1)
      }
    }
  }
}

async function deploy(c, contract, client, publicClient) {
  console.log(`Deploying ${contract.name} to ${networkName}`)
  const path = `${config.paths.out}/${c.fileName}.sol/${contract.name}.json`
  const json = JSON.parse(fs.readFileSync(path))
  const abi = json.abi
  const bytecode = abi.bytecode
  const account = privateKeyToAccount(network.privateKey)

  const nonce = await publicClient.getTransactionCount({ address: account.address })
  console.log(`Nonce: ${nonce}`)

  const args = contract.args ? Object.entries(contract.args).map(([key, val]) => {
    const argValue = typeof val === 'string' && val.startsWith('$') ? deployments[val.slice(1)] : val
    return argValue
  }) : []

  const hash = await client.deployContract({
    abi,
    bytecode,
    args,
    account,
    deploymentType: 'create2',
    nonce
  })

  const reciept = await publicClient.waitForTransactionReceipt({ hash })
  const deploymentAddress = reciept.contractAddress

  return new Promise((resolve, reject) => {
    try {
      let vibeContent;
      // Check if .vibe exists, if not, it will be created later
      if (fs.existsSync(vibeFilePath)) {
        vibeContent = fs.readFileSync(vibeFilePath, 'utf8')
        //console.log(`Original content: ${vibeContent}`);
      } else {
        console.log(`File not found. A new file will be created.`)
        vibeContent = ""
      }

      // Construct the key with network name
      const entryKey = `${networkName}.${contract.name}`
      const regexPattern = new RegExp(`^${entryKey}=0x[0-9a-fA-F]{40}$`, "gm") // 'gm' for global and multiline

      if (regexPattern.test(vibeContent)) {
        // Pattern exists, update it (replace the old deployment address with the new one)
        const updatedVibeContent = vibeContent.replace(regexPattern, `${entryKey}=${deploymentAddress}`)
        fs.writeFileSync(vibeFilePath, updatedVibeContent)
        console.log('Entry updated successfully.')
      } else {
        // Pattern does not exist, append it
        const updatedVibeContent = `${vibeContent.trim()}\n${entryKey}=${deploymentAddress}`
        fs.writeFileSync(vibeFilePath, updatedVibeContent)
        console.log('New entry added successfully.')
      }
    } catch (error) {
      console.error(`Failed to update or create the file: ${error}`)
    }

    deployments[contract.name] = deploymentAddress
    console.log(`Deployed ${contract.name} to ${networkName} at ${deploymentAddress}`)
    updateDeploymentFiles(c, contract.name, deploymentAddress)
    resolve();
  });
}

function updateDeploymentFiles(c, contractName, deploymentAddress) {
  config.paths.dest.forEach(dest => {
    const filePath = `${dest}/${contractName}.json`
    let json = {}
    if (fs.existsSync(filePath)) {
      json = JSON.parse(fs.readFileSync(filePath))
    } else {
      const path = `${config.paths.out}/${c.fileName}.sol/${contractName}.json`
      json = JSON.parse(fs.readFileSync(path))
    }
    json.deployments = json.deployments || {}
    json.deployments[network?.id] = deploymentAddress
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2))
  });
}
