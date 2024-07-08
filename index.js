#!/usr/bin/env node
// @ts-nocheck

import inquirer from "inquirer";
import { Child } from './util.js'
import { exec } from "child_process";

// Get first argument
const arg = process.argv[2];

// Routing based on the first argument

// Check if arg is not empty
if (arg) {
  // If so, check if Foundry is installed
  // Try running "forge --help"
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

      // If the user wants to install Foundry, run the install commands: "curl -L https://foundry.paradigm.xyz | bash" and "foundryup"
      if (install) {
        console.log("Installing Foundry...");
        const child = new Child('install', 'curl -L https://foundry.paradigm.xyz | bash')

        child.onError = (error) => {
          console.error(error)
        }

        // If the command is successful, run the next command
        child.onClose = async (code) => {
          // Run the next command
          const child = new Child('install', 'source /root/.bashrc')

          // If the command is successful, run the next command
          child.onClose = async (code) => {
            // Run the next command
            const child = new Child('install', 'foundryup')

            child.onData = (data) => {
              console.log(data.toString())
            }

            // If the command is successful, run the main function
            child.onClose = async (code) => {
              await main();
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
}

async function main() {
  if (arg === "init") {
    await (await import("./init.js")).main();
  } else if (arg === "fork") {
    await (await import("./fork.js")).main();
  } else if (arg === "deploy") {
    await (await import("./deploy.js")).main();
  } else if (arg === "compile") {
    await (await import("./compile.js")).main();
  } else if (arg === "check") {
    await (await import("./check.js")).main();
  } else if (arg === "call") {
    await (await import("./call.js")).main();
  } else if (arg === "supply") {
    await (await import("./supply.js")).main();
  } else {
    console.log("Invalid command. Please use one of the following commands: init, fork, deploy, compile, check, call, supply.");
  }
}