#!/usr/bin/env node
// @ts-nocheck

import { Child, mergeConfig } from './util.js'
import dotenv from 'dotenv'

const config = await mergeConfig()

dotenv.config()

let network
let address

export async function main() {
  const networkName = process.argv[3]
  network = config.chains[networkName]
  address = process.argv[4]
  //if (network.rpcUrl) {
    try {
      await transfer(address)
    } catch (error) {
      console.error(error)
      process.exit(1)
    }
  //} else {
  //  console.log(`No rpcUrl for ${networkName}`)
  //}
}

const transfer = (address) => {
  return new Promise((resolve, reject) => {
    const child = new Child('send', `cast send --from 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 ${address} --value ${network.forkETHBalance} --unlocked --priority-gas-price 0`)
    child.onData = (data) => {
      console.log(data.toString())
    }
    child.onError = (error) => {
      console.error(error)
      reject(error)
    }
    child.onClose = async (code) => {
      if (code !== 0) {
        reject(new Error('Failed to send ETH'))
      } else {
        try {
          await tokenTransfer(address, 0)
          resolve()
        } catch (error) {
          reject(error)
        }
      }
    }
  })
}

const tokenTransfer = async (address, transferIndex) => {
  const forkTransfer = network.forkTransfers[transferIndex]
  return new Promise((resolve, reject) => {
    const child4 = new Child('impersonate', `cast rpc anvil_impersonateAccount ${forkTransfer.from}`)
    child4.onData = (data) => {
      console.log(data.toString())
    }

    child4.onClose = async (code) => {
      if (code !== 0) {
        reject(new Error('Failed to impersonate account'))
      } else {
        console.log(`Impersonated account`)
        const child = new Child('send', `cast send ${forkTransfer.token} --from ${forkTransfer.from} "transfer(address,uint256)(bool)" ${address} ${forkTransfer.amount} --unlocked --priority-gas-price 0`)
        child.onData = (data) => {
          console.log(data.toString())
        }
        child.onError = (error) => {
          console.error(error)
          reject(error)
        }
        child.onClose = async (code) => {
          if (code !== 0) {
            reject(new Error(`Failed to send token ${forkTransfer.token}`))
          } else {
            console.log(`Sent ${forkTransfer.amount} ${forkTransfer.token} from ${forkTransfer.from} to ${address}`)
            if (network.forkTransfers[transferIndex + 1]) {
              try {
                await tokenTransfer(address, transferIndex + 1)
                resolve()
              } catch (error) {
                reject(error)
              }
            } else {
              resolve()
            }
          }
        }
      }
    }
  })
}
