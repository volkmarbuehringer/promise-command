"use strict";


const debug = require("debug")("test17");
const moment = require("moment");
const pino = require("pino")();
const request = require("request-promise-native");
const needle = require("needle");
const http = require("http");

const Pool = require("pg-pool");


const pool = new Pool({
  user: "postgres",
  password: "PRO213sam15",
  host: "localhost",
  database: "mosam",
  max: 1, //set pool max size to 20
  min: 1, //set min pool size to 4
  idleTimeoutMillis: 10000 //close idle clie
});


const agent = new http.Agent({
  //      keepAlive: true,
  //    maxFreeSockets: 500
});

let controller = require("promise-command")({
  parallel: 100,
  limit: 3000000,
  errorlimit: 100,
  collect: false
});


/*
const superrequest = request.defaults({
  agent,
  timeout: 6000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 6.4; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2225.0 Safari/537.36"
  }
});
*/

needle.defaults({
  //  agent,
  open_timeout: 500,
  read_timeout: 100,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 6.4; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2225.0 Safari/537.36"
  }
});

const needleget = (obj) => new Promise((resolve, reject) => needle.get("http://localhost:4000/los/" + obj.l_id, (err, result) => err ? reject(err) :
  result.statusCode === 200 ? resolve(result.body) : reject(new Error("fehler bei get"))));

const needleput = (obj) => new Promise((resolve, reject) => needle.put("http://localhost:4000/los/" + obj.l_id, {
    "l_iban": "wi555555555555555",
    "lgag": 47171
  }, (err, result) => err ? reject(err) :
  result.statusCode === 200 ? resolve(result.body) : reject(new Error("fehler bei put"))));


setInterval(() => pino.info(controller.statistik(), "statistik"), 5000).unref();


process.on("unhandledRejection", (reason, p) => {
  pino.error(reason, "Unhandled Rejection at: Promise", p);
  // application specific logging, throwing an error, or other logic here
});


//function for test purposes, uses tester function from controller

/*
const crawler1 =
  (obj) => Promise.resolve(obj)
  .then((obj) => {
    obj.start = moment.now("X");
    obj.message = null;

    return obj;
  })
  .then((obj) => superrequest({
      uri: "http://localhost:4000/los/"+obj.l_id
    }))
  ;


const crawler =
  (obj) => Promise.resolve(obj)
  .then((obj) => {
    obj.start = moment.now("X");
    obj.message = null;

    return obj;
  })
.then((obj) => superrequest({
  method: "PUT",
  json: {
    "l_iban":"wi555555555555555",
    "lgag": 47171
},
    uri: "http://localhost:4000/los/"+obj.l_id
  }))
  ;
*/


const crawler1 =
  (obj) => Promise.resolve(obj)
  .then((obj) => Object.assign(obj, {
    start: moment.now("X"),
    message: null
  }))
  .then((obj) => needleget(obj))
  //.then((obj=>controller.tester(obj)))
;

const crawler =
  (obj) => Promise.resolve(obj)
  .then((obj) => Object.assign(obj, {
    start: moment.now("X"),
    message: null
  }))
  .then((obj) => needleput(obj))
  //.then((obj=>controller.tester(obj)))
;


// user supplied generator function, which iterates 2 times over the test array and pauses

function* starter(res, dann = moment.now("X")) {

  for (let i = 0; i < 5; i++) {
    yield* controller.waiter(dann + i * 40000);

    for (const c of res) {
      yield controller.startOne(crawler, c);
      yield controller.startOne(crawler1, c);
    }
    //yield* controller.startAll(res, crawler);
    //yield* controller.startAll(res, crawler1);
  }
  return;
}

let count = 100000;
if (process.argv.length === 3) {
  count = parseInt(process.argv[2]);
}

//main code
Promise.resolve()
  .then(() => pool.query("select * from edv.los limit $1", [count]))
  //  .then((obj) => needleget(obj.rows[0]))
  .then((res) => controller.runner(starter(res.rows)))
  .then((x) => {
    if (controller.errcollector.length > 0) {
      pino.info(controller.errcollector, "finished with error");
    } else {
      pino.info(x, "finished");
    }


    pool.end();
  })
  .catch((err) => {
    pino.error(err[0], "exit with errors: %d", err.length);
    pool.end();
  });
