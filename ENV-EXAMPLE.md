# Configuration des Variables d'Environnement

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## Instructions pour obtenir les clés Supabase :

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Allez dans Settings > API
4. Copiez l'URL du projet et la clé anon/public
5. Pour la clé service role, allez dans Settings > API > Project API keys

## Configuration de la Base de Données :

1. Dans votre projet Supabase, allez dans SQL Editor
2. Exécutez le script de migration pour créer les tables nécessaires
3. Configurez les RLS (Row Level Security) policies
4. Testez la connexion avec les variables d'environnement
