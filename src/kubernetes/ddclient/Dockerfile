FROM debian:buster-slim

RUN \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive \
        apt-get install --no-install-recommends -y ddclient && \
    rm -rf /var/lib/apt/lists/*

CMD ["/usr/sbin/ddclient", "-foreground", "-noquiet", "-verbose"]