FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY packages/simulator/package.json ./packages/simulator/

RUN npm install --workspace=packages/simulator

COPY packages/simulator ./packages/simulator

CMD ["node", "packages/simulator/src/index.js"]
