const path = require("path");
const Web3 = require("web3");

const opt = require(path.join(__dirname, "../opt.json"));

const web3 = new Web3(new Web3.providers.HttpProvider(`http://${opt.serv.hosts[0]}:${opt.serv.rpc_port}`));

web3.eth.personal.getAccounts().then(([addr]) => {
  web3.eth.personal.unlockAccount(addr, opt.signature.pass_phrase, 0, () => {
    new web3.eth.Contract(opt.smart_contract.abi)
      .deploy({ data: opt.smart_contract.bytecode })
      .send({ from: addr, gas: "0x3d0900" })
      .on("receipt", (receipt) => console.log(receipt));
  });
});
