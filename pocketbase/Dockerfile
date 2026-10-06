# The pinned PocketBase release is downloaded at build time (public deploy); pin PB_VERSION to change it.
FROM alpine:3 AS unpack
ARG TARGETARCH
ARG PB_VERSION=0.40.4
RUN apk add --no-cache wget unzip \
 && wget -O /tmp/pocketbase.zip \
      "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" \
 && unzip /tmp/pocketbase.zip pocketbase -d /usr/local/bin

FROM alpine:3
COPY --from=unpack /usr/local/bin/pocketbase /usr/local/bin/pocketbase
COPY pb_migrations /pb/pb_migrations
EXPOSE 8090
# The superuser is upserted from the environment on every start, then PocketBase serves from /pb/pb_data.
CMD ["/bin/sh", "-c", "pocketbase superuser upsert \"$PB_SUPERUSER_EMAIL\" \"$PB_SUPERUSER_PASSWORD\" --dir /pb/pb_data && exec pocketbase serve --http 0.0.0.0:8090 --dir /pb/pb_data"]
