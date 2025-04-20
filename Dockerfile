FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static content to the default Nginx HTML directory
COPY ./src /usr/share/nginx/html

# Expose port 8080
EXPOSE 8080

# Override the default command to run Nginx
CMD ["nginx", "-g", "daemon off;"]