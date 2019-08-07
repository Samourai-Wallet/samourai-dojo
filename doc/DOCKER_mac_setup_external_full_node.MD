# MacOS Installation 

This installation was tested on an iMac (late 2014) with a 3.5GHz i5 processor with 12GB RAM and 1TB Internal Hard Drive. This Setup is Geared for using Docker on Mac and pointing to an external bitcoind.

## Getting Started

### Download and install Docker and TOR
1. Make sure your system fills the [requirements]([https://docs.docker.com/docker-for-mac/install/](https://docs.docker.com/docker-for-mac/install/)) (particularly MacOS Sierra 10.12 or higher. If not, upgrade before proceeding).  
2. [Download Docker]([https://docs.docker.com/docker-for-mac/install/](https://docs.docker.com/docker-for-mac/install/)) and follow the installation steps.
3. Install [Tor Browser](https://www.torproject.org/projects/torbrowser.html.en) on the host machine.

## Adjust Docker Settings
1. Click on the Docker icon (![whale menu](https://docs.docker.com/docker-for-mac/images/whale-x.png)) at the status bar and select __Preferences__.
2.  Under Disk, click on __Reveal in Finder__ and allow the disk image to be saved in defult location
3. __Adjust Disk__ Image size to 400GB+ and click Apply.
(Since pointing to an external bitcoind and not having an internal container for bitcoind the Disk Image Size could potentially be        much smaller.  Currently mine shows 13.4 GB on Disk.)
4. Click __Advanced__ and increase the CPU count, Memory and Swap sizes. Adjusting these will speed up the blockchain validation process 

## Install the DOJO Pointing and Existing bitcoind
Follow the instructions [here](https://github.com/Samourai-Wallet/samourai-dojo/blob/develop/doc/DOCKER_setup.md) starting at the step:
__"Download the most recent release of Dojo from Github"__ until you reach __"Launch the Installation of Your Dojo with"__ ***DO NOT LAUNCH DOJO YET***

Once you Reach Step __"Launch the Installation of Your Dojo with"__ from above you will need to read and follow the instructions from [here](https://github.com/Samourai-Wallet/samourai-dojo/blob/develop/doc/DOCKER_advanced_setups.md) 
Once adjustments are made to your external bitcoind bitcoin.conf __(location dependent on what device you have bitcoind)__ and docker-bitcoind.conf.tpl __(dojo_dir > docker > my-dojo > conf)__ you can proceed with Install and revert back to original instructions [here](https://github.com/Samourai-Wallet/samourai-dojo/blob/develop/doc/DOCKER_setup.md) at section __"Launch the Installation of Your Dojo with"__

_Note: For tracking progress, open terminal, change directory to my-dojo and run /dojo.sh logs tracker

__Some possible optimization tips:__
If you notice that progress has stopped. Click the whale icon and select Restart. Restart Logs Tracker from step above to veryify progress has resumed.

This may optimize speed: open __Activity Monitor__, check the PID (Process ID) of your docker process. Open Terminal and type:

sudo renice-20 -p [enter your PID]
