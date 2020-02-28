FROM      nginx:1.15.10-alpine

# Create data directory
ENV       LOGS_DIR /data/logs

RUN       mkdir -p "$LOGS_DIR" && \
          chown -R nginx:nginx "$LOGS_DIR"

# Copy configuration files
COPY      ./nginx.conf /etc/nginx/nginx.conf
COPY      foo ./dojo-explorer.con[f] ./dojo.con[f] /etc/nginx/sites-enabled/
RUN       rm /etc/nginx/sites-enabled/foo
# Copy wait-for script
COPY      ./wait-for /wait-for

RUN       chmod u+x /wait-for && \
          chmod g+x /wait-for