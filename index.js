#!/usr/bin/env node
// @ts-nocheck

import inquirer from "inquirer";
import { Child } from './util.js'
import { exec } from "child_process";
import { createRequire } from "module";
const p = createRequire(import.meta.url)("./package.json");

// Get first argument
const cmd = process.argv[2]

if (cmd === "version") {
  console.log(p.version)

} else if (cmd === "help") {
  console.log("Vibe CLI - A Foundry wrapper that supercharges and simplifies your decentralised application workflow.")
  console.log("Available commands:")

  console.log("vibe init                            - Initialize a new Vibe project")
  console.log("vibe fork <network> [-d]             - Fork a network")
  console.log("   -d: Deploy contracts after forking")
  console.log("vibe compile                         - Compile contracts")
  console.log("vibe deploy <network>                - Deploy contracts")
  console.log("vibe run <network> <command> [args]  - Run a Solidity script on a network")
  console.log("vibe check <network>                 - Runs tests on a network")
  console.log("vibe supply <network> <address>      - Supply an address with tokens")
  console.log("vibe version                         - Print the version of the Vibe CLI")

  console.log("For more information, check the readme at https://github.com/GreenWojak/vibe-cli")
  console.log("Vibe CLI version: " + p.version)
} else if (cmd) {
  // Check if Foundry is installed
  // by trying to run "forge --help"
  const child = new Child('check', 'forge --help')

  // If the command is successful, Foundry is installed
  child.onClose = async (code) => {
    // Run the main function if Foundry is installed
    if (code === 0) {
      await main();
    }
    // If the command fails, Foundry is not installed
    else {
      // Ask the user if they want to install Foundry
      const { install } = await inquirer.prompt([
        {
          name: "install",
          type: "confirm",
          message: "Foundry is not installed. Do you want to install it?",
        },
      ]);

      // If the user wants to install Foundry, run the install script at "https://foundry.paradigm.xyz"
      if (install) {
        console.log("Installing Foundry...");
        const child = new Child('install', 'curl -L https://foundry.paradigm.xyz | bash')

        let sourceCommand = ""

        child.onError = (error) => {
          console.error(error)
        }

        child.onData = (data) => {
          // Grab detected profile source command from installer output
          if (data.toString().includes("start a new terminal")) {
            sourceCommand = data.toString().match(/source [^']+/)[0]
          }
        }
        child.onClose = async (code) => {
          // If install script is successful and source command is found, source current profile
          if (code === 0 && sourceCommand) {
            const child = new Child('install', sourceCommand)

            child.onClose = async (code) => {
              const child = new Child('install', 'foundryup')

              child.onData = (data) => {
                console.log(data.toString())
              }

              // // If the command is successful, run the main function
              // child.onClose = async (code) => {
              //   await main();
              // }

              // If the command is successful, run "forge install"
              child.onClose = async (code) => {
                if (code === 0) {
                  const child = new Child('install', 'forge install')

                  child.onData = (data) => {
                    console.log(data.toString())
                  }

                  child.onClose = async (code) => {
                    if (code === 0) {
                      await main();
                    } else {
                      console.log("Failed to install Foundry. Please try again.")
                    }
                  }
                } else {
                  console.log("Failed to install Foundry. Please try again.")
                }
              }
            }
          }
        }
      } 
      else {
        console.log("Foundry is required to run this command. Foundry forge and try again.");
      }
    }
  }
} else {
  console.log("Hello via Vibe CLI!");
  console.log("Please use \"vibe help\" to see the available commands.");
}

async function main() {
  if (cmd === "init") {
    await (await import("./init.js")).main();
  } else if (cmd === "fork") {
    await (await import("./fork.js")).main();
  } else if (cmd === "deploy") {
    await (await import("./deploy.js")).main();
  } else if (cmd === "compile") {
    await (await import("./compile.js")).main();
  } else if (cmd === "check") {
    await (await import("./check.js")).main();
  } else if (cmd === "run") {
    await (await import("./run.js")).main();
  } else if (cmd === "supply") {
    await (await import("./supply.js")).main();
  } else {
    console.log("Invalid command. Please type \"vibe help\" to see the available commands.")
  }
}