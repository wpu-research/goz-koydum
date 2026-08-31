FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p /data
ENV DB_PATH=/data/tracker.db
EXPOSE 3000
CMD ["node", "index.js"]
