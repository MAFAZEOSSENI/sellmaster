globalThis.SellmasterShopifySelectors = Object.freeze({
  appCreate: {
    nameInputs: [
      'input[name="name"]',
      'input[name="appName"]',
      'input[name="app_name"]',
      'input[name="app-name"]',
      'input[aria-label*="app name" i]',
      'input[aria-label*="application name" i]',
      'input[aria-label*="nom de l’application" i]',
      'input[placeholder*="App name" i]',
      'input[placeholder*="App Name" i]',
      'input[placeholder*="app name" i]',
      'input[placeholder*="application name" i]',
      'input[data-testid*="app-name" i]',
      'input[data-testid*="name" i]',
      'input[role="textbox"][type="text"]',
      'input[type="text"]',
      'textarea[placeholder*="App name" i]',
      'textarea[aria-label*="app name" i]'
    ],
    createButtons: [
      'button[type="submit"]',
      'button[data-testid*="create"]',
      'button[data-testid*="submit"]',
      'button[aria-label*="create app" i]',
      'button[aria-label*="create" i]',
      'button[data-primary="true"]',
      'button[data-variant="primary"]',
      'button[role="button"][type="button"]',
      '[data-testid*="create-app" i]',
      '[data-testid*="create" i]'
    ]
  },
  access: {
    scopeInputs: [
      'input[type="checkbox"][value="{scope}"]',
      'input[type="checkbox"][name="{scope}"]',
      'input[type="checkbox"][data-scope="{scope}"]',
      'input[type="checkbox"][data-value="{scope}"]',
      'input[type="checkbox"][data-testid*="{scope}" i]',
      'input[type="checkbox"][aria-label*="{scope}" i]',
      '[role="checkbox"][data-value="{scope}"]',
      '[role="checkbox"][data-scope="{scope}"]',
      '[role="switch"][data-value="{scope}"]',
      '[role="switch"][data-scope="{scope}"]',
      'button[role="checkbox"][data-value="{scope}"]',
      'button[role="switch"][data-value="{scope}"]',
      '[data-scope*="{scope}" i]',
      '[data-value*="{scope}" i]',
      '[data-testid*="{scope}" i]',
      '[aria-label*="{scope}" i]',
      'input[type="checkbox"][value*="{scope}"]',
      'input[type="checkbox"][name*="{scope}"]'
    ],
    scopeRows: [
      '[data-scope="{scope}"]',
      '[data-scope*="{scope}" i]',
      '[data-testid*="{scope}" i]',
      '[data-value="{scope}"]',
      '[data-value*="{scope}" i]',
      '[data-name*="{scope}" i]',
      '[aria-label*="{scope}" i]',
      'button[role="checkbox"]',
      'button[role="switch"]',
      '[role="checkbox"]',
      '[role="switch"]',
      'label',
      'tr',
      'div'
    ],
    nestedCheckboxes: [
      'input[type="checkbox"]',
      'input[type="radio"]',
      '[role="checkbox"]',
      '[role="switch"]',
      'button[role="checkbox"]',
      'button[role="switch"]',
      '[data-role="checkbox"]'
    ],
    roleCheckboxes: [
      '[role="checkbox"]',
      '[role="switch"]',
      'button[role="checkbox"]',
      'button[role="switch"]',
      '[data-role="checkbox"]'
    ],
    navigationLinks: [
      'a[href*="access"]',
      'a[href*="permission"]',
      'a[href*="configuration"]',
      'button[aria-label*="access" i]',
      'button[aria-label*="permission" i]',
      'button[aria-label*="configure" i]',
      'button[title*="access" i]',
      'button[title*="permission" i]'
    ],
    saveButtons: [
      'button[type="submit"]',
      'button[data-testid*="save"]',
      'button[data-testid*="continue"]',
      'button[aria-label*="save" i]',
      'button[aria-label*="continue" i]',
      'button[title*="save" i]',
      'button[title*="continue" i]'
    ]
  },
  settings: {
    tabButtons: [
      'a[href*="settings"]',
      'button[aria-label*="settings" i]',
      '[role="tab"]',
      'button[title*="settings" i]'
    ],
    appUrlInputs: [
      'input[name="application_url"]',
      'input[name="app_url"]',
      'input[aria-label*="app url" i]',
      'input[aria-label*="App URL" i]',
      'input[placeholder*="App URL" i]',
      'input[placeholder*="app url" i]',
      'input[placeholder*="application url" i]',
      'input[aria-label*="application url" i]',
      'input[name*="application_url"]',
      'input[name*="app_url"]',
      'input[data-testid*="application-url" i]'
    ],
    redirectInputs: [
      'input[name="redirect_urls"]',
      'input[name="redirect_url"]',
      'textarea[name="redirect_urls"]',
      'textarea[name="redirect_url"]',
      'input[aria-label*="redirect url" i]',
      'input[aria-label*="redirect urls" i]',
      'input[aria-label*="Allowed redirection URL" i]',
      'textarea[aria-label*="redirect url" i]',
      'textarea[aria-label*="Allowed redirection URL" i]',
      'input[placeholder*="redirect url" i]',
      'input[placeholder*="redirect URLs" i]',
      'textarea[placeholder*="redirect url" i]',
      'textarea[placeholder*="redirect URLs" i]',
      'textarea[placeholder*="Allowed redirection URL" i]',
      'input[aria-label*="callback url" i]',
      'input[placeholder*="callback url" i]'
    ],
    saveButtons: [
      'button[type="submit"]',
      'button[data-testid*="save"]',
      'button[aria-label*="save" i]',
      'button[title*="save" i]',
      'button[data-testid*="continue" i]'
    ],
    publishButtons: [
      'button[data-testid*="release"]',
      'button[aria-label*="publish" i]',
      'button[aria-label*="release" i]',
      'button[title*="publish" i]',
      'button[title*="release" i]',
      'button[data-testid*="publish" i]'
    ],
    publishConfirmButtons: [
      'button[data-testid*="confirm-publish"]',
      'button[aria-label*="confirm publish" i]',
      'button[aria-label*="confirm release" i]',
      'button[title*="publish" i]',
      'button[aria-label*="confirm" i]'
    ],
    settingsTab: [
      'a[href*="settings"]',
      'button[aria-label*="settings" i]',
      '[role="tab"]',
      'button[title*="settings" i]'
    ],
    clientIdInputs: [
      'input[name="client_id"]',
      'input[name="client-id"]',
      'input[aria-label*="client id" i]',
      'input[aria-label*="Client ID" i]',
      'input[id*="client-id"]',
      'input[data-testid*="client-id"]',
      '[data-testid*="client-id"]',
      '[id*="client-id"]',
      '[aria-label*="client id" i]',
      '[data-name*="client-id" i]',
      'input[type="text"][value*="[a-f0-9]{8,}"]',
      'input[placeholder*="Client ID" i]'
    ],
    rotateSecretButtons: [
      'button[data-testid*="rotate"]',
      'button[aria-label*="rotate" i]',
      'button[aria-label*="generate secret" i]',
      'button[title*="rotate" i]',
      'button[data-testid*="generate" i]'
    ],
    rotateConfirmButtons: [
      'button[data-testid*="confirm-rotate"]',
      'button[aria-label*="confirm rotate" i]',
      'button[aria-label*="confirm rotation" i]',
      'button[title*="rotate" i]',
      'button[aria-label*="confirm" i]'
    ],
    clientSecretInputs: [
      'input[name="client_secret"]',
      'input[name="client-secret"]',
      'input[aria-label*="client secret" i]',
      'input[aria-label*="Client Secret" i]',
      'input[id*="client-secret"]',
      'input[data-testid*="client-secret"]',
      'input[type="password"]',
      '[data-testid*="client-secret"]',
      '[id*="client-secret"]',
      '[aria-label*="client secret" i]',
      'textarea[aria-label*="client secret" i]',
      'textarea[aria-label*="Client Secret" i]',
      'input[type="text"][name*="secret" i]',
      'input[placeholder*="Client Secret" i]'
    ]
  }
});
