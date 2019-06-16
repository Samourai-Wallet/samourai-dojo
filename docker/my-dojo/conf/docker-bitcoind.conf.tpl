#########################################
# CONFIGURATION OF BITCOIND CONTAINER
#########################################

# User account used for rpc access to bitcoind
# Type: alphanumeric
BITCOIND_RPC_USER=dojorpc

# Password of user account used for rpc access to bitcoind
# Type: alphanumeric
BITCOIND_RPC_PASSWORD=dojorpcpassword

# Max number of connections to network peers
# Type: integer
BITCOIND_MAX_CONNECTIONS=16

# Mempool maximum size in MB
# Type: integer
BITCOIND_MAX_MEMPOOL=1024

# Db cache size in MB
# Type: integer
BITCOIND_DB_CACHE=1024

# Mempool expiry in hours
# Defines how long transactions stay in your local mempool before expiring
# Type: integer
BITCOIND_MEMPOOL_EXPIRY=72

# Min relay tx fee in BTC
# Type: numeric
BITCOIND_MIN_RELAY_TX_FEE=0.00001


#
# EXPERT SETTINGS
#


#
# EPHEMERAL ONION ADDRESS FOR BITCOIND
# THIS PARAMETER HAS NO EFFECT IF BITCOIND_INSTALL IS SET TO OFF
#

# Generate a new onion address for bitcoind when Dojo is launched
# Activation of this option is recommended for improved privacy.
# Values: on | off
BITCOIND_EPHEMERAL_HS=on


#
# EXPOSE BITCOIND RPC API AND ZMQ NOTIFICATIONS TO EXTERNAL APPS
# THESE PARAMETERS HAVE NO EFFECT IF BITCOIND_INSTALL IS SET TO OFF
#

# Expose the RPC API to external apps
# Warning: Do not expose your RPC API to internet!
# See BITCOIND_RPC_EXTERNAL_IP
# Value: on | off
BITCOIND_RPC_EXTERNAL=off

# IP address used to expose the RPC API to external apps
# This parameter is inactive if BITCOIND_RPC_EXTERNAL isn't set to 'on'
# Warning: Do not expose your RPC API to internet!
# Recommended value:
#   linux: 127.0.0.1
#   macos or windows: IP address of the VM running the docker host
# Type: string
BITCOIND_RPC_EXTERNAL_IP=127.0.0.1


#
# INSTALL AND RUN BITCOIND INSIDE DOCKER
#

# Install and run bitcoind inside Docker
# Set this option to 'off' for using a bitcoind hosted outside of Docker (not recommended)
# Value: on | off
BITCOIND_INSTALL=on

# IP address of bitcoind used by Dojo
# Set value to 172.28.1.5 if BITCOIND_INSTALL is set to 'on'
# Type: string
BITCOIND_IP=172.28.1.5

# Port of the RPC API
# Set value to 28256 if BITCOIND_INSTALL is set to 'on'
# Type: integer
BITCOIND_RPC_PORT=28256

# Port exposing ZMQ notifications for raw transactions
# Set value to 9501 if BITCOIND_INSTALL is set to 'on'
# Type: integer
BITCOIND_ZMQ_RAWTXS=9501

# Port exposing ZMQ notifications for block hashes
# Set value to 9502 if BITCOIND_INSTALL is set to 'on'
# Type: integer
BITCOIND_ZMQ_BLK_HASH=9502