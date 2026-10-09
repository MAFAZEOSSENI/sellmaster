# Sellmaster Web

Application web Sellmaster construite avec React et Vite. Le dashboard se connecte au backend Node existant et utilise les mêmes comptes que l’application mobile.

## Démarrer

```sh
npm install
cp .env.example .env.local
npm run dev
```

Configurez `VITE_API_BASE_URL` dans `.env.local` : `http://localhost:3000/api` pour un backend local, ou `https://sellmaster-1.onrender.com/api` pour le backend hébergé. La valeur par défaut est le backend hébergé.

Connectez-vous avec un compte Sellmaster existant. Le web utilise `POST /auth/login`, puis le JWT Bearer reçu pour lire `GET /auth/profile`, `GET /orders/stats/dashboard`, `GET /orders`, `GET /products`, `GET /admin/team` et `GET /admin/my-teams`. Le propriétaire peut lire ses invitations via `GET /admin/team?includePending=true` et en créer via `POST /admin/members/create`; les membres confirment les invitations avec `PATCH /admin/members/confirm` et `{ "membershipId": id }`. Les livreurs éligibles sont chargés par équipe avec `GET /admin/team?ownerId=<id>`; l’assignation d’une commande utilise `PATCH /orders/:id/assign` avec `{ "user_id": <courierId>, "assignment_note": "..." }`. Les statuts passent par `PATCH /orders/:id/status`; création et édition produit utilisent `POST /products` et `PUT /products/:id`.

Les statistiques du endpoint dashboard sont celles du jour. Les boutiques Shopify utilisent les routes OAuth, de listing, synchronisation et suppression déjà présentes dans le backend. Pour que le retour OAuth arrive sur cette application React en production, configurez `SHOPIFY_FRONTEND_URL` côté backend avec l’URL de déploiement React; le backend redirige actuellement par défaut vers l’ancienne URL `https://sellmaster.web.app`.

Pour vérifier le build de production :

```sh
npm run build
```
