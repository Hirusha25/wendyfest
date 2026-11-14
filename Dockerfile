FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production PORT=3000 DB_PATH=/data/wendyfest.sqlite PHOTO_DIR=/data/photos
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "--no-warnings=ExperimentalWarning", "server/index.js"]
