# Product Research SellMaster — Phase 1 : contrat d’intégration

## Décisions validées

- Accès au module : **owner uniquement**.
- Architecture : **hybride Web + extension Chrome**.
- Le Web SellMaster est l’interface de pilotage et de consultation.
- L’extension Chrome reste le collecteur des annonces visibles dans Meta Ads Library.
- Le backend SellMaster est la source de vérité pour les jobs, leur propriété, leur état et leurs résultats.
- Les sessions Web et extension restent indépendantes. Aucun JWT Web n’est transmis au navigateur ou à l’extension.

## Objectif de cette phase

Fixer un contrat stable avant de modifier le schéma PostgreSQL, les routes, le manifeste Chrome ou l’interface. Cette phase ne lance aucune migration et ne modifie aucun flux de production.

## Flux cible

1. Le owner connecté ouvre Product Research dans SellMaster Web.
2. Le Web crée un job via l’API avec son propre JWT.
3. Le Web demande à l’extension installée de démarrer ce job via `chrome.runtime.sendMessage(extensionId, message)`.
4. Le service worker vérifie l’origine exacte du site, la structure du message et la session owner propre à l’extension.
5. L’extension ouvre Meta Ads Library et reprend le job dans le contexte des onglets Ads Library.
6. L’extension envoie progression, annonces et état final à l’API avec son propre JWT.
7. Le Web consulte le job et ses résultats avec son JWT Web.

Le backend doit refuser toute écriture si le propriétaire du job ne correspond pas à l’utilisateur authentifié par le jeton utilisé pour l’appel.

## Contrat API proposé

Préfixe : `/api/ad-research`

Toutes les routes ci-dessous exigent une authentification Bearer et le rôle fixe `owner`. L’identifiant owner est dérivé de `req.userId`, jamais d’un identifiant librement fourni par le client.

### 1. Créer un job — Web

`POST /jobs`

Corps :

```json
{
  "country": "BJ",
  "adCategory": "all",
  "keyword": "lampe solaire",
  "adLimit": 50,
  "activeDays": 10
}
```

Validation :
- `country` : code pays autorisé, ou `ALL`.
- `adCategory` : `all` ou `political_and_issue_ads`, selon les options déjà prises en charge par l’extension.
- `keyword` : chaîne nettoyée de 1 à 120 caractères.
- `adLimit` : entier de 1 à 200.
- `activeDays` : entier de 0 à 3650.

Réponse : `201` avec `job.id`, `job.status`, `job.params`, `job.createdAt`.

### 2. Lire un job — Web

`GET /jobs/:jobId`

Retourne le statut, la progression, les paramètres et les résultats du job, uniquement si `owner_id = req.userId`.

### 3. Lister les jobs — Web

`GET /jobs?limit=20`

Retourne les jobs du owner connecté, du plus récent au plus ancien. Limite serveur : 1 à 50.

### 4. Publier la progression — extension

`PATCH /jobs/:jobId/progress`

Corps proposé :

```json
{
  "stage": "collecting",
  "scannedCount": 20,
  "collectedCount": 12,
  "message": "12 annonces collectées"
}
```

Les compteurs doivent être des entiers positifs bornés. L’API vérifie le propriétaire du job.

### 5. Enregistrer les annonces — extension

`POST /jobs/:jobId/ads`

Corps : `{ "items": [ ... ] }`.

Chaque annonce est validée et normalisée côté serveur. Les champs de première version sont :
- identifiant d’annonce Meta lorsqu’il est exposé ;
- nom de page / annonceur lorsqu’il est exposé ;
- URL Ads Library ;
- URL produit détectée ;
- texte ou titre disponible ;
- URL d’image et URL vidéo si disponibles ;
- pays et date observés ;
- données produit Shopify enrichies lorsqu’elles sont disponibles.

Les champs non exposés par Meta restent facultatifs. Une absence de donnée ne doit pas être inventée.

