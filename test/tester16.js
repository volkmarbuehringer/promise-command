"use strict";

const util = require("util");
util.inspect.defaultOptions.colors = true;
// Debug wird mit NODE_DEBUG="controller" im Environment eingeschaltet
const debug = util.debuglog("tester16");

const VError=require("verror");
const request = require("request-promise-native");
const express = require("express");
const pino = require("express-pino-logger")();
const pino1 = require("pino")();
const app = express();
app.use(pino);

const http = require("http");
const Pool = require("pg-pool");
const parseString = require("xml2js").parseString;


const moment = require("moment");

const pool = new Pool({
  max: 30, //set pool max size to 20
  min: 10, //set min pool size to 4
  idleTimeoutMillis: 10000 //close idle clie
});


const inter1=setInterval(() => pino1.info(controller.statistik(), "sockets: "), 5000).unref();

process.on("unhandledRejection", (reason, p) => {
  pino1.error(reason, "Unhandled Rejection at: Promise");
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
      throw new VError(obj.message.substr(0,40));
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

/*
pool.on("error", (error, client) => {
  // handle this in the same way you would treat process.on('uncaughtException')
  // it is supplied the error as well as the idle client which received the error
  pino1.error(error, "pg-pool", client);
});
*/

const Controller = require("./controller2.js");

const controller = new Controller({
  parallel: 40,
  //limit : 100,
  fun: crawler
});



const inter2=setInterval(controller.checkAgent(agent).bind(controller), 1000).unref();


function errorMessage(err, req, res, next) {

  req.log.error(err, "errorexit");
  res.status(400).json({
    error: err.message
  });

}


app.use(errorMessage);


app.enable("trust proxy");

app.set("etag", "strong");
app.disable("x-powered-by");


app.listen(3000);



app.get("/statistik",function statistik(req, res) {

  res.status(200).json(controller.statistik());
} );

app.get("/laststart",function statistik(req, res) {
  res.status(200).json({started: controller.started,lastStarted: controller.lastStarted, lastFinished: controller.lastFinished });

} );


app.get("/errorlist",function errorlist(req, res) {
  // each request has its own id
  // so you can track the log of each request
  // by using `req.log`
  // the ids are cycled every 2^31 - 2
//  req.log.info(req.params, "vor db");

  res.status(200).json([...controller.errcollector]);
} );


app.get("/oldlist",function oldlist(req, res) {
  // each request has its own id
  // so you can track the log of each request
  // by using `req.log`
  // the ids are cycled every 2^31 - 2
//  req.log.info(req.params, "vor db");
  debug("hier params",req.query);

  res.status(200).json(controller.checkRunning(req.query.minTime||2));
} );



Promise.resolve()
  .then(() => pool.query("select id from weburl order by id"))
  .then((res) => controller.runner(res.rows))
  .then((x) => {
    clearInterval(inter1);
    clearInterval(inter2);
    pino1.info(x, "finished");
    pool.end();
  })
  .catch((err) => {
    clearInterval(inter1);
    clearInterval(inter2);
    pool.end();
    pino1.error(err[0], "exit with errors: %d", err.length);
  });
