FROM node:18.12.1-alpine

RUN apk add --update \
  curl \
  && rm -rf /var/cache/apk/*

ENV NODE_ENV production

RUN corepack enable

WORKDIR /workspace

COPY ./ /workspace

ENTRYPOINT [ "/workspace/packages/scheduler/docker/entrypoint.sh" ]

CMD [ "start-worker" ]
