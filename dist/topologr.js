

/////////////////////// MyLogger ////////////////////////////////////////////
let logLevel = {
  always: -1,
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};
let currentLogLevel = "http";
let loggerURL = `${serverURL}/log`;
function log(level, message) {
  if (logLevel[level] > logLevel[currentLogLevel]) return;
  const params = {
    level: level,
    message: JSON.stringify(message),
  };
  const options = {
    method: "POST",
    headers: new Headers({ "content-type": "application/json" }),
    body: JSON.stringify(params),
  };
  fetch(loggerURL, options)
    .then((response) => response.json())
    .then((response) => {
      currentLogLevel = response;
    });
}

///////////////////////////////////////////////////////////////////

var allSpan = [];

var selectedNode;
var nodeGroup = [];
var nodecolors = {};
var data = {};
// create an nodes and links array
let nodeArray = [];
var edgeArray = [];

//set up the  the color-picker handler
var color1 = document.getElementById("color1");
color1.addEventListener("input", getCurrentColorFromPicker);

const visNetworkOptions = {
  // TODO: Figure out how to throw this up into a side panel, Toggle on/off
  // configure: {
  //   enabled: true,
  //   filter: 'nodes', //,edges',
  //   container: undefined,
  //   showButton: true
  // },
  nodes: {
  },
  edges: {
    //"selfReferenceSize": null,
    selfReference: {
      angle: 0.7853981633974483,
    },
    shadow: {
      enabled: false,
    },
    smooth: {
      forceDirection: "none",
    },
  },
  physics: false,
};

//data insertion from server
//convert codes back to characters


log("debug", meshLinks);

//get position and color data from local storage if it exists
nodePositions = getNodePositionsFromLocalStorage();
nodeColors = getNodeColorsFromLocalStorage();

processTopology();

//initialize vis.js data structures with nodes and edges
var nodes = new vis.DataSet(nodeArray);
var edges = new vis.DataSet(edgeArray);
var data = {
  nodes: nodes,
  edges: edges,
};
var container = document.getElementById("mynetwork");

// create the network
var network = new vis.Network(container, data, visNetworkOptions);

function processTopology(){
  //process all the topology links
  for (let i = 0; i < meshLinks.length; i++) {
    //don't process links with undefined nodes.
    if (
      meshLinks[i].hasOwnProperty("from") ||
      meshLinks[i].hasOwnProperty("to")
    ) {
      let extraOptions = {};
      //if the link cost is < 0.1 then it's a DtD node so color it red
      if (meshLinks[i].ecost < 0.1)
        extraOptions = {
          //color: "red",
          title: "DtD",
        };
      //add the edge topology data to vis
      //set the edge width inversely proportional to the cost
      edgeArray.push({
        from: meshLinks[i].from,
        to: meshLinks[i].to,
        arrows: {
          to: { enabled: true },
        },
        title: meshLinks[i].ecost,
        width: 5.0 / (meshLinks[i].ecost + 1.0),
        ...extraOptions,
      });
      // Add the nodes
      if (meshLinks[i].hasOwnProperty("from")) {
        addNode(meshLinks[i].from);
      }
      if (meshLinks[i].hasOwnProperty("to")) {
        addNode(meshLinks[i].to);
      }
    } else {
      log("warn", `wtf: ${meshLinks[i]}`);
    }
    for (nodeName in nodePositions) {
      addNode(nodeName);
    }
  }
}

// open a dialog function
function openFileDialog (accept, multy = false, callback) { 
    var inputElement = document.createElement("input");
    inputElement.type = "file";
    inputElement.accept = accept; // Note Edge does not support this attribute
    if (multy) {
        inputElement.multiple = multy;
    }
    if (typeof callback === "function") {
        inputElement.addEventListener("change", callback);
    }
    inputElement.dispatchEvent(new MouseEvent("click")); 
}

// userButton click event
function openDialogClick () {
    // open file dialog for text files
    openFileDialog("settings.json,application/json", false, fileDialogChanged);
}

