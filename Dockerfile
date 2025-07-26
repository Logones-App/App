# Dockerfile pour Next.js avec npm
FROM node:22-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances avec npm
RUN npm ci --only=production

# Copier le reste du code
COPY . .

# Construire l'application
RUN npm run build

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["npm", "start"] 