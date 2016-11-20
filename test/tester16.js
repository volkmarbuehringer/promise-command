"use strict";

const request = require("request-promise-native");
const http = require("http");
const pino = require("pino")();
const Pool = require("pg-pool");
const parseString = require("xml2js").parseString;

const debug = require("debug")("tester16");
const moment = require("moment");

const pool = new Pool({
  max: 30, //set pool max size to 20
  min: 10, //set min pool size to 4
  idleTimeoutMillis: 10000 //close idle clie
});


const inter1=setInterval(() => pino.info(controller.statistik(), "sockets: "), 5000).unref();

process.on("unhandledRejection", (reason, p) => {
  pino.error(reason, "Unhandled Rejection at: Promise");
  // application specific logging, throwing an error, or other logic here
});


const agent = new http.Agent({
  //    keepAlive: true,
  //  maxFreeSockets: 500
});



const superrequest = request.defaults({
  agent,
  //  timeout: 6000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1" //"Mozilla/5.0 (Windows NT 6.4; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2225.0 Safari/537.36"
  }
});

//Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1


const differ = (obj) => Promise.resolve()
  .then(() => {

    obj.ende = moment.now("X");
    if (obj.res) {
      obj.len = obj.res.length;
    } else {
      obj.len = null;
    }

    return new Promise((resolve, reject) => parseString(obj.res, {
      explicitArray: true
    }, (err, result) => {
      if (err) {
        //reject(err);
        resolve();
      } else {
        resolve();
      }
    }));
    //  debug(obj);
  })
  .then(() => pool.query(`insert into weblog
( start, ende, url , message ,len,data )
          values($1,$2,$3,$4,$5,$6 )`, [obj.start, obj.ende, obj.url, obj.message || "", obj.len, obj.res || ""]))
  .then(() => {
    if (obj.message) {
      throw new Error("Fehler:" + obj.message);
    } else {
      delete obj.res;
      return obj;
    }
  });


const crawler =
  (obj) => Promise.resolve(obj)
  .then(() => pool.query("select url from weburl where id = $1", [obj.id]))
  .then((res) => {
    if (res.rows.length === 1) {
      Object.assign(obj, res.rows[0]);
    }
    return obj;
  })
  .then((obj) => pool.query("select count(*) anz,max(ende-start) maxer,min(ende-start) miner from weblog where url = $1 group by url", [obj.url]))
  .then(() => {
    obj.start = moment.now("X");
    obj.message = null;

    return obj;
  })
  .then((obj) => superrequest({
    uri: "http://" + obj.url
  }))
  .then((res) => Object.assign(obj, {
    res
  }))
  .catch((err) => Object.assign(obj, {
    message: err.message
  }))
  .then(differ);


//pino.info("vor start %d", webber.length);

pool.on("error", (error, client) => {
  // handle this in the same way you would treat process.on('uncaughtException')
  // it is supplied the error as well as the idle client which received the error
  pino.error(error, "pg-pool", client);
});

const Controller = require("./controller2.js");

const controller = new Controller({
  parallel: 40,
  //limit : 100,
  fun: crawler
});



const inter2=setInterval(controller.checkAgent(agent).bind(controller), 1000).unref();




Promise.resolve()
  .then(() => pool.query("select id from weburl order by id"))
  .then((res) => controller.runner(res.rows))
  .then((x) => {
    clearInterval(inter1);
    clearInterval(inter2);
    pino.info(x, "finished");
    pool.end();
  })
  .catch((err) => {
    clearInterval(inter1);
    clearInterval(inter2);
    pool.end();
    pino.error(err[0], "exit with errors: %d", err.length);
  });
