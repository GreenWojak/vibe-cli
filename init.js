#!/usr/bin/env node
// @ts-nocheck

import inquirer from 'inquirer';
import * as fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Child } from './util.js';

const CURR_DIR = process.cwd();
const __dirname = dirname(fileURLToPath(import.meta.url));

let projectName = process.argv[3];

const createDirectoryContents = (templatePath, projectPath) => {
  const filesToCreate = fs.readdirSync(templatePath);

  filesToCreate.forEach(file => {
    const origFilePath = `${templatePath}/${file}`
    const stats = fs.statSync(origFilePath)

    if (stats.isFile()) {
      const contents = fs.readFileSync(origFilePath, 'utf8')
      const writePath = `${projectPath}/${file}`
      fs.writeFileSync(writePath, contents, 'utf8')
    } else if (stats.isDirectory()) {
      fs.mkdirSync(`${projectPath}/${file}`)

      createDirectoryContents(`${templatePath}/${file}`, `${projectPath}/${file}`)
    }
  });
};

export async function main() {
  const templatePath = `${__dirname}/template`;

  if (projectName) {
    fs.mkdirSync(`${CURR_DIR}/${projectName}`);
    createDirectoryContents(templatePath, `${CURR_DIR}/${projectName}`);
  } else {
    createDirectoryContents(templatePath, CURR_DIR);
  }

  console.log('Project initialized');

  const child = new Child('init', `npm install`);
}
