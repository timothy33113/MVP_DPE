# Configuration de l'envoi d'emails avec N8n

Ce guide explique comment configurer N8n pour gérer l'envoi des emails automatiquement.

## Pourquoi utiliser N8n ?

✅ **Avantages de N8n :**
- Pas besoin de stocker les identifiants Gmail dans l'application
- Interface visuelle pour modifier les templates d'email
- Possibilité d'ajouter des étapes supplémentaires (notifications, logs, etc.)
- Support de multiples fournisseurs d'email (Gmail, SendGrid, etc.)
- Gestion centralisée des automatisations

## Configuration

### Étape 1 : Créer un workflow N8n

1. Connectez-vous à votre instance N8n (https://app.n8n.io ou votre instance self-hosted)
2. Créez un nouveau workflow
3. Ajoutez un nœud **Webhook** comme déclencheur

### Étape 2 : Configurer le Webhook

Dans le nœud Webhook :
- **HTTP Method** : POST
- **Path** : `/send-email` (ou le chemin de votre choix)
- **Authentication** : None (ou ajoutez une authentification si besoin)

Une fois configuré, N8n vous donnera une URL de webhook comme :
```
https://votre-instance-n8n.app.n8n.cloud/webhook/send-email
```

### Étape 3 : Ajouter le nœud d'envoi d'email

Ajoutez un nœud **Gmail** (ou **Send Email** pour un autre fournisseur) :

**Configuration Gmail :**
- **Resource** : Message
- **Operation** : Send
- **To** : `{{ $json.to }}`
- **Subject** : `{{ $json.subject }}`
- **Email Type** : HTML
- **Message** : `{{ $json.html }}`
- **From Name** : `DPE Matching`

**Connectez votre compte Gmail :**
N8n gérera l'authentification OAuth avec Google de manière sécurisée.

### Étape 4 : (Optionnel) Ajouter des étapes supplémentaires

Vous pouvez ajouter d'autres nœuds pour :
- Enregistrer les emails envoyés dans une base de données
- Envoyer une notification Slack/Discord
- Créer un log dans Google Sheets
- Ajouter une copie carbone (CC/BCC)

### Étape 5 : Activer le workflow

1. Cliquez sur **Execute Workflow** pour tester
2. Activez le workflow avec le toggle en haut à droite

### Étape 6 : Configurer l'application

Dans votre fichier `.env`, ajoutez l'URL du webhook N8n :

```env
N8N_WEBHOOK_URL=https://votre-instance-n8n.app.n8n.cloud/webhook/send-email
```

## Format des données envoyées

L'application envoie les données suivantes au webhook N8n :

```json
{
  "to": "email@example.com",
  "subject": "Sélection de 5 bien(s) correspondant à vos critères",
  "html": "<html>...</html>",
  "from": "votre-email@gmail.com"
}
```

## Exemple de workflow N8n complet

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Webhook   │────▶│    Gmail    │────▶│    Done     │
│   (POST)    │     │ Send Email  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Test de la configuration

1. Démarrez votre serveur backend
2. Dans l'interface de l'application, sélectionnez des biens
3. Cliquez sur "Envoyer par email"
4. Vérifiez les logs de N8n pour voir l'exécution
5. L'email devrait être reçu par l'acquéreur

## Dépannage

**Le webhook ne reçoit rien :**
- Vérifiez que `N8N_WEBHOOK_URL` est correctement configuré dans `.env`
- Vérifiez que le workflow N8n est activé
- Consultez les logs du serveur backend

**L'email n'est pas envoyé :**
- Vérifiez la configuration Gmail dans N8n
- Vérifiez que le compte Gmail est bien connecté
- Consultez les logs d'exécution dans N8n

**Erreur 401/403 sur le webhook :**
- Si vous avez activé l'authentification sur le webhook, il faudra l'ajouter dans le code backend

## Alternative : Gmail SMTP direct

Si vous préférez ne pas utiliser N8n, vous pouvez toujours configurer Gmail SMTP directement :

1. Commentez ou supprimez `N8N_WEBHOOK_URL` dans `.env`
2. Configurez `EMAIL_USER` et `EMAIL_PASSWORD` (mot de passe d'application Gmail)
3. Suivez les instructions dans `.env.example`

Les deux méthodes sont supportées et l'application choisira automatiquement N8n si `N8N_WEBHOOK_URL` est configuré.
