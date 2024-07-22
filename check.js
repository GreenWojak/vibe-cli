#!/usr/bin/env node
// @ts-nocheck

import { Child, mergeConfig } from './util.js'
import { default as defaultConfig } from './config.js'

export async function main() {
  const config = await mergeConfig()
  let rpcUrl;
  
  try {
    rpcUrl = process.argv[3] ? ("--fork-url " + config.chains[process.argv[3]].rpcUrl) : ''
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