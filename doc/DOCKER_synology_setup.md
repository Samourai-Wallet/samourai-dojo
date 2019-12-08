# Installation of Dojo on Synology

This will install Dojo on your Synology hardware.



## Table of Content ##
- [Requirements](#requirements)
- [Install procedure](#install)



<a name="requirements"/>

## Requirements ##

* Synology hardware connected 24/7 to internet
* Disk: 500GB (minimal) / 1TB (recommended)
* RAM: 4GB (minimal)

<a name="install"/>

## Install procedure

- Connect to Synology web ui as administrator
- Open `Package center`, search for `Docker`, click `Install`.
![](./static/synology_docker-package.png)
- Open SSH terminal to your Synology
- Follow `first-time install procedure` in [DOCKER_setup.md](DOCKER_setup.md#install), but skip the first two steps:
```
  * Install Docker and Docker Compose on the host machine and check that your installation is working.
  * Install Tor Browser on the host machine.
```
You can use `/volume1/dojo` as `<dojo_dir>`.
- Install will complete with the following warnings, which you can safely ignore:
```
Attaching to nginx, nodejs, bitcoind, tor, db
nginx       | WARNING: no logs are available with the 'db' log driver
nodejs      | WARNING: no logs are available with the 'db' log driver
bitcoind    | WARNING: no logs are available with the 'db' log driver
tor         | WARNING: no logs are available with the 'db' log driver
db          | WARNING: no logs are available with the 'db' log driver
```
![](./static/synology_install_complete.png)

## Dojo status & logs
- Connect to Synology web ui as administrator
- Open `Docker`, then `Container`.
  ![](./static/synology_containers.png)

- You will see the following containers running:
  * bitcoind
  * db
  * nginx
  * nodejs
  * tor
- Select a container (ie `bitcoind`), click `Detail`, `Log` to see container's logs in real time
