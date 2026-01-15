FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
# Install build dependencies for better-sqlite3 if needed (python, make, g++)
# Alpine might need: apk add --no-cache python3 make g++ 
# But better-sqlite3 often has prebuilt binaries. Let's try standard install first.
# If it fails, we add: RUN apk add --no-cache python3 make g++
RUN npm install

COPY . .
EXPOSE 3000
CMD ["npm", "start"]
