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

function storageSyncSet(items) {
	return new Promise((resolve) => {
		chrome.storage.sync.set(items, () => resolve())
	})
}

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

function formatSubstitutions(message, substitutions) {
	if (!message) return ''
	if (substitutions == null) return message
	const subs = Array.isArray(substitutions) ? substitutions : [substitutions]
	let out = message
	for (let i = 0; i < subs.length; i++) {
		const v = String(subs[i])
		out = out.replaceAll(`$${i + 1}`, v)
		out = out.replace('%s', v)
	}
	return out
}

let currentUiLanguage = 'auto'
let overrideMessages = null

function t(key, substitutions) {
	const msg = overrideMessages && overrideMessages[key] && overrideMessages[key].message
	if (typeof msg === 'string' && msg.length > 0) {
		return formatSubstitutions(msg, substitutions)
	}
	const chromeMsg = chrome.i18n.getMessage(key, substitutions) || ''
	return formatSubstitutions(chromeMsg, substitutions)
}

function setText(id, messageKey) {
	const el = document.getElementById(id)
	if (el) el.textContent = t(messageKey)
}

function setPlaceholder(id, messageKey) {
	const el = document.getElementById(id)
	if (el) el.placeholder = t(messageKey)
}

function setTitle(id, messageKey) {
	const el = document.getElementById(id)
	if (el) el.title = t(messageKey)
}

function applyStaticI18n() {
	setText('saveKey', 'saveBtn')
	setText('saveTag', 'saveBtn')

	setText('supportedMemosVersion', 'supportedMemosVersion')

	setPlaceholder('apiUrl', 'placeApiUrl')
	setPlaceholder('apiTokens', 'placeApiTokens')
	setPlaceholder('content', 'placeContent')

	setText('lockPrivate', 'lockPrivate')
	setText('lockProtected', 'lockProtected')
	setText('lockPublic', 'lockPublic')

	setText('content_submit_text', 'submitBtn')

	setPlaceholder('hideInput', 'placeHideInput')
	setPlaceholder('showInput', 'placeShowInput')

	setText('uploadlist-title', 'uploadedListTitle')

	// Language switcher
	setText('langOptionAuto', 'langAuto')
	setText('langOptionEn', 'langEnglish')
	setText('langOptionZhCN', 'langChineseSimplified')
	setText('langOptionJa', 'langJapanese')
	setText('langOptionKo', 'langKorean')
	setTitle('langSelect', 'tipLanguage')

	// Native hover tooltips (title)
	setTitle('opensite', 'tipOpenSite')
	setTitle('blog_info_edit', 'tipSettings')
	setTitle('tags', 'tipTags')
	setTitle('newtodo', 'tipTodo')
	setTitle('upres', 'tipUpload')
	setTitle('getlink', 'tipLink')
	setTitle('random', 'tipRandom')
	setTitle('search', 'tipSearch')
	setTitle('lock', 'tipVisibility')
	setTitle('content_submit_text', 'tipSend')
}

async function setUiLanguage(nextLang, { persist = true } = {}) {
	const lang = normalizeUiLanguage(nextLang)
	currentUiLanguage = lang
	overrideMessages = await loadLocaleMessages(lang)
	applyStaticI18n()

	const select = document.getElementById('langSelect')
	if (select && select.value !== lang) select.value = lang

	if (persist) await storageSyncSet({ [UI_LANGUAGE_STORAGE_KEY]: lang })
	window.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }))
}

async function initLanguageSwitcher() {
	const select = document.getElementById('langSelect')
	if (select) {
		select.addEventListener('change', async () => {
			await setUiLanguage(select.value)
		})
	}

	const items = await storageSyncGet({ [UI_LANGUAGE_STORAGE_KEY]: 'auto' })
	const stored = normalizeUiLanguage(items[UI_LANGUAGE_STORAGE_KEY])
	if (select) select.value = stored
	await setUiLanguage(stored, { persist: false })
}

window.t = t
window.setUiLanguage = setUiLanguage
window.getUiLanguage = () => currentUiLanguage

applyStaticI18n()
window.i18nReady = initLanguageSwitcher()