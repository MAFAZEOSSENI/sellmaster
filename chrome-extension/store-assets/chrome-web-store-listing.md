# Chrome Web Store listing

## Name
Sellmaster Shopify Connector

## Short description
Connectez une boutique Shopify à Sellmaster et configurez l’autorisation OAuth depuis l’administration Shopify.

## Detailed description
Sellmaster Shopify Connector accompagne les propriétaires Sellmaster dans la connexion de leurs boutiques Shopify.

Depuis l’administration Shopify, ouvrez le panneau Connecteur Sellmaster pour lancer le flux d’autorisation. Vous pouvez utiliser les credentials déjà associés à la boutique ou enregistrer les credentials d’une application Shopify dédiée. Sur le dashboard développeur Shopify, l’assistant peut guider la création et la configuration de l’application, puis renvoyer vers l’autorisation de la boutique.

Fonctionnalités :
- Connexion avec un compte Sellmaster propriétaire.
- Détection du domaine de boutique à partir de l’URL Shopify.
- Modes de connexion automatique et manuel.
- Enregistrement sécurisé côté Sellmaster des credentials nécessaires à OAuth.
- Ouverture de l’autorisation Shopify dans un nouvel onglet.

L’automatisation du dashboard développeur dépend de l’interface Shopify et peut nécessiter une adaptation si celle-ci change. L’utilisateur doit vérifier les valeurs configurées avant de publier l’application.

## Category
Productivity

## Privacy policy URL
https://sellmaster-1.onrender.com/chrome-extension/privacy-policy

## Permission justification
- `storage`: conserve le JWT Sellmaster, les préférences et l’état temporaire de configuration localement.
- Shopify host access: injecte le panneau sur les pages d’administration Shopify déclarées et assiste l’utilisateur sur le dashboard développeur Shopify.
- Sellmaster host access: authentifie le propriétaire et transmet à l’API les informations nécessaires à l’association OAuth.

## Data disclosure
See `privacy-policy.html`. The extension reads the Shopify store identifier from the URL. During the explicitly started app setup, it reads only the visible app setup fields needed to configure OAuth and obtain the generated app credentials. Credentials are sent to Sellmaster over HTTPS and are not persisted by the extension.

## Screenshot assets
- `screenshots/popup.png`
- `screenshots/connector-panel.png`

Before publication, capture final screenshots from the actual unpacked extension in Chrome and replace the illustrative draft screenshots if the UI changed.
