FROM    debian:stretch

ENV     TOR_HOME    /var/lib/tor

# Install Tor
RUN     set -ex && \
        apt-get update && \
        apt-get install -y git libevent-dev zlib1g-dev libssl-dev gcc make automake ca-certificates autoconf musl-dev coreutils wget && \
        mkdir -p /usr/local/src/ && \
        git clone  https://git.torproject.org/tor.git /usr/local/src/tor && \
        cd /usr/local/src/tor && \
        git checkout tor-0.3.5.8 && \
        ./autogen.sh && \
        ./configure \
            --disable-asciidoc \
            --sysconfdir=/etc \
            --disable-unittests && \
        make && make install && \
        cd .. && \
        rm -rf tor && \
        echo "50fe8e13592f8cf22304b9c4adfc11849a2c3d281b1d7e09c924ae24874c6daa *go1.11.13.linux-amd64.tar.gz" > GO_CHECKSUMS && \
        wget https://dl.google.com/go/go1.11.13.linux-amd64.tar.gz && \
        sha256sum -c GO_CHECKSUMS 2>&1 | grep OK && \
        tar -C /usr/local/lib -xzf go1.11.13.linux-amd64.tar.gz && \
        ln -s /usr/local/lib/go/bin/go /usr/local/bin/ && \
        cd /usr/local/src && \
        git clone https://github.com/Yawning/obfs4.git obfs4proxy && \
        cd obfs4proxy && \
        git checkout tags/obfs4proxy-0.0.11 && \
        go build -o obfs4proxy/obfs4proxy ./obfs4proxy && \
        cp ./obfs4proxy/obfs4proxy /usr/local/bin && \
        cd .. && \
        rm go1.11.13.linux-amd64.tar.gz && \
        rm -rf obfs4proxy

# Create group & user tor
RUN     addgroup --system -gid 1107 tor && \
        adduser --system --ingroup tor -uid 1104 tor

# Create /etc/tor directory
RUN     mkdir -p /etc/tor/ && \
        chown -Rv tor:tor /etc/tor

# Create .tor subdirectory of TOR_HOME
RUN     mkdir -p "$TOR_HOME/.tor" && \
        chown -Rv tor:tor "$TOR_HOME" && \
        chmod -R 750 "$TOR_HOME"

# Copy Tor configuration file
COPY    ./torrc /etc/tor/torrc
RUN     chown tor:tor /etc/tor/torrc

# Copy restart script
COPY    ./restart.sh /restart.sh

RUN     chown tor:tor /restart.sh && \
        chmod u+x /restart.sh && \
        chmod g+x /restart.sh

# Copy wait-for-it script
COPY    ./wait-for-it.sh /wait-for-it.sh

RUN     chown tor:tor /wait-for-it.sh && \
        chmod u+x /wait-for-it.sh && \
        chmod g+x /wait-for-it.sh

# Expose socks port 
EXPOSE  9050

# Switch to user tor
USER    tor
