#!/usr/bin/env node

import { Child } from './util.js'

const configPath = `file://${process.cwd()}/vibe.config.js`
const config = (await import(configPath)).default

export async function main() {
  let rpcUrl;
  try {
    rpcUrl = process.argv[3] ? ("--fork-url " + config.networks[process.argv[3]].rpcUrl) : ''
  } catch (e) {
    console.error('Invalid network: ' + process.argv[3])
    process.exit(1)
  }
  const child = new Child('test', `forge test --via-ir ${rpcUrl}`)

  child.onData = (data) => {
    console.log(data.toString())
  }

  child.onClose = (code) => {
    console.log('Tests complete')
  }
}