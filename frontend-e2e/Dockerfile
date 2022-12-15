FROM cypress/browsers:latest

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Run tests
CMD ["npm", "test"]