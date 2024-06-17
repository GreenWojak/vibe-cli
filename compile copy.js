#!/usr/bin/env node

const cwd = process.cwd()
const configPath = `file://${process.cwd()}/vibe.config.js`
import { Child } from './util.js'
const config = (await import(configPath)).default
import fs from 'fs'

export async function main() {
  const child = new Child('compile', 'forge build --via-ir')
  child.onData = (data) => {
    console.log(data.toString())
  }

  child.onClose = (code) => {
    for (let i = 0; i < config.paths.dest.length; i++) {
      fs.mkdirSync(`./${config.paths.dest[i]}`, { recursive: true })
    }

    config.compile.forEach(c => {
      c.contracts.forEach(contract => {
        const path = `${cwd}/${config.paths.out}/${c.fileName}.sol/${contract}.json`
        if (fs.existsSync(path)) {
          for (let i = 0; i < config.paths.dest.length; i++) {
            if (fs.existsSync(`${cwd}/${config.paths.dest[i]}/${contract}.json`)) {
              const destJson = JSON.parse(fs.readFileSync(`${cwd}/${config.paths.dest[i]}/${contract}.json`))
              const json = JSON.parse(fs.readFileSync(path))
              if (JSON.stringify(destJson.abi) === JSON.stringify(json.abi)) {
                console.log(`Skipping ${contract} for ${config.paths.dest[i]}`)
                continue
              }
            }
            console.log(`Copying ${contract} to ${config.paths.dest[i]}`)
            fs.copyFileSync(path, `${cwd}/${config.paths.dest[i]}/${contract}.json`)
          }
        }
      })
    })
  }
}