#########################################
# CONFIGURATION OF WHIRLPOOL CONTAINER
#########################################

# Install and run an instance of whirlpool-cli inside Docker
# Value: on | off
WHIRLPOOL_INSTALL=off

# IP address used to expose the RPC API of whirlpool-cli to external apps
# Warning: Do not expose your RPC API to internet!
# Recommended value:
#   if whirlpool-gui runs on the machine hosting dojo: 172.30.1.8 (default)
#   otherwise: IP address on the LAN of the machine running dojo
# Type: string
WHIRLPOOL_RPC_EXTERNAL_IP=172.30.1.8
