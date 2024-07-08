FROM node:18

WORKDIR /app

COPY package*.json yarn.lock ./

RUN apt-get update && apt-get install -y \
  build-essential \
  libglib2.0-0 \
  libsm6 \
  libxrender1 \
  libxext6 \
  && rm -rf /var/lib/apt/lists/*

# Node.js 패키지 설치
RUN yarn install

RUN yarn remove @tensorflow/tfjs-node && yarn add @tensorflow/tfjs-node --build-from-source

COPY . .

RUN yarn build

EXPOSE 3000

CMD ["node", "dist/app.js"]
