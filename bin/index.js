const path = require("path");
const Web3 = require("web3");

const key = require(path.join(__dirname, "../privateKeys.json"));
const opt = require(path.join(__dirname, "../opt.json"));

const app = {
  contract: {
    options: {
      gas: "0x493e0",
    },
    test_creation: {
      doc_hash: "ee41cb27cd58",
      doc_SN: opt.smart_contract.document.id_beginning,
      receiver: opt.smart_contract.employee.id_beginning.toString(),
    },
    test_logging: {
      doc_hash: "ee41cb27cd58",
      doc_SN: opt.smart_contract.document.id_beginning.toString(),
      doc_status: 1,
    },
  },
  iteration: {
    append_logs_per_round: 200,
    counter: 0,
    create_docs_per_round: 200,
    delay: 1000, // 1s
    killer_round: 600,
    nonce: 0,
    work_round: 10 * 60 * 60, // 10h
  },
};

const cli_opt = require("node-getopt")
  .create([
    [
      "a",
      "append-logs-per-round=ARG",
      `number of logs would be appended in each round (default: ${app.iteration.append_logs_per_round})`,
    ],
    [
      "c",
      "create-docs-per-round=ARG",
      `number of documents would be created in each round (default: ${app.iteration.create_docs_per_round})`,
    ],
    ["h", "help", "show this help"],
    ["r", "killer-round=ARG", `number of rounds would be conducted (default: ${app.iteration.killer_round})`],
  ])
  .bindHelp()
  .parseSystem();
cli_opt.options.a && (app.iteration.append_logs_per_round = parseInt(cli_opt.options.a));
cli_opt.options.c && (app.iteration.create_docs_per_round = parseInt(cli_opt.options.c));
cli_opt.options.r && (app.iteration.killer_round = parseInt(cli_opt.options.r));

const web3s = opt.serv.hosts.map(
  (host) => new Web3(new Web3.providers.WebsocketProvider(`ws://${host}:${opt.serv.ws_port}`)),
);

app.contract.instance = new web3s[0].eth.Contract(
  opt.smart_contract.abi,
  opt.smart_contract.address,
  app.contract.options,
);

const sendTransaction = (web3, data, nonce, private_key) => {
  web3.eth.accounts
    .signTransaction(
      {
        nonce: nonce,
        to: opt.smart_contract.address,
        gas: app.contract.options.gas,
        value: "0x0",
        chainId: "0xa",
        data: data,
      },
      private_key,
    )
    .then((tx) => web3.eth.sendSignedTransaction(tx.rawTransaction));
};

const interval = setInterval(() => {
  console.log(`Starting round ${app.iteration.counter + 1} / ${app.iteration.killer_round}...`);

  if (++app.iteration.counter === app.iteration.killer_round) {
    clearInterval(interval);
  }

  const round = app.iteration.counter % 86400; // 1 day

  const nonce = `0x${(app.iteration.nonce++).toString(16)}`;

  for (let i = 0; i < app.iteration.create_docs_per_round; i++) {
    sendTransaction(
      web3s[i % web3s.length],
      app.contract.instance.methods
        .create(
          web3s[0].utils.fromAscii(`${++app.contract.test_creation.doc_SN}`),
          web3s[0].utils.fromAscii(app.contract.test_creation.receiver),
          web3s[0].utils.fromAscii(`${i}`),
          web3s[0].utils.fromAscii(app.contract.test_creation.doc_hash),
          Date.now(),
          app.contract.test_logging.doc_status,
        )
        .encodeABI(),
      nonce,
      key[i].private_key,
    );
  }

  for (let i = 0, j = app.iteration.create_docs_per_round; i < app.iteration.append_logs_per_round; i++, j++) {
    sendTransaction(
      web3s[j % web3s.length],
      app.contract.instance.methods
        .log(
          web3s[0].utils.fromAscii(app.contract.test_logging.doc_SN),
          web3s[0].utils.fromAscii(app.contract.test_logging.doc_hash),
          Date.now(),
          app.contract.test_logging.doc_status,
        )
        .encodeABI(),
      nonce,
      key[j].private_key,
    );
  }
}, app.iteration.delay);