// file dialog onchange event handler
function fileDialogChanged (event) {
    [...this.files].forEach(filex => {
      var file = filex,
        reader = new FileReader();
      reader.onload = function (event) {
        log("debug", event.target.result);
        try {
          let ds = JSON.parse(event.target.result);
          //update the nodeArray with the data from the file
          for (let i = 0; i < nodeArray.length; i++) {
            nn = nodeArray[i].id;
            try {
              nodeArray[i].x = ds.nodePositions[nn].x;
              nodeArray[i].y = ds.nodePositions[nn].y;
            } catch (e) {}
            var color;
            try {
              color = ds.nodeColors[nn];
              nodeColors[nn] = color;
            } catch (e) {}
            if (color !== undefined) {
              nodeArray[i].color = color;
            }
            log("debug", nodeArray[i]);
          }
          //save new positions to local storage
          localStorage.setItem(
            "node-positions",
            JSON.stringify(ds.nodePositions)
          );
          //save new colors to local storage
          localStorage.setItem("node-colors", JSON.stringify(ds.nodeColors));
          updateVisNetworkNodes();
        } catch (e) {
          log("warn", e);
        }
      };
      reader.readAsText(file); //start reading the file which triggers reader.onload
    });
}

// userButton click event
function importDialogClick () {
    // open file dialog for text files
    openFileDialog("exportNet.json,application/json", false, importDialogChanged);
}

// file dialog onchange event handler
function importDialogChanged (event) {
    [...this.files].forEach(filex => {
      var file = filex,
        reader = new FileReader();
      reader.onload = function (event) {
        log("debug", event.target.result);
        try {
          let ds = JSON.parse(event.target.result);
          meshLinks = ds.meshLinks
          meshServices = ds.meshServices
          nodeArray = [];
          edgeArray = [];
          processTopology();
          nodeArray.sort();
          updateVisNetworkNodes();
          loadServices();
        } catch (e) {
          log("warn", e);
        }
      };
      reader.readAsText(file); //start reading the file which triggers reader.onload
    });
}


//event handlers
var saveSettingsButton = document.getElementById("saveSettings")
saveSettingsButton.addEventListener("click", OnSaveSettings)     
var loadSettingsButton = document.getElementById("loadSettings")
loadSettingsButton.addEventListener("click", OnLoadSettings)
var clearPosButton = document.getElementById("clearPos")
clearPosButton.addEventListener("click", OnClearPos)
var clearAllButton = document.getElementById("clearAll")
clearAllButton.addEventListener("click", OnClearAll)
var exportNetButton = document.getElementById("exportNet")
exportNet.addEventListener("click", OnExportNet)
var importNetButton = document.getElementById("importNet")
importNet.addEventListener("click", OnImportNet)
var gridNetButton = document.getElementById("gridNet")
gridNet.addEventListener("click", OnGridNet)
var clusterNodeButton = document.getElementById("clusterNode")
clusterNodeButton.addEventListener("click", OnClusterNode)
var LockPosButton = document.getElementById("lockPos")
LockPosButton.addEventListener("click", OnLockPos)

network.on("doubleClick", (mydata) => {
  jump(mydata);
});
network.on("dragEnd", (mydata) => {
  onNodeDrop(mydata);
});
network.on("click", (mydata) => {
  onClick(mydata);
});
network.on("selectNode", async (mydata) => {
  colorNode(mydata);
  await loadNodeInfo(mydata);
});

document.addEventListener("keydown", function (event) {
  onKeydown(event);
});

function OnSaveSettings(){
  log("saving");
  downloadFile(
    //download the position and and color settings into settings.json
    JSON.stringify({
      nodePositions,
      nodeColors,
    }),
    "settings.json"
  );
}

function OnLoadSettings() {
  openDialogClick()
}

function OnClearPos() {
    localStorage.removeItem("node-positions");
    location.reload(true);
}

function OnClearAll() {
  localStorage.removeItem("node-colors");
  OnClearPos();
}

function OnExportNet() {
  console.log("exportNet");
  downloadFile(
    //download the position and and color settings into settings.json
    JSON.stringify({
      meshLinks,
      meshServices,
    }),
    "exportNet.json"
  );
}

function OnImportNet() {
  importDialogClick();
}

function getColorCode() {
  var makeColorCode = '0123456789ABCDEF';
  var code = '#';
  for (var count = 0; count < 6; count++) {
    code =code + makeColorCode[Math.floor(Math.random() * 16)];
  }
  return code;
}

