"use strict";

const request = require("request-promise-native");
const http = require("http");
const pino = require("pino")();
const Pool = require("pg-pool");

const debug = require("debug")("test14");
const moment = require("moment");

const pool = new Pool({
  max: 30, //set pool max size to 20
  min: 10, //set min pool size to 4
  idleTimeoutMillis: 10000 //close idle clie
});

const controller =require("../lib/controller.js")({
  parallel: 30,
  limit: 300,
  errorlimit: 10
});



setInterval(() => pino.info(controller.statistik(), "statistik"), 5000).unref();

process.on("unhandledRejection", (reason, p) => {
  pino.error(reason, "Unhandled Rejection at: Promise", p);
  // application specific logging, throwing an error, or other logic here
});



const agent = new http.Agent({
  //    keepAlive: true,
  //  maxFreeSockets: 500
});


const superrequest = request.defaults({
  agent,
  timeout: 6000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 6.4; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2225.0 Safari/537.36"
  }
});

//Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1



const differ = (obj) => Promise.resolve()
  .then(() => {
    obj.ende = moment.now("X");
    obj.diff = obj.ende - obj.start;
    if (obj.res) {
      obj.len = obj.res.length;
      delete obj.res;
    } else {
      obj.len = null;
    }

    //  debug(obj);
  })
  .then(() => pool.query(`insert into weblog
( start, ende, url , message ,len )
          values($1,$2,$3,$4,$5 )`, [obj.start, obj.ende, obj.url, obj.message || "", obj.len]))
  .then(() => obj);


const crawler =
  (obj) => Promise.resolve(obj)
  .then((obj) => {
    obj.start = moment.now("X");
    obj.message = null;

    return obj;
  })
  .then((obj) =>  controller.tester(obj)
  .then(()=>obj) /* superrequest({
      uri: obj.url
    }).then((res) => Object.assign(obj, {
      res
    }))*/
  //  .catch((err) => Object.assign(obj, {
  //    message: err.message
  //  }))
  )
  .then(differ);


//pino.info("vor start %d", webber.length);

pool.on("error", (error, client) => {
  // handle this in the same way you would treat process.on('uncaughtException')
  // it is supplied the error as well as the idle client which received the error
  pino.error(error, "pg-pool",client);
});

function *starter(res,  dann=moment.now("X")) {

 try{
   for (let i = 0; i < 2; i++) {
       yield *controller.waiter(dann + i * 200000);
       yield *controller.startAll(res,crawler);
   }
 }
 catch( e){
   if ( e !== "End"){
     throw e;
   }
 }

}

Promise.resolve()
  .then(() => pool.query("select 'http://'||url as url from weburl order by url"))
  .then((res) => controller.runner(starter(res.rows)))
  .then((x) => {
    pino.info(x, "finished");
    pool.end();
  })
  .catch((err) => {
    pool.end();
    pino.error(err, "exit with error");
  });
