import { curl } from './util.js'

const command = process.argv[3]
const args = process.argv.slice(4)

export async function main() {
  await curl(command, args)
}