function OnGridNet() {
  nodeArray.sort()
  row = 0;
  col = 0;
  var callsign = ""
  var rColor = rColor = getColorCode()
  var rc = parseInt(Math.sqrt(nodeArray.length))
  for (let i = 0; i < nodeArray.length; i++) {
    if (callsign === null ) {
      callsign = nodeArray[i].id.substr(0, selectedNode.indexOf("-") - 1)
    }
    var tmp = nodeArray[i].id.substr(0, nodeArray[i].id.indexOf("-") - 1)
    if (callsign !== tmp) {
      callsign = tmp
      rColor = getColorCode()
    }
    nodeArray[i] = {
      ...nodeArray[i],
      ...{x:col*150, y:row*80, color: rColor},
    };
    col++
    if (col % rc === 0) {
      row++
      col = 0
    }
  }

  nodePositions = {};
  nodeColors = {};
  for (let i = 0; i < nodeArray.length; i++) {
    //for all the nodes with the callsign
    var na = nodeArray[i].id
    nodePositions[na] = {}
    nodePositions[na].x = nodeArray[i].x
    nodePositions[na].y = nodeArray[i].y
    nodeColors[na] = {}
    nodeColors[na] = nodeArray[i].color; //add the color to the nodeColors map
  }
  localStorage.setItem("node-positions", JSON.stringify(nodePositions));
  localStorage.setItem("node-colors", JSON.stringify(nodeColors)); //save the nodeColors map to local storage

  updateVisNetworkNodes();
}

function OnClusterNode() {
  //get selected node id
  //if null exit
  //find all the edges from the selected node
  //move the to nodes on top of the selected node
  var edgeGroup = [];
  if (selectedNode == null) 
    return;
  var snode = nodeArray.findIndex((n) => n.id === selectedNode)
  edgeGroup = edgeArray.filter((n) => n.from === selectedNode )
  var dist = 480
  for (let i = 0; i < edgeGroup.length; i++){
    var toNode = nodeArray.findIndex((n) => n.id === edgeGroup[i].to)
    if (nodeArray[toNode].locked) continue;
    nodeArray[toNode].x = nodeArray[snode].x + (Math.random() * dist - dist/2)
    nodeArray[toNode].y = nodeArray[snode].y + (Math.random() * dist - dist/2)
  }

  nodePositions = {};
  nodeColors = {};
  for (let i = 0; i < nodeArray.length; i++) {
    //for all the nodes with the callsign
    var na = nodeArray[i].id
    nodePositions[na] = {}
    nodePositions[na].x = nodeArray[i].x
    nodePositions[na].y = nodeArray[i].y
    nodeColors[na] = {}
    nodeColors[na] = nodeArray[i].color; //add the color to the nodeColors map
  }
  localStorage.setItem("node-positions", JSON.stringify(nodePositions));
  localStorage.setItem("node-colors", JSON.stringify(nodeColors)); //save the nodeColors map to local storage

  updateVisNetworkNodes();
}

function OnLockPos() {
  if (selectedNode == null) 
    return;
  var snode = nodeArray.findIndex((n) => n.id === selectedNode)
  nodeArray[snode].locked = !nodeArray[snode].locked;
}


window.onerror = function (msg, source, lineNo, columnNo, error) {
  log(
    "error",
    "Error: " +
      msg +
      "\nScript: " +
      source +
      "\nLine: " +
      lineNo +
      "\nColumn: " +
      columnNo +
      "\nStackTrace: " +
      error
  );
  return true;
};

loadServices();

function onKeydown(event) {
  if (event.ctrlKey && event.key === "Enter") {
    // Ctrl+Enter
    //clear saved positions (but not color)
    localStorage.removeItem("node-positions");
    location.reload(true); //force reload
  } else if (event.ctrlKey && event.key === "s") {
    //Ctrl+s - save settings
    downloadFile(
      //download the position and and color settings into settings.json
      JSON.stringify({
        nodePositions,
        nodeColors,
      }),
      "settings.json"
    );
    event.preventDefault(); //don't let the browser handle the ctrl-s, it'll just save the webpage
  }
}

function sortObjectByKeys(o) {
    return Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
}

async function loadServices() {
  //clear out the contents of the nodeData div
  await removeChildren(document.getElementById("nodeData"));
  //set the title
  document.getElementById("nodeName").innerHTML =
    "<center><h3>Mesh Services Directory</h3></center>";
  //render out the meshServices json
  let sortedCalls = sortObjectByKeys(meshServices);
  rjson = "";
  for (callsign in sortedCalls) {
    rjson += `<li><span>${callsign}</span><ul>`;
    let sortedNodes = sortObjectByKeys(sortedCalls[callsign])
    for (nodeName in sortedNodes) {
      rjson += `<li>${nodeName}</li><ul>`;
      let sortedServices = sortObjectByKeys(sortedNodes[nodeName])
      for (service in sortedServices) {
        let txt = "";
        if (sortedServices[service]){
          txt = `<li><a href="${sortedServices[service]}">${service}</a></li>`;
        }
        else{
          txt = `<li>${service}</li>`;
        }
        rjson += txt;
      }
      rjson += "</ul>";
    }
    rjson += "</ul></li>";
  }
  await removeChildren(document.getElementById("nodeData")); //clear it again just in case
  document.getElementById("nodeData").innerHTML = rjson; // appendChild(rjson); //add the data to the nodeData div
  allSpan = document.getElementsByTagName("span");
  for (var x = 0; x < allSpan.length; x++) {
    var childList = allSpan[x].parentNode.getElementsByTagName("li");
    for (var y = 0; y < childList.length; y++) {
      childList[y].style.display = "none";
    }
    allSpan[x].onclick = function () {
      if (this.parentNode) {
        var childList = this.parentNode.getElementsByTagName("li");
        for (var y = 0; y < childList.length; y++) {
          var currentState = childList[y].style.display;
          if (currentState == "none") {
            childList[y].style.display = "block";
          } else {
            childList[y].style.display = "none";
          }
        }
      }
    };
  }
}

