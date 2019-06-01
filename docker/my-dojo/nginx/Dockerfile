FROM nginx:1.15.10-alpine

# Create data directory
ENV     LOGS_DIR /data/logs

RUN     mkdir -p "$LOGS_DIR" && \
        chown -R nginx:nginx "$LOGS_DIR"

# Copy configuration files
COPY    ./nginx.conf /etc/nginx/nginx.conf

COPY    ./dojo.conf /etc/nginx/sites-enabled/dojo.conf

# Copy wait-for script
COPY    ./wait-for /wait-for

RUN     chmod u+x /wait-for && \
        chmod g+x /wait-for