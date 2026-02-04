FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port
EXPOSE 8000

# Set environment
ENV NODE_ENV=production

# Run application
CMD ["npm", "start"]