### 6. Terminer un job — extension

`POST /jobs/:jobId/complete`

Corps proposé :

```json
{
  "status": "completed",
  "scannedCount": 50,
  "collectedCount": 23,
  "message": "Analyse terminée"
}
```

Les états autorisés sont : `queued`, `starting`, `collecting`, `completed`, `failed`, `cancelled`.

## Modèle de données proposé

Séparer les exécutions des annonces collectées et des snapshots agrégés existants.

### `ad_research_jobs`

- `id` : identifiant du job.
- `owner_id` : propriétaire, lié à `app_users(id)`.
- `status` : état contrôlé par une liste fermée.
- `country`, `ad_category`, `keyword`.
- `ad_limit`, `active_days`.
- `scanned_count`, `collected_count`, `progress_stage`, `progress_message`.
- `error_message`, `started_at`, `completed_at`.
- `created_at`, `updated_at`.

### `ad_research_ads`

- `id`, `job_id`, `owner_id`.
- `meta_ad_id`, `advertiser_name`, `ad_library_url`.
- `product_url`, `ad_text`, `image_url`, `video_url`.
- `country`, `first_seen_at`, `last_seen_at`.
- `raw_data` JSONB limité aux données utiles et non sensibles.
- contrainte d’unicité adaptée à `job_id + meta_ad_id` lorsque l’identifiant Meta existe.

Les snapshots agrégés `ad_research_snapshots` sont conservés pour compatibilité avec l’extension actuelle. Ils ne sont pas remplacés dans cette phase.

## Sécurité obligatoire

- Autoriser uniquement l’origine Web de production explicitement retenue dans `externally_connectable` ; ne pas utiliser de joker.
- Dans `onMessageExternal`, vérifier `sender.origin`, `sender.url`, le type du message et chaque paramètre.
- N’accepter que le message de démarrage nécessaire ; ne jamais exposer une API générique de l’extension au site Web.
- L’extension valide son propre JWT via le profil backend et exige le rôle owner.
- Le backend compare systématiquement `req.userId` avec `owner_id` du job pour chaque opération.
- Ne jamais accepter `owner_id` depuis le corps ou les paramètres pour déterminer le propriétaire.
- Limiter taille des lots, longueur des champs, nombre de résultats et fréquence des mises à jour.
- N’enregistrer que les URLs et médias utiles ; ne pas stocker de cookies ou de jetons Meta.
- Les résultats partiels restent consultables si le job échoue après une collecte partielle.

## Périmètre d’implémentation après validation du contrat

1. Ajouter une migration SQL manuelle et réversible pour les deux nouvelles tables et leurs index.
2. Implémenter les routes backend jobs/ads avec authentification owner et contrôle d’appartenance.
3. Ajouter le pont externe strict dans le manifeste MV3 et le service worker.
4. Adapter le collecteur existant pour envoyer les annonces et la progression sans casser les snapshots.
5. Ajouter les tests de validation, d’isolation owner et de messages externes.
6. Ensuite seulement, construire l’écran Product Research dans le dashboard Web.

## Hors périmètre de cette phase

- Aucune modification du dashboard React.
- Aucune modification du collecteur Ads Library.
- Aucune migration exécutée.
- Aucun déploiement Render, Firebase ou Chrome Web Store.
- Aucune promesse d’exhaustivité des annonces Meta : la collecte reste limitée aux annonces effectivement accessibles et chargées dans le navigateur.

## Critères d’acceptation

- Un compte non-owner reçoit `403` sur toutes les routes Product Research.
- Un owner ne peut ni lire ni modifier le job d’un autre owner.
- Un site tiers ne peut pas démarrer une recherche via le pont externe.
- L’extension refuse de travailler sans session owner valide.
- Le JWT Web n’est jamais transmis à l’extension.
- Les snapshots existants continuent de fonctionner sans changement de contrat.
