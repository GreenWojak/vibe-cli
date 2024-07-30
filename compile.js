#!/usr/bin/env node
// @ts-nocheck

import { Child, mergeConfig } from './util.js'
import fs from 'fs'

const config = await mergeConfig()

export async function main() {
  const child = new Child('compile', 'forge build --via-ir')
  child.onData = (data) => {
    console.log(data.toString())
  }

  child.onClose = (code) => {
    for (let i = 0; i < config.paths.dest.length; i++) {
      fs.mkdirSync(`./${config.paths.dest[i]}`, { recursive: true })
    }

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
  }
}