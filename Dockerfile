FROM node:16-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY ./src ./src

# Expose port 8080
EXPOSE 8080

# Start the Node.js application
CMD ["npm", "start"]