# Use the official Node.js 16 image.
FROM node:18

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install production dependencies and Nest CLI globally.
RUN npm install --only=production
RUN npm install -g @nestjs/cli

# Copy local code to the container image.
COPY . .

# Build the application using the globally installed Nest CLI
RUN npm run build

# Run the web service on container startup.
CMD [ "node", "dist/main" ]
