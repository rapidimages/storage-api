from node:lts-alpine3.13

LABEL maintainer="James Kyburz james.kyburz@gmail.com"

ARG NPM_CONFIG_LOGLEVEL=warn
ARG NODE_ENV=development

ENV PORT 5000
ENV STORAGE_PATH /usr/src/app/blob-storage

WORKDIR /usr/src/app
COPY package.json .
COPY package-lock.json .
RUN npm install

COPY . .

CMD npm start

EXPOSE 5000
