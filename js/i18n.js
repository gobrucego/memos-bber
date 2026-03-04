function getMessage(key) {
	return chrome.i18n.getMessage(key) || ''
}

function setText(id, messageKey) {
	const el = document.getElementById(id)
	if (el) el.textContent = getMessage(messageKey)
}

function setPlaceholder(id, messageKey) {
	const el = document.getElementById(id)
	if (el) el.placeholder = getMessage(messageKey)
}

function setTitle(id, messageKey) {
	const el = document.getElementById(id)
	if (el) el.title = getMessage(messageKey)
}

setText("saveKey", "saveBtn")
setText("saveTag", "saveBtn")

setPlaceholder("apiUrl", "placeApiUrl")
setPlaceholder("apiTokens", "placeApiTokens")
setPlaceholder("content", "placeContent")

setText("lockPrivate", "lockPrivate")
setText("lockProtected", "lockProtected")
setText("lockPublic", "lockPublic")

setText("content_submit_text", "submitBtn")

setPlaceholder("hideInput", "placeHideInput")
setPlaceholder("showInput", "placeShowInput")

setText("uploadlist-title", "uploadedListTitle")

// Native hover tooltips (title)
setTitle("opensite", "tipOpenSite")
setTitle("blog_info_edit", "tipSettings")
setTitle("tags", "tipTags")
setTitle("newtodo", "tipTodo")
setTitle("upres", "tipUpload")
setTitle("getlink", "tipLink")
setTitle("random", "tipRandom")
setTitle("search", "tipSearch")
setTitle("lock", "tipVisibility")
setTitle("content_submit_text", "tipSend")