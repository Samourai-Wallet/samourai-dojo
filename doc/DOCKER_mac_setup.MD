# MacOS Installation 

This installation was tested on an iMac (mid 2011) with a 2.7GHz i5 processor with 8GB RAM and 1TB external Hard Drive. 

## Getting Started

####  Create a new user:

1. Launch System Preferences by clicking the  **System Preferences**  icon in the  **Dock**, or selecting  **System Preferences**  from the Apple menu.
2. Click on __Users & Groups__
3. If settings are locked, click on the __Lock__ at the bottom of window and enter your password.
4. Click on __+__ to add a new User
5. Under __New Account__ select __Administrator__
6. Fill the remaining fields with your choice of User Name and Password

#### Move the __New User Folder__ into the __External HD__
Note: _This is an important step, otherwise, it's probable that when you run the container, it will be installed in your main OS Hard Drive and will run out of space as it validates the Bitcoin blockchain._

1. Open  **Finder** and navigate to your startup drive's **/Users** folder. For most people, this is **/Macintosh HD/Users**. In the **Users**  **folder**, you'll find your user's folder.
2. On your external Hard Drive, create a folder named **Users**.
3. Select your user folder and drag it to the external HD **/Users** folder you created. _Because you're using a different drive for the destination, the operating system will copy the data rather than move it. This ok for now but delete it later._
4. Launch System Preferences again. 
5. In the  **Users & Groups** click the lock icon in the bottom left corner, then provide an administrator name and password.
6. From the list of user accounts, right-click on the account whose home folder you moved, and select  **Advanced Options**  from the pop-up menu.
    _Do not make any changes to Advanced Options except for those noted here. Doing so can cause quite a few unforeseen problems that could lead to data loss or the need to reinstall the operating system._
7.  In the  **Advanced Options**  sheet, click  **Choose**, located to the right of the  **Home directory**  field.    
8.  Navigate to the location you moved your home folder to, select the new home folder, and click  **OK**.
9.  Click  **OK**  to dismiss the  **Advanced Options**  sheet, and then close  **System Preferences**.
10.  __Restart your Mac__ 

#### Download and install Docker, Kitematic and TOR
1. Make sure your system fills the [requirements]([https://docs.docker.com/docker-for-mac/install/](https://docs.docker.com/docker-for-mac/install/)) (particularly MacOS Sierra 10.12 or higher. If not, upgrade before proceeding).  
2. [Download Docker]([https://docs.docker.com/docker-for-mac/install/](https://docs.docker.com/docker-for-mac/install/)) and follow the installation steps.
3. _Optional_: Download [Kitematic]([https://kitematic.com/) and follow installation instructions. 
(_This may be system specific but I've found that monitoring the logs with Kitematic was more stable than using the Terminal_).
4. Install [Tor Browser](https://www.torproject.org/projects/torbrowser.html.en) on the host machine.

## Adjust Docker Settings
1. Click on the Docker icon (![whale menu](https://docs.docker.com/docker-for-mac/images/whale-x.png)) at the status bar and select __Preferences__.
2.  Under Disk, click on __Reveal in Finder__ and double check that the disk image is saved under the external HD.
3. __Adjust Disk__ Image size to 400GB+ and click Apply.
4. Click __Advanced__ and increase the CPU count, Memory and Swap sizes. Adjusting these will speed up the blockchain validation process 
(_At 4 CPUs, 8GB of RAM and a 4GiB Swap - the initial block download took 4.5 days at the time of writing_).

## Install the DOJO
Follow the instructions [here](https://github.com/Samourai-Wallet/samourai-dojo/blob/develop/doc/DOCKER_setup.md) starting at the step:
__"Download the most recent release of Dojo from Github"__
_Note: For tracking progress, open Kitematic and follow the bitcoind logs. You'll be able to see the Blockchain verification process under the _progress_ log variable (1.00 = fully validated). This process takes a long time. Just let it do its thing. In my system it took 3 days._

__Some possible optimization tips:__
. If you notice that progress has stopped. Click the whale icon and select Restart. Check Kitematic logs of bitcoind to confirm that progress has resumed. 
. This may optimize speed: open __Activity Monitor__, check the PID (Process ID) of your docker process. Open Terminal and type:

`sudo renice-20 -p [enter your PID]` 
