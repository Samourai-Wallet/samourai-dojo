FROM    rust:1.37.0-slim

ENV     INDEXER_HOME        /home/indexer
ENV     INDEXER_VERSION     0..1.0
ENV     INDEXER_URL         https://github.com/Samourai-Wallet/addrindexrs.git

RUN     apt-get update && \
        apt-get install -y clang cmake git && \
        apt-get install -y libsnappy-dev

# Create group and user indexer
RUN     addgroup --system -gid 1109 indexer && \
        adduser --system --ingroup indexer -uid 1106 indexer

# Create data directory
RUN     mkdir "$INDEXER_HOME/addrindexrs" && \
        chown -h indexer:indexer "$INDEXER_HOME/addrindexrs"

# Copy restart script
COPY    ./restart.sh /restart.sh
RUN     chown indexer:indexer /restart.sh && \
        chmod 777 /restart.sh

# Copy wait-for-it script
COPY    ./wait-for-it.sh /wait-for-it.sh
RUN     chown indexer:indexer /wait-for-it.sh && \
        chmod u+x /wait-for-it.sh && \
        chmod g+x /wait-for-it.sh

USER    indexer

# Install addrindexrs
RUN     cd "$INDEXER_HOME" && \
        git clone "$INDEXER_URL" "$INDEXER_HOME/addrindexrs" && \
        cd addrindexrs && \
        git checkout "master"
# TODO uncomment
#        git checkout "tags/v$INDEXER_VERSION"

RUN     cd "$INDEXER_HOME/addrindexrs" && \
        cargo build --release && \
        cargo install --path .

EXPOSE  50001

STOPSIGNAL SIGINT
