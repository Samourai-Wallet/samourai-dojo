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

# New config option 1 (alphanumeric)
BITCOIND_NEW_CONFIG_OPTION1=test

# New config option 2 (alphanumeric)
BITCOIND_NEW_CONFIG_OPTION2=test