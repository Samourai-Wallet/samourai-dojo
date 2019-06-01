FROM    debian:stretch

ENV     TOR_HOME    /var/lib/tor

# Install Tor
RUN     set -ex && \
        apt-get update && \
        apt-get install -y git libevent-dev zlib1g-dev libssl-dev gcc make automake ca-certificates autoconf musl-dev coreutils && \
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
        rm -rf tor

# Create group & user tor
RUN     addgroup --system -gid 1107 tor && \
        adduser --system --ingroup tor -uid 1104 tor

# Create group & user bitcoin and add user to tor group
RUN     addgroup --system -gid 1108 bitcoin && \
        adduser --system --ingroup bitcoin -uid 1105 bitcoin && \
        usermod -a -G tor bitcoin

# Create /etc/tor directory
RUN     mkdir -p /etc/tor/ && \
        chown -Rv tor:tor /etc/tor

# Create .tor subdirectory of TOR_HOME
RUN     mkdir -p "$TOR_HOME/.tor" && \
        chown -Rv tor:tor "$TOR_HOME" && \
        chmod -R 700 "$TOR_HOME"

# Copy Tor configuration file
COPY    ./torrc /etc/tor/torrc
RUN     chown tor:tor /etc/tor/torrc

# Copy wait-for-it script
COPY    ./wait-for-it.sh /wait-for-it.sh

RUN     chown tor:tor /wait-for-it.sh && \
        chmod u+x /wait-for-it.sh && \
        chmod g+x /wait-for-it.sh

# Expose socks port 
EXPOSE  9050

# Switch to user tor
USER    tor
