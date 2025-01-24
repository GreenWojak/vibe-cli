#!/usr/bin/env node
// @ts-nocheck

import { Child, mergeConfig, curl } from './util.js'

const config = await mergeConfig()

let network
let address

export async function main() {
  const networkName = process.argv[3]
  network = config.chains[networkName]
  address = process.argv[4]
  try {
    await transfer(address)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

const transfer = (address) => {
  return new Promise((resolve, reject) => {
    const child = new Child('send', `cast send --from 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 ${address} --value ${network.supplyBalance} --unlocked --priority-gas-price 0`)
    child.onData = (data) => {
      console.log(data.toString())
    }
    child.onError = (error) => {
      console.error(error.toString())
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
  return new Promise(async (resolve, reject) => {
    if (!network.supplyTokens) resolve()
    const supplyToken = network.supplyTokens[transferIndex]
    
    // Check each from address to see if it has sufficient balance
    let from
    for (let i = 0; i < supplyToken.from.length; i++) {
      try {
        from = await checkFrom(supplyToken.from[i], supplyToken)
        break
      } catch (error) {
        console.error(error)
      }
    }
    
    if (!from) {
      reject(new Error(`No account with sufficient balance for token ${supplyToken.address}`))
    }

    const child4 = new Child('impersonate', `cast rpc anvil_impersonateAccount ${from}`)

    child4.onClose = async (code) => {
      if (code !== 0) {
        reject(new Error('Failed to impersonate account'))
      } else {
        console.log(`Impersonated account`)
        const child = new Child('send', `cast send ${supplyToken.address} --from ${from} "transfer(address,uint256)(bool)" ${address} ${supplyToken.amount} --unlocked --priority-gas-price 0`)
        child.onData = (data) => {
          console.log(data.toString())
        }
        child.onError = (error) => {
          console.error(error.toString())
          reject(error)
        }
        child.onClose = async (code) => {
          if (code !== 0) {
            reject(new Error(`Failed to send token ${supplyToken.address}`))
          } else {
            console.log(`Sent ${supplyToken.amount} ${supplyToken.address} from ${from} to ${address}`)
            if (network.supplyTokens[transferIndex + 1]) {
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

const checkFrom = async (address, supplyToken) => {
  return new Promise((resolve, reject) => {
    console.log(`Checking balance of ${address} for token ${supplyToken.address}`)
    const child = new Child('call', `cast call ${supplyToken.address} "balanceOf(address)(uint256)" ${address}`)
    child.onData = (data) => {
      const balance = parseInt(data.toString().trim())
      if (balance >= supplyToken.amount) {
        resolve(address)
      } else {
        reject(new Error(`Insufficient balance for token ${supplyToken.address}`))
      }
    }
    child.onClose = (code) => {
      if (code !== 0) {
        reject(new Error(`Failed to get balance of ${address}`))
      }
    }
  })
}