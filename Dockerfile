FROM node:16-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the application code
COPY ./src ./src

# Ensure the data directory exists in the image
RUN mkdir -p ./src/data/thumbnails

# Copy the data files
COPY ./src/data/*.json ./src/data/
COPY ./src/data/thumbnails/* ./src/data/thumbnails/

# Expose port 8080
EXPOSE 8080

# Start the Node.js application
CMD ["npm", "start"]