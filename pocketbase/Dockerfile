# Offline build (plan §11): the pinned release archive is COPYd from vendor/ (the "vendor" build context), never fetched.
FROM alpine:3 AS unpack
ARG TARGETARCH
COPY --from=vendor pocketbase_0.40.4_linux_${TARGETARCH}.zip /tmp/pocketbase.zip
RUN unzip /tmp/pocketbase.zip pocketbase -d /usr/local/bin

FROM alpine:3
COPY --from=unpack /usr/local/bin/pocketbase /usr/local/bin/pocketbase
COPY pb_migrations /pb/pb_migrations
EXPOSE 8090
# The superuser is upserted from the environment on every start, then PocketBase serves from /pb/pb_data.
CMD ["/bin/sh", "-c", "pocketbase superuser upsert \"$PB_SUPERUSER_EMAIL\" \"$PB_SUPERUSER_PASSWORD\" --dir /pb/pb_data && exec pocketbase serve --http 0.0.0.0:8090 --dir /pb/pb_data"]
