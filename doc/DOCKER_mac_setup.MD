
# MacOS Installation

Users can choose a full install (Dojo + bitcoin full node) or installing using an external full node.  

1.  [Full install using a VirtualBox](#macos-installation-using-a-virtual-machine)
2.  [Full install using Docker for MacOS](#macos-installation-using-docker-for-macos)
3.  [Install the Dojo using an external full node](#install-the-dojo-using-an-external-full-node)



## 1. MacOS Installation using a Virtual Machine
__The instructions below are for a full install of the Dojo, including a new bitcoind node that will synch from scratch__

This installation was tested on an iMac (mid 2011) with a 2.7GHz i5 processor with 8GB RAM and 1TB external Hard Drive. For this specific machine, this proved to be a more stable alternative to installing Docker for Mac.

### Getting Started

#### Download and install Virtualbox with Debian 9:

Follow the instructions in this [video](https://www.youtube.com/watch?v=6M1DivpQSdo&t=703s). This will guide you to set up the VirtualBox and Debian 9. Make sure to follow all the steps, including the virtual box additions towards the end.

Also, remember to install the virtual box at a directory where you have __enough free space__ to install the Dojo. Specially if you are running a full node.

After the setup is complete, start the virtual box and open a terminal window then proceed to install the Dojo following these [instructions](https://github.com/Samourai-Wallet/samourai-dojo/blob/develop/doc/DOCKER_setup.md#install).




## 2. MacOs Installation using Docker for MacOs

This installation was tested on an iMac (mid 2011) with a 2.7GHz i5 processor with 8GB RAM and 1TB external Hard Drive.

### Getting Started

#### Create a new user:

1.  Launch System Preferences by clicking the  __System Preferences__  icon in the  __Dock__, or selecting  __System Preferences__  from the Apple menu.
2.  Click on __Users & Groups__
3.  If settings are locked, click on the __Lock__ at the bottom of window and enter your password.
4.  Click on __+__ to add a new User
5.  Under __New Account__ select __Administrator__
6.  Fill the remaining fields with your choice of User Name and Password

##### Move the __New User Folder__ into the __External HD__
Note: _This is an important step, otherwise, it's probable that when you run the container, it will be installed in your main OS Hard Drive and will run out of space as it validates the Bitcoin blockchain._

1.  Open  __Finder__ and navigate to your startup drive's __/Users__ folder. For most people, this is __/Macintosh HD/Users__. In the __Users__  __folder__, you'll find your user's folder.
2.  On your external Hard Drive, create a folder named __Users__.
3.  Select your user folder and drag it to the external HD __/Users__ folder you created. _Because you're using a different drive for the destination, the operating system will copy the data rather than move it. This ok for now but delete it later._
4.  Launch System Preferences again.
5.  In the  __Users & Groups__ click the lock icon in the bottom left corner, then provide an administrator name and password.
6.  From the list of user accounts, right-click on the account whose home folder you moved, and select  __Advanced Options__  from the pop-up menu.
    _Do not make any changes to Advanced Options except for those noted here. Doing so can cause quite a few unforeseen problems that could lead to data loss or the need to reinstall the operating system._
7.  In the  __Advanced Options__  sheet, click  __Choose__, located to the right of the  __Home directory__  field.    
8.  Navigate to the location you moved your home folder to, select the new home folder, and click  __OK__.
9.  Click  __OK__  to dismiss the  __Advanced Options__  sheet, and then close  __System Preferences__.
10. __Restart your Mac__

##### Download and install Docker, Kitematic and TOR

1.  Make sure your system fills the [requirements]([https://docs.docker.com/docker-for-mac/install/](https://docs.docker.com/docker-for-mac/install/)) (particularly MacOS Sierra 10.12 or higher. If not, upgrade before proceeding).  
2.  [Download Docker]([https://docs.docker.com/docker-for-mac/install/](https://docs.docker.com/docker-for-mac/install/)) and follow the installation steps.
3.  _Optional_: Download [Kitematic]([https://kitematic.com/) and follow installation instructions.
(_This may be system specific but I've found that monitoring the logs with Kitematic was more stable than using the Terminal_).
4.  Install [Tor Browser](https://www.torproject.org/projects/torbrowser.html.en) on the host machine.

### Adjust Docker Settings
1.  Click on the Docker icon (![whale menu](https://docs.docker.com/docker-for-mac/images/whale-x.png)) at the status bar and select __Preferences__.
2.  Under Disk, click on __Reveal in Finder__ and double check that the disk image is saved under the external HD.
3.  __Adjust Disk__ Image size to 400GB+ and click Apply.
4.  Click __Advanced__ and increase the CPU count, Memory and Swap sizes. Adjusting these will speed up the blockchain validation process
(_At 4 CPUs, 8GB of RAM and a 4GiB Swap - the initial block download took 4.5 days at the time of writing_).

### Install the DOJO
Follow the instructions [here](https://github.com/Samourai-Wallet/samourai-dojo/blob/develop/doc/DOCKER_setup.md) starting at the step:
__"Download the most recent release of Dojo from Github"__
_Note: For tracking progress, open Kitematic and follow the bitcoind logs. You'll be able to see the Blockchain verification process under the _progress_ log variable (1.00 = fully validated). This process takes a long time. Just let it do its thing. In my system it took 3 days._

__Some possible optimization tips:__
. If you notice that progress has stopped. Click the whale icon and select Restart. Check Kitematic logs of bitcoind to confirm that progress has resumed.
. This may optimize speed: open __Activity Monitor__, check the PID (Process ID) of your docker process. Open Terminal and type:

`sudo renice-20 -p [enter your PID]`



## 3. Install the Dojo using an external full node


This installation was tested on an iMac (late 2014) with a 3.5GHz i5 processor with 12GB RAM and 1TB Internal Hard Drive. This Setup is Geared for using Docker on Mac and pointing to an external bitcoind.

### Getting Started

#### Download and install Docker and TOR
1.  Make sure your system fills the [requirements]([https://docs.docker.com/docker-for-mac/install/](https://docs.docker.com/docker-for-mac/install/)) (particularly MacOS Sierra 10.12 or higher. If not, upgrade before proceeding).  
2.  [Download Docker]([https://docs.docker.com/docker-for-mac/install/](https://docs.docker.com/docker-for-mac/install/)) and follow the installation steps.
3.  Install [Tor Browser](https://www.torproject.org/projects/torbrowser.html.en) on the host machine.

### Adjust Docker Settings
1.  Click on the Docker icon (![whale menu](https://docs.docker.com/docker-for-mac/images/whale-x.png)) at the status bar and select __Preferences__.
2.  Under Disk, click on __Reveal in Finder__ and allow the disk image to be saved in defult location
3.  __Adjust Disk__ Image size to 400GB+ and click Apply.
(Since pointing to an external bitcoind and not having an internal container for bitcoind the Disk Image Size could potentially be        much smaller.  Currently mine shows 13.4 GB on Disk.)
4.  Click __Advanced__ and increase the CPU count, Memory and Swap sizes. Adjusting these will speed up the blockchain validation process

### Install the DOJO Pointing and Existing bitcoind
Follow the instructions [here](https://github.com/Samourai-Wallet/samourai-dojo/blob/develop/doc/DOCKER_setup.md) starting at the step:
__"Download the most recent release of Dojo from Github"__ until you reach __"Launch the Installation of Your Dojo with"__ ***DO NOT LAUNCH DOJO YET***

Once you Reach Step __"Launch the Installation of Your Dojo with"__ from above you will need to read and follow the instructions from [here](https://github.com/Samourai-Wallet/samourai-dojo/blob/develop/doc/DOCKER_advanced_setups.md)
Once adjustments are made to your external bitcoind bitcoin.conf __(location dependent on what device you have bitcoind)__ and docker-bitcoind.conf.tpl __(dojo_dir > docker > my-dojo > conf)__ you can proceed with Install and revert back to original instructions [here](https://github.com/Samourai-Wallet/samourai-dojo/blob/develop/doc/DOCKER_setup.md) at section __"Launch the Installation of Your Dojo with"__

_Note: For tracking progress, open terminal, change directory to my-dojo and run /dojo.sh logs nodejs
__Some possible optimization tips:__
If you notice that progress has stopped. Click the whale icon and select Restart. Restart logs nodejs from step above to verify progress has resumed.

This may optimize speed: open __Activity Monitor__, check the PID (Process ID) of your docker process. Open Terminal and type:

sudo renice-20 -p [enter your PID]
