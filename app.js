const express = require("express");
const expressip = require("express-ip");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const dns = require("dns");
const dnsPromises = dns.promises;
const storage = require("node-persist");
const winston = require("winston")

const myformat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.align(),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: myformat,
      level: "info",
    }),
  ],
});

var app = express();
let port = 3001;

app.use(express.static("assets"));
app.use(express.static("dist"));
app.use(expressip().getIpInfoMiddleware);
app.set("view engine", "ejs");

let names = {}; //dict to hold ip addresses & hostnames names[ip] = hostname
let meshSSID = "";
let jdata = {};
let odata = {};
let links = [];
let meshIPMap = {};

initStorage();

app.get("/", function (req, res) {
  logger.info(req.ipInfo.ip.replace("::ffff:", "")+ ` ${req.url}`);
  main(res);
});

app.get("/info/:nodeName", async function (req, res) {
  var d = await getNodeData(req.params.nodeName);
  return res.json(d);
});

app.listen(port, function () {
  logger.info(`Started application on port ${port}`);
});

async function initStorage() {
  await storage.init();
  let tmp = await storage.getItem("meshIPMap");
  if (tmp === undefined) {
    meshIPMap = {};
  } else {
    meshIPMap = JSON.parse(tmp);
  }
}

async function main(res) {
  jdata = await (
    await load(
      "http://localnode.local.mesh/cgi-bin/sysinfo.json?hosts=1&services=1&link_info=1"
    )
  ).json();
  logger.debug(jdata)
  meshSSID = jdata.meshrf.ssid;
  do {
    try {
      odata = await (await load("http://localnode.local.mesh:9090")).json();
    } catch (e) {
      odata = null;
    }
  } while (odata === null);
  logger.debug(odata)
  names = {};
  for (let i = 0; i < jdata.hosts.length; i++) {
    names[jdata.hosts[i].ip] = jdata.hosts[i].name;
    meshIPMap[jdata.hosts[i].ip] = jdata.hosts[i].name;
  }
  links = [];
  for (let i = 0; i < odata.topology.length; i++) {
    let nfrom = meshIPMap[odata.topology[i].lastHopIP];
    if (nfrom === undefined)
      try {
        nfrom = await dnsPromises.reverse(odata.topology[i].lastHopIP);
        meshIPMap[odata.topology[i].lastHopIP] = nfrom;
      } catch (e) {
        nfrom = odata.topology[i].lastHopIP;
      }
    let nto = meshIPMap[odata.topology[i].destinationIP];
    if (nto === undefined)
      try {
        nto = await dnsPromises.reverse(odata.topology[i].destinationIP);
        meshIPMap[odata.topology[i].destinationIP] = nto;
      } catch (e) {
        nto = odata.topology[i].destinationIP;
      }
    await storage.setItem("meshIPMap", JSON.stringify(meshIPMap));
    links.push({
      from: nfrom,
      to: nto,
      pcost: odata.topology[i].pathCost,
      ecost: odata.topology[i].tcEdgeCost,
    });
  }

  logger.debug(names);
  logger.debug(links);

  // for (let i = 0; i < links.length; i++){
  //   console.log(links[i].from, links[i].to, links[i].pcost);
  //   if (!(links[i].from in meshdata) || meshdata[links[i].from == '']) {
  //     meshdata[links[i].from] = await getNodeData(links[i].from);
  //     console.log(links[i].from + " :from: " + JSON.stringify(meshdata[links[i].from]));
  //   }
  //   else {
  //     console.log(links[i].from + " found")
  //   }
  //   if (!(links[i].to in meshdata) || meshdata[links[i].to == '']) {
  //     meshdata[links[i].to] = await getNodeData(links[i].to);
  //     console.log(links[i].to + ":to: " + JSON.stringify(meshdata[links[i].to]));
  //   }
  //   else {
  //     console.log(links[i].to + " found")
  //   }
  // }

  res.render("index", {
    meshNodes: JSON.stringify(names),
    meshLinks: JSON.stringify(links),
    meshName: meshSSID
  });
}

async function load(url) {
  let obj = null;
  try {
    obj = await await fetch(url, { timeout: 3000 });
  } catch (e) {
    logger.warn(e.stack);
  }
  logger.debug(obj);
  return obj;
}

async function getNodeData(node) {
  logger.debug(node);
  try {
    if (node.substr(0, 1) !== "1") {
      node = node + ".local.mesh";
    }
    out = await (
      await load(
        "http://" + node + "/cgi-bin/sysinfo.json?services_local=1&link_info=1"
      )
    ).json();
    logger.info(node + ":: " + JSON.stringify(out));
  } catch (e) {
    logger.warn(e.stack);
    out = "";
  }
  return out;
}
