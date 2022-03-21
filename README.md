# topologrjs

Topologr is a topology mapper and mesh data explorer for an AREDN mesh network.

This is my first time programming javascript and node.  I learned a lot, but I am sure there are many things which an experienced node.js programmer would do differently.  One requirement I had was that nothing could be loaded from the internet at runtime on the server or the browser.  The second was that I tried to keep page loading time to the browser as fast as possible by keeping everything I could in just one source file. It ends up that was meaningless because the real bottleneck is pulling the data from the mesh.

Comments, criticizms, and especialy pull-requests are also gratefully accepted. (I'm not normally a github user much so I'll have to figure that one out when it happens.)

This work is released to the public domain with the unlicense.  For the legalities
see the LICENSE file in this repository.

- [topologrjs](#topologrjs)
  - [Installation](#installation)
  - [Usage](#usage)
    - [The Basics](#the-basics)
    - [The Data Panel](#the-data-panel)
    - [The Network Panel](#the-network-panel)

## Installation

1. Clean updated install of Ubuntu 20.04 or raspbian
  NOTE: The system this is installed on needs to be connected to the internet and the mesh node.  Explaining how to do this is beyond the scope of these instructions.
2. Install NVM:
  Follow the instructions at [https://github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm)
3. Install the latest Nodejs
  ```
  nvm install node
  ```
4. make a projects directory.
  ```
  mkdir ~/projects; cd ~/projects
  ```
5. Get the repository:
  If you know you want to possible make changes to the code clone the repository at github:
  ```
  git clone https://github.com/captainwasabi/topologrjs.git
  ```
  If you know you won't want to make changes then you can just get the zip file with
  ```
  wget https://github.com/captainwasabi/topologrjs/archive/refs/heads/main.zip
  ```
  then `unzip` the file it downloaded.
6. Switch to the new direcory that has the code
  ```
  cd topologrjs
  ```
7. Install node dependencies
  ```
  npm install
  ```
8. Run it.
  ```
  node app.js
  ```
  This will start the system listenting to port 3001 which is the port I use for testing development versions.  To set the port to something different use
  ```
  PORT=3000 node app.js
  ```
9. if you run
  ```
  ./pushprod.sh
  ```
  from the command line this will create a new directory in the projects folder called topologrjs.dist, kill a process running on port 3000, then start the server in the background and redirecting all the console output to `~/projects/topologr.dist/topologr.log`.  This works for my purposes, but there are definitly more elegant and robust ways of doing it. YMMV

## Usage

### The Basics

Aim your  web browser at `http://<ip>:<port>` where \<ip> is the address of the system running topologer and \<port> is the port it's listening to. Likely 3000 or 3001.  For instance `http://192.168.1.156:3000`

The first time you load the mesh the system will do a pretty bad job of laying out the nodes.  If you reload the page it will generate a new layout.

### The Data Panel

Once the page loads in the Data Panel on the left the Mesh SSID is displayed at the top. This is followed by the Mesh Services Directory which shows all the services that are running on the mesh grouped by callsign->node name->service.  Click the ▶ to
expand an item and the ▽ to collapse an item.

Clicking in a node's color block in the Data Panel brings up a color picker.  As you move around in the color space, or use the slider, or type in the
RGB/HSV/etc values you will see the selected node's color change.  If you then click onto the network background it sets the color of ALL the nodes whose names begin with the same callsign to be the same color. When you reload the page it remembers the colors that have been set.

### The Network Panel

To customize your layout, drag and drop the node where you want to put it.  This locks the position of ALL the nodes.  If you reload the nodes will appear back in the same spots.

To unfreeze all the nodes, click on the background of the network pane and type CTRL+ENTER.  This will erase all the positions, when you reload it will be another random layout.  You can then drag and drop to reposition again.

When you click on a node, information about that node is displayed in the Data pane. The node name is displayed under the Mesh SSID and the node's information is displayed below that in the json explorer format.  In between those two is a color block.

To save the position and color settings, click in the network panel background and hit CTRL-s.  This will download a settings.json file.  You can save it anywhere and name it anything you'd like.  You can send this file to other people on the same mesh.

To restore the settings use your file browser to find the settings.json file then just drag and drop it into the network panel background. The positions and colors from the file are applied.

To clear out all the settings (at least in Chrome) click on the "Not Secure" icon on the left side of the broswer address bar. Onthe panel that appears click Cookies. (I'm not using cookies, this is just where you go.) In the panel that comes up you'll see an ip address or a hostname.  Click on that, then click on Remove.  Reload the page and you are back to a random layout with all the nodes being the default color.

New nodes that have joined the mesh since the last time you looked at it will be placed randomly and colored the default blue. Drag and drop them where you want them and set their color.  If they are from an existing callsign, click on one of the other nodes from this callsign click on the color box, then immediately click on the background. The new node will be assigned the same color.

Nodes that are no longer accessible from the mesh are still shown, but they have no links to them.  To remove them you have to clear the positions with ctrl-enter, reload the page, then reapply a saved settings file. **(NOTE: Need to test this)**

If your browser is running on a mesh connected computer, double-clicking the primary mouse button opens the node's web page in a new tab.  If you are behind the mesh connected computer the tab opens but it fails to load.

Hovering the mouse over a link shows a tooltip with the link's routing cost.  The weight of the link's line is inversely proportional to the cost.  Since cost is inversly proportional to bandwith (Bps) it represents a bigger "pipe."

Scrolling the mouse wheel over the network panel zooms in and out.

*If a selected node is running a version of the AreDN firmware that predates the json api's that are being used then only the node name and the color will be displayed in the data panel. Try to get the node's owner to upgrade their node to the latest firmware.*

If you have issues please enter them in the issues section of this github repository `https://github.com/captainwasabi/topologrjs/issues`

73 -
WA1KRD
