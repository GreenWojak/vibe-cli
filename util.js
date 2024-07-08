#!/usr/bin/env node
// @ts-nocheck

import { spawn } from 'child_process'
import { default as defaultConfig } from './config.js'

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

  constructor(name, command, options={args: null, respawn: true, detached: false, env: null}) {
    this.name = name
    this.command = command
    this.args = options.args
    this.detached = options.detached
    this.env = options.env
    this.respawn(options.respawn)
  }

  respawn(respawn) {
    this.child = spawn(this.command, this.args, { shell: true, detached: this.detached, env: this.env})

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

export async function mergeConfig() {
  try {
    const newConfig = (await import(`file://${process.cwd()}/vibe.config.js`)).default
    let config = {
      paths: {
        src: newConfig.paths?.src ?? defaultConfig.paths.src,
        out: newConfig.paths?.out ?? defaultConfig.paths.out,
        scripts: newConfig.paths?.scripts ?? defaultConfig.paths.scripts,
        dest: newConfig.paths?.dest ?? defaultConfig.paths.dest
      },
      chains: {},
      compile: newConfig.compile,
      deploy: newConfig.deploy,
      calls: newConfig.calls
    }
    console.dir(config.calls)
    Object.keys(defaultConfig.chains).forEach(c => {
      let newChain
      Object.keys(newConfig.chains).forEach(nc => {
        if (nc === c) newChain = newConfig.chains[nc]
      })
      if (newChain) config.chains[c] = { ...defaultConfig.chains[c], ...newChain }
      else config.chains[c] = defaultConfig.chains[c]
    })
    return config
  }
  catch (e) {
    console.error(`Failed to load config: ${e}`)
    return defaultConfig
  }
}