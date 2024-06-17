#!/usr/bin/env node

import { spawn } from 'child_process'

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