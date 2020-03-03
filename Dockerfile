FROM ubuntu:18.04

WORKDIR /kanji-bot

RUN apt-get update
RUN apt-get install npm -y

COPY . .

RUN npm install

ENTRYPOINT [ "npm", "start" ]