# Sellmaster Shopify Connector

Chrome Manifest V3 extension source.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `chrome-extension` directory.
4. Open the extension popup and sign in with an existing Sellmaster owner account.
5. Open a Shopify admin page. The floating **Connecteur Sellmaster** panel detects the store from its URL when possible.

## Connection modes

- **Auto** asks Sellmaster to start OAuth with the credentials already registered for this shop, or the shared-app fallback.
- **Manual** sends the shop's Client ID and Client Secret to the authenticated Sellmaster registration endpoint, then starts OAuth. The secret is not persisted by the extension.

The extension calls the production API at `https://sellmaster-1.onrender.com/api`. Update `API_BASE` in `popup.js` and `background.js` together if the backend host changes.

## Dedicated app setup

1. Open the extension options and set the Shopify **App URL** and the fixed Sellmaster **Redirect URI**.
2. On the target Shopify admin page, choose **Auto** and click **Créer une app dédiée automatiquement**. The extension opens the Shopify developer dashboard without assuming an organization.
3. Select your organization in Shopify Developer. The extension detects its ID from the current URL and navigates to `https://dev.shopify.com/dashboard/{orgId}/apps/new`.
4. Click **Auto-remplir**. The extension continues through app creation, scopes, URLs, publication, then registers the Client ID and generated secret with Sellmaster and opens the store grant page.
4. If Shopify changes its dashboard UI, adjust selectors only in `selectors.js`.

The automated dashboard steps are best-effort because Shopify changes its developer UI. The generated client secret is read only after the explicit user action and is sent to Sellmaster without being stored in extension storage.
