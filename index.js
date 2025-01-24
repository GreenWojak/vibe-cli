#!/usr/bin/env node
// @ts-nocheck

import inquirer from "inquirer";
import { Child, deleteDirectory } from './util.js'
import { exec } from "child_process";
import { createRequire } from "module";
import fs from "fs";

const p = createRequire(import.meta.url)("./package.json");

// Used for tracking forge installation
let sourceCommand = ""

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
  console.log("vibe curl <method> [args]            - Run an RPC method on the forked network")
  console.log("vibe refresh                         - Updates dest files with addresses in .vibe")
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
      await installDependencies()
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

        // Fix for foundry to detect git bash properly
        const shellPath = process.env.SHELL.replace(/\.exe$/, '');
        // We add an additional print to get foundry's path to avoid having to re-open the terminal
        const child = new Child('install', '(curl -sSf -L https://foundry.paradigm.xyz && echo echo \"FOUNDRY_NEW_PATH:\\${FOUNDRY_BIN_DIR}\") | bash', {respawn: false, env: { SHELL: shellPath }})

        let foundryPath = ""

        child.onError = (error) => {
          console.error(error.toString())
        }

        child.onData = (data) => {
          // Grab instructions to finalize 
          if (data.toString().includes("start a new terminal")) {
            sourceCommand = data.toString().match(/source [^']+/)[0]
          }

          // Grab the new path
          if (data.toString().includes("FOUNDRY_NEW_PATH")) {
            foundryPath = data.toString().match(/FOUNDRY_NEW_PATH:(.+)/)[1]
          } else {
            console.log(data.toString())
          }
        }
        child.onClose = async (code) => {
          // If install script is successful and source command is found, source current profile
          if (code === 0 && foundryPath) {
            // Clean previous foundry install folders
            deleteDirectory(`${foundryPath}/../versions`)

            process.env.PATH += `:${foundryPath}`
            const child = new Child('install', 'foundryup', {respawn: false, env: { SHELL: shellPath}})

            child.onError = (error) => {
              console.error(error.toString())
            }

            child.onData = (data) => {
              console.log(data.toString())
            }

            // If the command is successful, run "forge install"
            child.onClose = async (code) => {
              if (code === 0) {
                await installDependencies()
              } else {
                console.log("Failed to install Foundry. Please try again.")
              }
            }
          } else {
            console.error("Failed to install foundryup.");

          }
        }
      } 
      else {
        console.log("Foundry is required to run this command. Install Foundry to continue.")
      }
    }
  }
} else {
  console.log("Hello via Vibe CLI!");
  console.log("Please use \"vibe help\" to see the available commands.");
}

async function installDependencies() {
  if (!fs.existsSync(`${process.cwd()}/vibe.config.js`)) await main()
  else {
    const child = new Child('install', 'forge install')

    child.onData = (data) => {
      console.log(data.toString())
    }

    child.onError = (error) => {
      console.error(error.toString())
    }

    child.onClose = async (code) => {
      if (code === 0) {
        await main();
      } else {
        console.log("Failed to install dependencies. Please try again.")
      }
    }
  }
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
  } else if (cmd === "curl") {
    await (await import("./curl.js")).main();
  } else if (cmd === "refresh") {
    await (await import("./refresh.js")).main();
  } else {
    console.log("Invalid command. Please type \"vibe help\" to see the available commands.")
  }
  if (sourceCommand) {
    console.warn("\n")
    console.warn("Your terminal session is out of date as foundry was just installed!")
    console.warn(`Run '${sourceCommand}' or start a new terminal session.`)
  }
}