async function removeChildren(parent) {
  //does what it says
  if (parent !== null) {
    while (parent.childNodes.length > 0) {
      parent.childNodes[0].remove(); //keep removeing the first element until the length is 0
    }
  }
}

async function loadNodeInfo(mydata) {
  await removeChildren(document.getElementById("nodeData")); //clean out the node data
  if (mydata.nodes.length > 0) {
    selectedNode = mydata.nodes[0];
    //if a node was clicked on
    //set the nodeData title to the node name
    document.getElementById(
      "nodeName"
    ).innerHTML = `<h3>${mydata.nodes[0]}</h3>`;

    //get the URL to open from the vis.js data
    let obj = nodeArray.find((o) => o.id === mydata.nodes[0]);
    //get the nodeData from the server
    let response = await fetch(
      "http://" + location.host + "/info/" + mydata.nodes[0]
    );

    var data;
    if (response.ok) {
      // if HTTP-status is 200-299
      // get the response body (the method explained below)
      data = await response.json();
    } else {
      log("http", `HTTP-Error: ${response.status}`);
    }

    //render the node info json
    renderjson.set_sort_objects(true);
    renderjson.set_show_to_level(1);
    let rjson = renderjson(data);
    if (rjson.textContent === '""') return;

    await removeChildren(document.getElementById("nodeData")); //clean out the nodeData again
    document.getElementById("nodeData").appendChild(rjson); //insert the rendered json into nodeData div
  }
}

//doubleclick event
function jump(mydata) {
  log("debug", mydata);
  //if an node was double clicked
  if (mydata.nodes.length > 0) {
    //get the URT to open from the vis.js data
    let obj = nodeArray.find((o) => o.id === mydata.nodes[0]);
    //open new tab with the node's homepage
    window.open(obj.URL);
  } else {
    //if the background is doubleclicked handle that here.
  }
}

async function clearNodeInfoPanel() {
  //clear node info
  document.getElementById("nodeName").innerHTML = "";
  await removeChildren(document.getElementById("nodeData"));
  color1.style.display = "none"; //hide the color picker
}

function getNodePositionsFromLocalStorage() {
  let nodePositions = JSON.parse(localStorage.getItem("node-positions"));
  if (nodePositions === null) {
    nodePositions = {};
  }
  return nodePositions;
}

function getNodeColorsFromLocalStorage() {
  let nodeColors = JSON.parse(localStorage.getItem("node-colors"));
  if (nodeColors === null) {
    nodeColors = {};
  }
  return nodeColors;
}

function setNodeGroupColorandStore() {
  for (let i = 0; i < nodeGroup.length; i++) {
    //for all the nodes with the callsign
    na = nodeArray.find((n) => n.id === nodeGroup[i].id); //get the index of the node in nodeArray
    na.color = color1.value; //set the color from the colorPicker
    if (nodePositions[na.id] !== undefined) {
      //if the node has a defined position use it
      na.x = nodePositions[na.id].x;
      na.y = nodePositions[na.id].y;
    }
    nodeColors[na.id] = color1.value; //add the color to the nodeColors map
  }
  localStorage.setItem("node-colors", JSON.stringify(nodeColors)); //save the nodeColors map to local storage
  nodeGroup = []; //clear the node group after the colors have been set and stored
}

function updateVisNetworkNodes() {
  nodes = new vis.DataSet(nodeArray);
  edges = new vis.DataSet(edgeArray);
  data = {
    nodes: nodes,
    edges: edges,
  };
  network.setData(data);
}

