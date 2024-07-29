export default {
  paths: {
    src: 'vibe/src',
    out: 'vibe/out',
    scripts: 'vibe/scripts',
    dest: ['vibe/deployed']
  },
  chains: {
    ...(await import('viem/chains'))
  }
}