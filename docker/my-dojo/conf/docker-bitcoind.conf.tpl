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

# Generate a new onion address for bitcoind when Dojo is launched
# Activation of this option is recommended for improved privacy.
# Values: on | off
BITCOIND_EPHEMERAL_HS=on

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