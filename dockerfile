FROM node:16-alpine
WORKDIR /express-on-steroids
COPY package*.json ./
RUN ["npm", "install"]
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
