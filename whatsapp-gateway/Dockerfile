# Use the official Node.js image as the base image
FROM node:22.18.0-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

RUN corepack enable

# Copy the manifest first so the dependency layer is only invalidated when the
# lockfile changes, not on every source edit.
COPY package.json pnpm-lock.yaml ./

# Cache the pnpm content-addressable store across builds (requires BuildKit, the
# default in Compose v2). Packages already in the store are not re-downloaded
# even when the lockfile changes.
RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# Copy the rest of the application files
COPY . .

# Build the NestJS application
RUN pnpm run build

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]