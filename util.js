#!/usr/bin/env node
// @ts-nocheck

import { spawn } from 'child_process'
import { default as defaultConfig } from './config.js'
import fs from 'fs'
import path from 'path'

export class Child {
  child = null
  name = null
  command = null
  args = null
  onData = null
  onClose = null
  onError = null
  detached = false
  env = null

  constructor(name, command, options={args: null, respawn: true, detached: false, env: null, onData: null, onClose: null, onError: null}) {
    this.name = name
    this.command = command
    this.args = options.args
    this.detached = options.detached
    this.env = options.env ? { ...process.env, ...options.env } : process.env
    this.onData = options.onData
    this.onClose = options.onClose
    this.onError = options.onError
    this.respawn(options.respawn)
  }

  respawn(respawn) {
    // Fix for broken behavior under Git Bash
    if (process.env.SHELL && process.env.SHELL.endsWith('bash.exe')) {
      // Run every command in bash -c
      this.args = this.args || []
      const bashCommand = `${this.command} ${this.args.join(' ')}`;
      this.child = spawn('bash', ['-c', bashCommand], { shell: false, detached: this.detached, env: this.env})
    } else {
      this.child = spawn(this.command, this.args, { shell: true, detached: this.detached, env: this.env})
    }

    this.child.stdout.on('data', (data) => {
      if (this.onData != null) this.onData(data)
    })

    this.child.on('close', (code) => {
      if (code != 0 && respawn) this.respawn() 
      else if (this.onClose != null) this.onClose(code)
    })

    this.child.stderr.on('data', (code) => { 
      if (this.onError != null) this.onError(code)
    })
  }

  kill() { 
    this.child.kill() 
  }
}

export function deleteDirectory(directoryPath) {
  // Fix change path to windows format on git bash
  if (process.env.SHELL && process.env.SHELL.endsWith('bash.exe') && directoryPath.startsWith('/')) {
    let splitDirectoryPath = directoryPath.split('/')
    if (splitDirectoryPath[1] && splitDirectoryPath[1].length === 1) { // Check if it's a single letter
      directoryPath = `${splitDirectoryPath[1]}:\\${splitDirectoryPath.slice(2).join(path.sep)}`;
    }
  }

  directoryPath = path.resolve(directoryPath)
  if (fs.existsSync(directoryPath)) {
    fs.rmSync(directoryPath, { recursive: true, force: true });
    console.log(`Directory "${directoryPath}" has been deleted.`);
  } else {
    console.log(`Directory "${directoryPath}" does not exist.`);
  }
}

export async function mergeConfig() {
  try {
    if (!fs.existsSync(`${process.cwd()}/vibe.config.js`)) {
      console.warn(`No config file found at ${process.cwd()}/vibe.config.js, using default config`)
      return defaultConfig
    }
    const newConfig = (await import(`file://${process.cwd()}/vibe.config.js`)).default
    let config = {
      port: newConfig.port ?? 8545,
      paths: {
        src: newConfig.paths?.src ?? defaultConfig.paths.src,
        out: newConfig.paths?.out ?? defaultConfig.paths.out,
        scripts: newConfig.paths?.scripts ?? defaultConfig.paths.scripts,
        dest: newConfig.paths?.dest ?? defaultConfig.paths.dest
      },
      chains: {},
      compile: newConfig.compile ?? {},
      deploy: newConfig.deploy ?? {},
      scripts: newConfig.scripts ?? {}
    }
    Object.keys(defaultConfig.chains).forEach(c => {
      if (newConfig.chains === undefined) newConfig.chains = {}
      let newChain = newConfig.chains != undefined && Object.keys(newConfig.chains).includes(c) ? newConfig.chains[c] : null
      if (newChain) config.chains[c] = { ...defaultConfig.chains[c], ...newChain }
      else config.chains[c] = defaultConfig.chains[c]

      if (!config.chains[c].rpcUrls.default)  config.chains[c].rpcUrls.default = {}
      config.chains[c].rpcUrls.default.http = config.chains[c].rpcUrls.default?.http ?? config.chains[c].rpcUrls

      if (c === 'localhost' && config.chains[c].privateKey === undefined) {
        // Anvil default for localhost (publically known private key, do not use in production)
        config.chains[c].privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
      }
    })
    return config
  }
  catch (e) {
    console.error(`Failed to load config: ${e}`)
    return defaultConfig
  }
}

export async function curl(method, params) {
  return new Promise(async (resolve, reject) => {
    const config = await mergeConfig()
    const curl = spawn('curl', [
      '-H', 'Content-Type: application/json',
      '-d', `{"id":1, "jsonrpc":"2.0", "method":"${method}", "params":[${params}]}`,
      'http://localhost:' + config.port
    ])
    
    curl.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`)
    })
    
    curl.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`)
    })
    
    curl.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        console.log(`child process exited with code ${code}`)
        reject()
      }
    })
  })
}


