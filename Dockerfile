FROM node:alpine
ADD . /app
WORKDIR /app
RUN yarn
ENTRYPOINT ["node", "index.js"]
