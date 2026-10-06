# Sellmaster theme app extension

This folder contains the Shopify Theme App Extension source. The `Sellmaster` app embed asks the merchant for a form token and loads the hosted widget at `https://sellmaster-1.onrender.com/widget.js`. The widget inserts itself after Shopify's native `form[action="/cart/add"]`; if that form is unavailable it falls back to its popup behavior.

## Link to the existing Shopify app

This repository does not contain a Shopify CLI app configuration or the Partner app's client ID. Do not create a second Shopify app for this extension and do not deploy the example config as-is. Use the existing Sellmaster app in the Shopify Partner organization.

1. Install Shopify CLI and authenticate the account that can access the existing Sellmaster Partner app:

   ```sh
   npm install -g @shopify/cli@latest
   shopify auth login
   ```

2. In the existing Shopify CLI app project, link its app configuration to the existing Partner app if it is not already linked:

   ```sh
   shopify app config link
   ```

   Select the existing Sellmaster app. Keep its current `client_id`, application URL, OAuth callback URLs, access scopes, and webhook configuration. The repository-level `shopify.app.toml.example` is illustrative only, not a replacement for the real app config.

3. Copy this extension directory into that app project's `extensions/` directory. For example, from the Sellmaster repository root:

   ```sh
   cp -R shopify-theme-extension /path/to/existing-shopify-app/extensions/sellmaster-order-form
   ```

   Keep `extension.toml`, `blocks/`, and `assets/` together in the copied extension folder.

4. From the existing Shopify app project root, validate and deploy the app release:

   ```sh
   shopify app deploy
   ```

   Review the CLI output and confirm the new `Sellmaster` theme app extension is included in the deployed version. Extension deployments require the app owner's Partner access and Shopify CLI; they cannot be published from the Sellmaster backend's Render deployment alone.

## Merchant setup

1. Generate and publish a form in Sellmaster's Form Builder: `https://sellmaster-1.onrender.com/form-builder/`.
2. Copy that form's public token from the generated widget script. Paste only the token, not the whole script.
3. In Shopify, open **Boutique en ligne > Thèmes > Personnaliser > App embeds**.
4. Enable **Sellmaster**, paste the form token into **Token du formulaire Sellmaster**, and click **Enregistrer**.
5. Open a product page and verify the form appears after the native add-to-cart form. The embed is global at theme level; the widget positions itself after the product form when it is present.

The form submit creates a real Shopify order. Test against a development/test shop first. The backend widget endpoint and public form must be deployed and reachable over HTTPS.

## Older themes without App Embeds

For themes that do not support Online Store 2.0 app embeds, keep the manual script as a fallback:

```html
<script async src="https://sellmaster-1.onrender.com/widget.js?token=YOUR_64_CHARACTER_FORM_TOKEN"></script>
```

Paste it into the theme's `layout/theme.liquid` immediately before `</body>`. The current widget still tries to place the integrated form after `form[action="/cart/add"]` and falls back to its popup if the native cart form is not found.
