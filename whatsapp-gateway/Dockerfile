# Use the official Node.js image as the base image
FROM node:22.18.0-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Use pnpm with the lockfile for reproducible installs
# Copy package.json and pnpm-lock.yaml first to leverage Docker layer caching
COPY package.json pnpm-lock.yaml ./

# Enable Corepack and install dependencies using pnpm respecting the lockfile
RUN corepack enable && pnpm install --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Build the NestJS application
RUN pnpm run build

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]