async function onClick(mydata) {
  if (mydata.nodes.length !== 0) return; //a node was clicked on, don't need to do anything here.
  if (nodeGroup.length !== 0) {
    //there was a node selected then a click on the background
    await clearNodeInfoPanel();
    nodePositions = getNodePositionsFromLocalStorage();
    setNodeGroupColorandStore();
    updateVisNetworkNodes();
  } else {
    //single click on background
    //TODO: Change Network Background Color
    //mynetwork.style.background-color = red;
  }
  await loadServices(); //show the meshServices directory in the data panel
}

function addNode(node) {
  let na = {};
  //is the node already in the nodeArray?
  na = nodeArray.find((n) => n.id === node);
  if (na === undefined) {
    // if the node has NOT already been added
    let n = node;
    if (n.substr(0, 1) !== "1") {
      //if the node name is not 10.x.x.x
      n = n + ".local.mesh";
    }
    let extraOptions = { URL: "http://" + n };
    try {
      extraOptions = {
        //set the node position if it exists already
        ...extraOptions,
        x: nodePositions[node].x,
        y: nodePositions[node].y,
      };
    } catch (e) {}
    try {
      if (nodeColors[node] !== null) {
        //set the node color if it exists
        extraOptions = {
          ...extraOptions,
          color: nodeColors[node],
        };
      }
    } catch (e) {}
    nodeArray.push({
      //push the new data into the nodeArray
      id: node,
      label: node,
      locked: false,
      ...extraOptions,
    });
  }
}

function onNodeDrop(mydata) {
  //when you reposition a node
  saveNodePositionsToLocalStorage(mydata);
}

function saveNodePositionsToLocalStorage(mydata) {
  nodePositions = network.getPositions();
  for (let i = 0; i < nodeArray.length; i++) {
    nodeArray[i] = {
      ...nodeArray[i],
      ...nodePositions[nodeArray[i].id],
    };
  }
  localStorage.setItem("node-positions", JSON.stringify(nodePositions));
}

function colorNode(mydata) {
  color1.style.display = "block"; //show the color picker
  color1.value = "#97C2FC"; //default value if nothing has been set before
  if (nodeColors[mydata.nodes[0]] !== undefined) {
    //if there is a setting, set it in the picker
    color1.value = nodeColors[mydata.nodes[0]];
  }
  selectedNode = mydata.nodes[0];
  //for all the nodes with the same callsign (nodeName up to the first "-") put them inthe nodeGroup array
  nodeGroup = nodeArray.filter((n) =>
    n.id.startsWith(selectedNode.substr(0, selectedNode.indexOf("-") - 1))
  );
}

function getCurrentColorFromPicker() {
  na = nodeArray.find((n) => n.id === selectedNode); //get the index of the selected node in nodeArray
  na.color = color1.value; //set the color of the selected node to the color from the colorpicker
  updateVisNetworkNodes(); //redraw the network
}

function downloadFile(text, name) {
  //because StackOverflow said (I think)
  const a = document.createElement("a");
  const type = name.split(".").pop();
  a.href = URL.createObjectURL(
    new Blob([text], { type: `text/${type === "txt" ? "plain" : type}` })
  );
  a.download = name;
  a.click();
}

function dragAndDropSettings(event) {
  //prevent the default json file handling(displays the file)
  event.preventDefault();
  const [item] = event.dataTransfer.items;
  log("debug", item.getAsFile());
  var file = event.dataTransfer.files[0],
    reader = new FileReader();
  reader.onload = function (event) {
    log("debug", event.target.result);
    try {
      let ds = JSON.parse(event.target.result);
      //update the nodeArray with the data from the file
      for (let i = 0; i < nodeArray.length; i++) {
        nn = nodeArray[i].id;
        try {
          nodeArray[i].x = ds.nodePositions[nn].x;
          nodeArray[i].y = ds.nodePositions[nn].y;
        } catch (e) {}
        var color;
        try {
          color = ds.nodeColors[nn];
          nodeColors[nn] = color;
        } catch (e) {}
        if (color !== undefined) {
          nodeArray[i].color = color;
        }
        log("debug", nodeArray[i]);
      }
      //save new positions to local storage
      localStorage.setItem(
        "node-positions",
        JSON.stringify(ds.nodePositions)
      );
      //save new colors to local storage
      localStorage.setItem("node-colors", JSON.stringify(ds.nodeColors));
      updateVisNetworkNodes();
    } catch (e) {
      log("warn", e);
    }
  };
  reader.readAsText(file); //start reading the file which triggers reader.onload
}

function dragover_handler(event) {
  //required for drag and drop to work
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}