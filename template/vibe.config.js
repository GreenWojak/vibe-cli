export default {
  chains: {
    polygon: {
      rpcUrls: {
        default: {
          http: "https://polygon.rpc.blxrbdn.com"
        }
      },
    }
  },
  compile: [
    { fileName: "Counter", contracts: ["Counter"] },
  ],
  deploy: {
    localhost: [
      { 
        fileName: "Counter", contracts: [{ name: "Counter", args: {} }] 
      },
    ]
  },
  calls: {
    localhost: {
      increment: { fileName: "Counter", script: "Increment"  },
      decrement: { fileName: "Counter", script: "Decrement"  }
    }
  }
}