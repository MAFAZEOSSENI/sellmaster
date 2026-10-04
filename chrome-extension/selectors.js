globalThis.SellmasterShopifySelectors = Object.freeze({
  appCreate: {
    nameInputs: [
      'input[name="name"]',
      'input[name="appName"]',
      'input[aria-label*="app name" i]',
      'input[placeholder*="app name" i]',
      'input[placeholder*="application name" i]'
    ],
    createButtons: [
      'button[type="submit"]',
      'button[data-testid*="create"]',
      'button[aria-label*="create app" i]'
    ]
  },
  access: {
    scopeInputs: [
      'input[type="checkbox"][value="{scope}"]',
      'input[type="checkbox"][name="{scope}"]',
      'input[type="checkbox"][data-scope="{scope}"]',
      '[role="checkbox"][data-value="{scope}"]'
    ],
    scopeRows: [
      '[data-scope="{scope}"]',
      '[data-testid*="{scope}"]',
      'label'
    ],
    nestedCheckboxes: [
      'input[type="checkbox"]',
      '[role="checkbox"]'
    ],
    roleCheckboxes: [
      '[role="checkbox"]'
    ],
    navigationLinks: [
      'a[href*="access"]',
      'a[href*="permission"]',
      'a[href*="configuration"]',
      'button[aria-label*="access" i]',
      'button[aria-label*="permission" i]'
    ],
    saveButtons: [
      'button[type="submit"]',
      'button[data-testid*="save"]',
      'button[aria-label*="save" i]'
    ]
  },
  settings: {
    tabButtons: [
      'a[href*="settings"]',
      'button[aria-label*="settings" i]',
      '[role="tab"]'
    ],
    appUrlInputs: [
      'input[name="application_url"]',
      'input[name="app_url"]',
      'input[aria-label*="app url" i]',
      'input[placeholder*="app url" i]'
    ],
    redirectInputs: [
      'input[name="redirect_urls"]',
      'input[name="redirect_url"]',
      'textarea[name="redirect_urls"]',
      'input[aria-label*="redirect url" i]',
      'input[placeholder*="redirect url" i]',
      'textarea[aria-label*="redirect url" i]'
    ],
    saveButtons: [
      'button[type="submit"]',
      'button[data-testid*="save"]',
      'button[aria-label*="save" i]'
    ],
    publishButtons: [
      'button[data-testid*="release"]',
      'button[aria-label*="publish" i]',
      'button[aria-label*="release" i]'
    ],
    publishConfirmButtons: [
      'button[data-testid*="confirm-publish"]',
      'button[aria-label*="confirm publish" i]',
      'button[aria-label*="confirm release" i]'
    ],
    settingsTab: [
      'a[href*="settings"]',
      'button[aria-label*="settings" i]',
      '[role="tab"]'
    ],
    clientIdInputs: [
      'input[name="client_id"]',
      'input[aria-label*="client id" i]',
      'input[id*="client-id"]',
      'input[data-testid*="client-id"]',
      '[data-testid*="client-id"]',
      '[id*="client-id"]',
      '[aria-label*="client id" i]'
    ],
    rotateSecretButtons: [
      'button[data-testid*="rotate"]',
      'button[aria-label*="rotate" i]',
      'button[aria-label*="generate secret" i]'
    ],
    rotateConfirmButtons: [
      'button[data-testid*="confirm-rotate"]',
      'button[aria-label*="confirm rotate" i]',
      'button[aria-label*="confirm rotation" i]'
    ],
    clientSecretInputs: [
      'input[name="client_secret"]',
      'input[aria-label*="client secret" i]',
      'input[id*="client-secret"]',
      'input[data-testid*="client-secret"]',
      'input[type="password"]',
      '[data-testid*="client-secret"]',
      '[id*="client-secret"]',
      '[aria-label*="client secret" i]'
    ]
  }
});
