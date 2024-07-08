#!/usr/bin/env node
// @ts-nocheck

import fs from 'fs'
import path from 'path';
import { Child, mergeConfig } from './util.js'

export async function main() {
  const config = await mergeConfig()
  const vibeFilePath = path.join(process.cwd(), '.vibe')
  const deployments = {};

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

  console.dir(config.calls)

  const scriptsPath = config.paths.scripts
  const networkName = process.argv[3]
  const network = config.chains[networkName]
  const calls = config.calls[networkName]
  const call = calls[process.argv[4]]
  const script = `${path.join(process.cwd(), scriptsPath, call.fileName)}.s.sol:${call.script}`
  console.log(script)

  const args = {}
  for (let i = 5; i < process.argv.length; i++) {
    args[`ARG${i - 5}`] = process.argv[i];
  }

  for (const [key, value] of Object.entries(deployments[networkName])) {
    args[key] = value;
  }

  await new Promise((resolve, reject) => {
    const child = new Child('call', `forge script ${script} --via-ir -f ${network?.rpcUrls.default.http ?? network?.rpcUrls[0] } --broadcast --priority-gas-price 1`, {cwd: process.cwd(), env: { ...process.env, ...args }});
    child.onData = (data) => {
      console.log(data.toString())
    }
    child.onClose = (code) => {
      console.log(`Call script finished with code ${code}`);
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    }
    child.onError = (error) => {
      console.error(`Error: ${error}`);
      reject();
    }
  })
}