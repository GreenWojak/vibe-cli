export default {
  chains: {
    localhost: {
      deployerPrivateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
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