#!/usr/bin/env node
// @ts-nocheck

import { Child, mergeConfig } from './util.js'
import dotenv from 'dotenv'
import fs from 'fs';

const vibeFilePath = `.vibe`

let config = await mergeConfig()

dotenv.config()

const networkName = process.argv[3]
const network = config.chains[networkName]

const deployments = {}

export async function main() {
  config.compile?.forEach(c => {
    c.contracts.forEach(contract => {
      const path = `${config.paths.out}/${c.fileName}.sol/${contract}.json`
      if (fs.existsSync(path)) {
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
      }
    })
  })

  if (!config.deploy) return

  for (const c of config.deploy[networkName]) {
    for (const contract of c.contracts) {
      try {
        await deploy(c, contract)
      } catch (error) {
        console.error(`Failed to deploy ${contract.name}:`, error)
        process.exit(1)
      }
    }
  }
}

async function deploy(c, contract) {
  console.log(`Deploying ${contract.name} to ${networkName}`)
  const path = `${config.paths.src}/${c.fileName}.sol:${contract.name}`
  console.log(`Path: ${path}`)
  let args = contract.args ? Object.entries(contract.args).map(([key, val]) => {
    const argValue = typeof val === 'string' && val.startsWith('$') ? deployments[val.slice(1)] : val
    return `"${argValue}"`
  }).join(' ') : ''

  console.dir(network)

  const command = `forge create --rpc-url ${network?.rpcUrls.default?.http ?? network?.rpcUrls[0] } --private-key ${network.privateKey} ${path} ${args ? '--constructor-args ' + args : ''} --via-ir --priority-gas-price 1`;

  const child = new Child('deploy', command)
  return new Promise((resolve, reject) => {
    child.onData = (data) => {
      console.log(data.toString())
      const match = data.toString().match(/Deployed to: (0x[0-9a-fA-F]{40})/)
      if (match) {
        const deployment = match[1];

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
            const updatedVibeContent = vibeContent.replace(regexPattern, `${entryKey}=${deployment}`)
            fs.writeFileSync(vibeFilePath, updatedVibeContent)
            console.log('Entry updated successfully.')
          } else {
            // Pattern does not exist, append it
            const updatedVibeContent = `${vibeContent.trim()}\n${entryKey}=${deployment}`
            fs.writeFileSync(vibeFilePath, updatedVibeContent)
            console.log('New entry added successfully.')
          }
        } catch (error) {
          console.error(`Failed to update or create the file: ${error}`)
        }

        deployments[contract.name] = deployment
        console.log(`Deployed ${contract.name} to ${networkName} at ${deployment}`)
        updateDeploymentFiles(c, contract.name, deployment)
        resolve();
      }
    };
    child.onError = (err) => {
      console.error(`Error deploying ${contract.name}:`, err.toString())
      reject(new Error(`Deployment failed for ${contract.name}`))
    };
    child.onExit = (code) => {
      if (code !== 0) {
        reject(new Error(`Deployment process exited with code ${code} for ${contract.name}`))
      }
    };
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
