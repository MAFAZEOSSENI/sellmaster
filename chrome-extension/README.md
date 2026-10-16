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

The dashboard URL is centralized in `app-config.js` (`SELLMASTER_WEB_URL`) and can also be overridden from the extension options. The popup dashboard button and Shopify OAuth success link use that URL.

## Ads Library product research

1. Sign in through the extension popup with an active Sellmaster **owner** account, then choose **Rechercher des produits dans Ads Library**. The Ads Library panel stays locked until the server confirms the session; searches, scans, and exports revalidate it.
2. In the Sellmaster panel on Facebook Ads Library, select a country and ad category, then start the `myshopify` search. **Toutes les publicités** is selected by default; **Enjeux, élections ou politique** is also available. All 54 African countries are included in the **Afrique** group.
3. Set the desired number of ads (1–50; default 20) and the minimum active duration in days (0–3650; default 10), then choose **Analyser + charger**. The scanner progressively scrolls the page and waits for Meta to load more cards. Ads pointing to the same product page are deduplicated by canonical Shopify product URL (tracking query parameters are ignored); the longest-running eligible ad is kept. Collection/homepage ads remain distinct by Meta Library ID. It stops at the requested unique count, after 30 passes, or after five passes without additional loaded cards. Results meeting the selected active-day threshold are sorted oldest first. Preferences are remembered for the next search.
4. Each result includes a product thumbnail, preferring the Shopify product's featured image and falling back to the ad creative when available. The CSV includes the image URL and the PDF includes the thumbnail. Each result also includes a direct **Bibliothèque vidéo** link to its Meta Ad Library entry, built from its Library ID. Export the table as CSV, or choose PDF to open the browser print dialog and save the page as PDF; both exports include that link. Files use the format `{count}produits-winner-{country}.csv` or `.pdf`, with accents and spaces normalized (for example `20produits-winner-benin.csv`).

The scanner reads ad cards rendered by Facebook while progressively scrolling; it does not bypass Meta's login, rate limits, result limits, or access restrictions. Shopify destinations are preferred over unrelated links. Product names are derived from `/products/` URL handles when no explicit title is present; collection and shop-home destinations are labeled as such, since they do not identify a single product. Ads without a parseable start date are excluded rather than guessed. The country column reflects the selected Ads Library country, not an independently verified shipping market. Meta may not offer every country as a selectable ad audience in every account or search context.

## Dedicated app setup

1. Open the extension options and set the Shopify **App URL** (defaults to `https://www.sellmaster.site/`) and the fixed Sellmaster **Redirect URI**.
2. On the target Shopify admin page, choose **Auto** and click **Créer une app dédiée automatiquement**. The extension opens the Shopify developer dashboard without assuming an organization.
3. Select your organization in Shopify Developer. The extension detects its ID from the current URL and navigates to `https://dev.shopify.com/dashboard/{orgId}/apps/new`.
4. Click **Auto-remplir**. The extension continues through app creation, scopes, URLs, publication, then registers the Client ID and generated secret with Sellmaster and opens the store grant page.
4. If Shopify changes its dashboard UI, adjust selectors only in `selectors.js`.

The automated dashboard steps are best-effort because Shopify changes its developer UI. The generated client secret is read only after the explicit user action and is sent to Sellmaster without being stored in extension storage.
