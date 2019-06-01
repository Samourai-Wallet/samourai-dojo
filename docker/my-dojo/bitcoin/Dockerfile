FROM    debian:stretch


#################################################################
# INSTALL BITCOIN
#################################################################
ENV     BITCOIN_HOME        /home/bitcoin
ENV     BITCOIN_VERSION     0.18.0
ENV     BITCOIN_URL         https://bitcoincore.org/bin/bitcoin-core-0.18.0/bitcoin-0.18.0-x86_64-linux-gnu.tar.gz
ENV     BITCOIN_SHA256      5146ac5310133fbb01439666131588006543ab5364435b748ddfc95a8cb8d63f
ENV     BITCOIN_ASC_URL     https://bitcoincore.org/bin/bitcoin-core-0.18.0/SHA256SUMS.asc
ENV     BITCOIN_PGP_KEY     01EA5486DE18A882D4C2684590C8019E36C2E964

RUN     set -ex && \
        apt-get update && \
        apt-get install -qq --no-install-recommends ca-certificates dirmngr gosu gpg wget && \
        rm -rf /var/lib/apt/lists/*

# Build and install bitcoin binaries
RUN     set -ex && \
        cd /tmp && \
        wget -qO bitcoin.tar.gz "$BITCOIN_URL" && \
        echo "$BITCOIN_SHA256 bitcoin.tar.gz" | sha256sum -c - && \
        gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$BITCOIN_PGP_KEY" && \
        wget -qO bitcoin.asc "$BITCOIN_ASC_URL" && \
        gpg --batch --verify bitcoin.asc && \
        tar -xzvf bitcoin.tar.gz -C /usr/local --strip-components=1 --exclude=*-qt && \
        rm -rf /tmp/*

# Create group & user bitcoin
RUN     addgroup --system -gid 1108 bitcoin && \
        adduser --system --ingroup bitcoin -uid 1105 bitcoin

# Create data directory
RUN     mkdir "$BITCOIN_HOME/.bitcoin" && \
        chown -h bitcoin:bitcoin "$BITCOIN_HOME/.bitcoin"

# Copy bitcoin config file
COPY    ./bitcoin.conf "$BITCOIN_HOME/.bitcoin/bitcoin.conf"
RUN     chown bitcoin:bitcoin "$BITCOIN_HOME/.bitcoin/bitcoin.conf"

# Copy restart script
COPY    ./restart.sh /restart.sh
RUN     chown bitcoin:bitcoin /restart.sh && \
        chmod 777 /restart.sh

# Copy wait-for-it script
COPY    ./wait-for-it.sh /wait-for-it.sh

RUN     chown bitcoin:bitcoin /wait-for-it.sh && \
        chmod u+x /wait-for-it.sh && \
        chmod g+x /wait-for-it.sh

EXPOSE  8333 9501 9502 28256

USER    bitcoin