FROM node:16-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# First copy all the source code
COPY src/ ./src/
COPY concepts/ ./concepts/

# Copy CV assets used by the /cv routes
COPY CV-*.pdf ./

# Create data directories if they don't exist
RUN mkdir -p ./src/data/thumbnails

# Expose port 8080
EXPOSE 8080

# Start the Node.js application
CMD ["npm", "start"]