#!/usr/bin/env node
// @ts-nocheck
// TODO: Add optional project name argument

import inquirer from 'inquirer';
import * as fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Child } from './util.js';

const CURR_DIR = process.cwd();
const __dirname = dirname(fileURLToPath(import.meta.url));

//const CHOICES = fs.readdirSync(`${__dirname}/templates`);

let projectName = process.argv[3];

// const QUESTIONS = [
//   {
//     name: 'project-choice',
//     type: 'list',
//     message: 'What project template would you like to generate?',
//     choices: CHOICES,
//   },
//   {
//     name: 'project-name',
//     type: 'input',
//     message: 'Project name:',
//     validate: function (input) {
//       if (/^([A-Za-z\-\\_\d])+$/.test(input)) return true;
//       else return 'Project name may only include letters, numbers, underscores and hashes.';
//     },
//     when: () => !projectName,
//   },
// ];

const createDirectoryContents = (templatePath, projectPath) => {
  const filesToCreate = fs.readdirSync(templatePath);

  filesToCreate.forEach(file => {
    const origFilePath = `${templatePath}/${file}`;

    const stats = fs.statSync(origFilePath);

    if (stats.isFile()) {
      const contents = fs.readFileSync(origFilePath, 'utf8');

      if (file === '.npmignore') file = '.gitignore';

      const writePath = `${projectPath}/${file}`;
      fs.writeFileSync(writePath, contents, 'utf8');
    } else if (stats.isDirectory()) {
      fs.mkdirSync(`${projectPath}/${file}`);

      createDirectoryContents(`${templatePath}/${file}`, `${projectPath}/${file}`);
    }
  });
};
export async function main() {
  //inquirer.prompt(QUESTIONS).then(answers => {
  //const projectChoice = answers['project-choice'];
  //projectName = projectName || answers['project-name'];
  const templatePath = `${__dirname}/template`;

  //console.log(projectName);

  //fs.mkdirSync(`${CURR_DIR}/${projectName}`);

  createDirectoryContents(templatePath, CURR_DIR);

  // If package.json exists, make sure type is module. If not, create package.json
  const packageJsonPath = `${CURR_DIR}/package.json`;
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs
      .readFileSync(packageJsonPath)
      .toString()
    );
    packageJson.type = 'module';
    fs.writeFileSync
      (packageJsonPath, JSON.stringify(packageJson, null, 2));
  }
  else {
    fs.writeFileSync(packageJsonPath, JSON.stringify({ type: 'module' }, null, 2));
  }

  console.log('Project initialized');

  const child = new Child('init', `npm install`);
}