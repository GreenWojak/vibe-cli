#!/usr/bin/env node
// @ts-nocheck

import fs from 'fs'
import path from 'path';
import { Child, mergeConfig } from './util.js'

const config = await mergeConfig()

export async function main() {
  const vibeFilePath = path.join(process.cwd(), '.vibe')
  const deployments = {}

  try {
    const vibeContent = fs.readFileSync(vibeFilePath, 'utf8')
    const lines = vibeContent.split('\n')

    lines.forEach(line => {
      if (line.trim()) {
        const [key, address] = line.split('=')
        if (key && address) {
          const [network, contract] = key.split('.')
          if (!deployments[network]) {
            deployments[network] = {};
          }
          deployments[network][contract] = address
        }
      }
    });

    console.log(deployments)
  } catch (error) {
    console.error(`Failed to read or parse the file: ${error}`)
  }

  for (const networkName in deployments) {
    const network = config.chains[networkName]
    for (const contractName in deployments[networkName]) {
      const deploymentAddress = deployments[networkName][contractName]
      updateDeploymentFiles(config, contractName, network.id, deploymentAddress)
    }
  }
}

function updateDeploymentFiles(c, contractName, networkId, deploymentAddress) {
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
    json.deployments[networkId] = deploymentAddress
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2))
  });
}