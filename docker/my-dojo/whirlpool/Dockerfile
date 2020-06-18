FROM    debian:buster

ENV     WHIRLPOOL_HOME                /home/whirlpool
ENV     WHIRLPOOL_DIR                 /usr/local/whirlpool-cli


# Install prerequisites
# Create group & user whirlpool
# Create .whirlpool-cli subdirectory of WHIRLPOOL_HOME
# Create /usr/local/src/whirlpool-cli directory
RUN     set -ex && \
        apt-get update && \
        apt-get install -y libevent-dev zlib1g-dev libssl-dev gcc make automake ca-certificates autoconf musl-dev coreutils gpg wget default-jdk && \
        addgroup --system -gid 1113 whirlpool && \
        adduser --system --ingroup whirlpool -uid 1110 whirlpool && \
        mkdir -p "$WHIRLPOOL_HOME/.whirlpool-cli" && \
        chown -Rv whirlpool:whirlpool "$WHIRLPOOL_HOME" && \
        chmod -R 750 "$WHIRLPOOL_HOME" && \
        mkdir -p "$WHIRLPOOL_DIR"

# Install Tor
ENV     WHIRLPOOL_TOR_URL             https://archive.torproject.org/tor-package-archive
ENV     WHIRLPOOL_TOR_VERSION         0.4.2.7
ENV     WHIRLPOOL_TOR_GPG_KS_URI      hkp://keyserver.ubuntu.com:80
ENV     WHIRLPOOL_TOR_GPG_KEY1        0xEB5A896A28988BF5
ENV     WHIRLPOOL_TOR_GPG_KEY2        0xC218525819F78451
ENV     WHIRLPOOL_TOR_GPG_KEY3        0x21194EBB165733EA
ENV     WHIRLPOOL_TOR_GPG_KEY4        0x6AFEE6D49E92B601

RUN     set -ex && \
        mkdir -p /usr/local/src/ && \
        cd /usr/local/src && \
        wget -qO "tor-$WHIRLPOOL_TOR_VERSION.tar.gz" "$WHIRLPOOL_TOR_URL/tor-$WHIRLPOOL_TOR_VERSION.tar.gz" && \
        wget -qO "tor-$WHIRLPOOL_TOR_VERSION.tar.gz.asc" "$WHIRLPOOL_TOR_URL/tor-$WHIRLPOOL_TOR_VERSION.tar.gz.asc" && \
        gpg --keyserver "$WHIRLPOOL_TOR_GPG_KS_URI" --recv-keys "$WHIRLPOOL_TOR_GPG_KEY1" && \
        gpg --keyserver "$WHIRLPOOL_TOR_GPG_KS_URI" --recv-keys "$WHIRLPOOL_TOR_GPG_KEY2" && \
        gpg --keyserver "$WHIRLPOOL_TOR_GPG_KS_URI" --recv-keys "$WHIRLPOOL_TOR_GPG_KEY3" && \
        gpg --keyserver "$WHIRLPOOL_TOR_GPG_KS_URI" --recv-keys "$WHIRLPOOL_TOR_GPG_KEY4" && \
        gpg --verify "tor-$WHIRLPOOL_TOR_VERSION.tar.gz.asc" && \
        tar -xzvf "tor-$WHIRLPOOL_TOR_VERSION.tar.gz" -C /usr/local/src && \
        cd "/usr/local/src/tor-$WHIRLPOOL_TOR_VERSION" && \
        ./configure \
            --disable-asciidoc \
            --sysconfdir=/etc \
            --disable-unittests && \
        make && make install && \
        cd .. && \
        rm -rf "tor-$WHIRLPOOL_TOR_VERSION" && \
        rm "tor-$WHIRLPOOL_TOR_VERSION.tar.gz" && \
        rm "tor-$WHIRLPOOL_TOR_VERSION.tar.gz.asc"

# Install whirlpool-cli
ENV     WHIRLPOOL_URL                 https://code.samourai.io/whirlpool/whirlpool-client-cli/uploads
ENV     WHIRLPOOL_VERSION             0.10.6
ENV     WHIRLPOOL_VERSION_HASH        a05b443bf9d266702327c99fd8bad5da
ENV     WHIRLPOOL_JAR                 "whirlpool-client-cli-$WHIRLPOOL_VERSION-run.jar"
ENV     WHIRLPOOL_SHA256              eb07ef5637c2bb52b1be57b62941120a689b0c02600c38dbda3b8dd701d03cc8

RUN     set -ex && \
        cd "$WHIRLPOOL_DIR" && \
        echo "$WHIRLPOOL_SHA256 *$WHIRLPOOL_JAR" > WHIRLPOOL_CHECKSUMS && \
        wget -qO "$WHIRLPOOL_JAR" "$WHIRLPOOL_URL/$WHIRLPOOL_VERSION_HASH/$WHIRLPOOL_JAR" && \
        sha256sum -c WHIRLPOOL_CHECKSUMS 2>&1 | grep OK && \
        mv "$WHIRLPOOL_JAR" whirlpool-client-cli-run.jar && \
        chown -Rv whirlpool:whirlpool "$WHIRLPOOL_DIR" && \
        chmod -R 750 "$WHIRLPOOL_DIR"

# Copy restart script
COPY    ./restart.sh /restart.sh

RUN     chown whirlpool:whirlpool /restart.sh && \
        chmod u+x /restart.sh && \
        chmod g+x /restart.sh

# Expose HTTP API port 
EXPOSE  8898

# Switch to user whirlpool
USER    whirlpool
