FROM node:18-alpine AS deps
WORKDIR /app

# Copy only the files needed to install dependencies
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install dependencies with the preferred package manager
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi


FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the files
COPY . .

# Run build with the preferred package manager
RUN \
  if [ -f package-lock.json ]; then npm run build; \
  elif [ -f yarn.lock ]; then yarn build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Re-run install only for production dependencies
RUN \
  if [ -f package-lock.json ]; then npm ci --only=production && npm cache clean --force; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile --production && yarn cache clean; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile --prod; \
  else echo "Lockfile not found." && exit 1; \
  fi


FROM node:18-alpine AS runner
WORKDIR /app

# Copy the bundled code from the builder stage
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

RUN chown -Rh node:node /app

# Use the node user from the image
USER node


# Start the server
CMD ["node", "dist/main.js"]