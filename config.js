export default {
  paths: {
    src: 'contracts/src',
    out: 'contracts/out',
    scripts: 'contracts/scripts',
    dest: ['contracts/deployed']
  },
  chains: {
    ...(await import('@wagmi/core/chains'))
  }
}