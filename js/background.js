const UI_LANGUAGE_STORAGE_KEY = 'uiLanguage'

const SUPPORTED_UI_LANGUAGES = new Set(['auto', 'en', 'zh_CN', 'ja', 'ko'])

function normalizeUiLanguage(value) {
  const lang = String(value || 'auto')
  return SUPPORTED_UI_LANGUAGES.has(lang) ? lang : 'auto'
}

function storageSyncGet(defaults) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(defaults, (items) => resolve(items || {}))
  })
}

function updateContextMenu(id, update) {
  return new Promise((resolve) => {
    try {
      chrome.contextMenus.update(id, update, () => resolve())
    } catch (_) {
      resolve()
    }
  })
}

let cachedUiLanguage = null
let cachedOverrideMessages = null

async function loadLocaleMessages(locale) {
  if (!locale || locale === 'auto') return null
  try {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`)
    const resp = await fetch(url)
    if (!resp.ok) return null
    return await resp.json()
  } catch (_) {
    return null
  }
}

async function getUiLanguage() {
  const items = await storageSyncGet({ [UI_LANGUAGE_STORAGE_KEY]: 'auto' })
  return normalizeUiLanguage(items[UI_LANGUAGE_STORAGE_KEY])
}

async function t(key) {
  const lang = await getUiLanguage()
  if (lang !== cachedUiLanguage) {
    cachedUiLanguage = lang
    cachedOverrideMessages = await loadLocaleMessages(lang)
  }

  const msg = cachedOverrideMessages && cachedOverrideMessages[key] && cachedOverrideMessages[key].message
  if (typeof msg === 'string' && msg.length > 0) return msg
  return chrome.i18n.getMessage(key) || ''
}

async function refreshContextMenus() {
  await updateContextMenu('Memos-send-selection', { title: await t('sendTo') })
  await updateContextMenu('Memos-send-link', { title: await t('sendLinkTo') })
  await updateContextMenu('Memos-send-image', { title: await t('sendImageTo') })
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    type: 'normal',
    title: chrome.i18n.getMessage('sendTo'),
    id: 'Memos-send-selection',
    contexts: ['selection']
  })
  chrome.contextMenus.create({
    type: 'normal',
    title: chrome.i18n.getMessage('sendLinkTo'),
    id: 'Memos-send-link',
    contexts: ['link', 'page']
  })
  chrome.contextMenus.create({
    type: 'normal',
    title: chrome.i18n.getMessage('sendImageTo'),
    id: 'Memos-send-image',
    contexts: ['image']
  })

  // Apply override titles if user selected a fixed language.
  refreshContextMenus()
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return
  if (!changes[UI_LANGUAGE_STORAGE_KEY]) return
  cachedUiLanguage = null
  cachedOverrideMessages = null
  refreshContextMenus()
})

chrome.contextMenus.onClicked.addListener((info) => {
  let tempCont = ''
  switch (info.menuItemId) {
    case 'Memos-send-selection':
      tempCont =
        info.selectionText +
        '\n' +
        `[Reference Link](${info.linkUrl || info.pageUrl})` +
        '\n'
      break
    case 'Memos-send-link':
      tempCont = (info.linkUrl || info.pageUrl) + '\n'
      break
    case 'Memos-send-image':
      tempCont = `![](${info.srcUrl})` + '\n'
      break
  }

  chrome.storage.sync.get(
    { open_action: 'save_text', open_content: '' },
    function (items) {
      if (items.open_action === 'upload_image') {
        t('picPending').then((m) => alert(m))
      } else {
        chrome.storage.sync.set({
          open_action: 'save_text',
          open_content: items.open_content + tempCont
        })
      }
    }
  )
})