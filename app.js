const express = require("express");
const expressip = require("express-ip");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const dns = require("dns");
const dnsPromises = dns.promises;
const storage = require("node-persist");
const winston = require("winston");

//setup winston logger
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
      level: "http",
    }),
  ],
});

//setup express
var app = express();
let port = 3001;
app.listen(port, function () {
  logger.info(`Started application on port ${port}`);
});

app.use(express.static("assets"));
app.use(express.static("dist"));
app.use(expressip().getIpInfoMiddleware);
app.set("view engine", "ejs");

//routes
app.get("/", function (req, res) {
  logger.http(req.ipInfo.ip.replace("::ffff:", "") + ` ${req.url}`);
  main(res);
});
app.get("/info/:nodeName", async function (req, res) {
  logger.http(req.ipInfo.ip.replace("::ffff:", "") + ` ${req.url}`);
  var d = await getNodeData(req.params.nodeName);
  return res.json(d);
});

//variable declarations
let meshSSID = "";
let links = [];
let meshIPMap = {};

//initialize node local storage
initStorage();

//================ FUNCTIONS ===================//

async function initStorage() {
  await storage.init();
  let tmp = await storage.getItem("meshIPMap");
  if (tmp === undefined) {
    meshIPMap = {};
  } else {
    meshIPMap = JSON.parse(tmp);
  }
}

async function getJsonDataFromURL(URL){
  do {
    try {
      //get local node's sysinfo API data and convert to json object
      data = await (
        await load(
          URL
        )
      ).json();
    } catch (e) {
      data = null;
      logger.error("localnode sysinfo failed to load");
    }
  } while (data === null); //if there was an error, try again
  logger.debug(data);
  return data;
}

async function processLinks(data){
  //clear out the links table
  var links = [];
  for (let i = 0; i < data.topology.length; i++) {
    //for each link in the topology add the nodes
    //get the node names for each end of the link
    let nfrom = await getNodeName(data.topology[i].lastHopIP);
    let nto = await getNodeName(data.topology[i].destinationIP);
    await storage.setItem("meshIPMap", JSON.stringify(meshIPMap)); //store the map in localstorage
    links.push({
      //add the data to the links table to pass to the front end
      from: nfrom,
      to: nto,
      pcost: data.topology[i].pathCost,
      ecost: data.topology[i].tcEdgeCost,
    });
  }
  logger.debug(links);
  return links;
}

async function processServices(data){
  //build the mesh services map
  var services = {}; //{callsign: {nodeName: [{serviceName: URL}, ...]}}
  for (let i = 0; i < data.services.length; i++) {
    let service = data.services[i];
    let nn = meshIPMap[service.ip];
    let callsign = nn.substr(0, nn.search("-"));
    if (services[callsign] === undefined) services[callsign] = {};
    if (services[callsign][nn] === undefined) services[callsign][nn] = {};
    services[callsign][nn][service.name] = service.link;
  }
  return services;
}

async function main(res) {
  var jdata = await getJsonDataFromURL(
    "http://localnode.local.mesh/cgi-bin/sysinfo.json?hosts=1&services=1&link_info=1"
  );
  meshSSID = jdata.meshrf.ssid;
  //for each host
  for (let i = 0; i < jdata.hosts.length; i++) {
    meshIPMap[jdata.hosts[i].ip] = jdata.hosts[i].name;
  }
  //process the services map
  services = await processServices(jdata);

  //get the local node's 9090 json data dump (this has everything!)
  var odata = await getJsonDataFromURL("http://localnode.local.mesh:9090");
  //process the links array
  links = await processLinks(odata);

  //You've been served
  res.render("index", {
    meshLinks: JSON.stringify(links),
    meshName: meshSSID,
    meshServices: JSON.stringify(services),
  });
}

async function getNodeName(ip){
    let name = meshIPMap[ip]; //is it already in the map?
    if (name === undefined) {
      try {
        name = await dnsPromises.reverse(ip); //if not try a reverse dns
        meshIPMap[ip] = name;
      } catch (e) {
        name = ip; //if all else fails just set the name to the ip address
      }
    }
    return name;
}

async function load(url) {
  let obj = null;
  try {
    obj = await await fetch(url, { timeout: 3000 }); //why two awaits?  because... that's why
  } catch (e) {
    logger.warn(`${url} fetch failed:\n ${e.stack}`);
  }
  logger.debug(obj);
  return obj;
}

async function getNodeData(node) {
  logger.debug(node);
  try {
    if (node.substr(0, 3) !== "10.") { //if the nodeName is NOT an ip address 10.x.x.x
      node = node + ".local.mesh";
    }
    out = await (
      await load(
        "http://" + node + "/cgi-bin/sysinfo.json?services_local=1&link_info=1"
      )
    ).json();
    logger.verbose(node + ":: " + JSON.stringify(out));
  } catch (e) {
    logger.warn(`${node} info request failed:\n ${e.stack}`);
    out = "";
  }
  return out;
}
