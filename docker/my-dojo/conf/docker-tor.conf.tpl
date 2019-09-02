
#########################################
# CONFIGURATION OF TOR CONTAINER
#########################################

# To get Tor bridges head over to https://bridges.torproject.org and click on
# Get bridges, then you will see a form with "Advanced Options" header
# leave the Pluggable Transport as obfs4 and click on Get Bridges button
# solve the captcah, you will get the bridge addresses (usually 3)
# Add these bridges with the help of the below template
# you need to prefix those with the word "Bridge" and have each of them in a new line.
# The UseBridges setting can be used to set Bridge usage in the Tor container.

UseBridges 1
#Bridge obfs4 IP:PORT 1111222233334444 cert=XXXXYYYYZZZZ iat-mode=0

