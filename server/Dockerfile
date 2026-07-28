# We need to build from the root of the project so that we can copy the parser
FROM node:20-alpine

# Set the working directory for the whole container
WORKDIR /app

# First, let's copy the parser and install its dependencies
COPY parser/package*.json ./parser/
RUN cd parser && npm install
COPY parser/ ./parser/

# Now let's handle the server
WORKDIR /app/server
COPY server/package*.json ./

# The postinstall script in server/package.json expects the parser to be at ../parser
# It runs `cd ../parser && npm install`
# We already installed it above, but we still run npm install for the server
RUN npm install

# Copy the server source code
COPY server/ ./

# Expose API port
EXPOSE 5001

# Run the dev script
CMD ["npm", "run", "dev"]
