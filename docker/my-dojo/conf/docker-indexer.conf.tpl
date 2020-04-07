#########################################
# CONFIGURATION OF A LOCAL INDEXER
#########################################

# Install and run a local indexer inside Docker
# Set this option to 'off' for using an indexer hosted outside of Docker
# or when using a different data source (local bitcoind, OXT)
# Value: on | off
INDEXER_INSTALL=off

# IP address of the local indexer used by Dojo
# Set value to 172.28.1.6 if INDEXER_INSTALL is set to 'on'
# Type: string
INDEXER_IP=172.28.1.6

# Port of the RPC API
# Set value to 50001 if INDEXER_INSTALL is set to 'on'
# Type: integer
INDEXER_RPC_PORT=50001

# Support of batch requests by the local indexer
# Set value to inactive if INDEXER_INSTALL is set to 'on'
# Value: active | inactive
INDEXER_BATCH_SUPPORT=inactive


#
# EXPERT SETTINGS
# (ACTIVE IF INDEXER_INSTALL IS SET TO ON)
#

# Number of blocks to get in one JSONRPC request from bitcoind
# Type: integer
INDEXER_BATCH_SIZE=10

# Total size of block txids to cache (in MB)
# Type: integer
INDEXER_BLK_TXIDS_CACHE_SIZE_MB=10

# Number of transactions to lookup before returning an error
# Type: integer
INDEXER_TXID_LIMIT=501