(function (global) {
  'use strict'

  function buildFilter(parts) {
    const p = parts || {}
    const exprs = []

    if (p.creator) {
      // v0.23 expects a CEL string variable `creator`.
      exprs.push('creator == ' + JSON.stringify(String(p.creator)))
    }

    if (Array.isArray(p.visibilities) && p.visibilities.length > 0) {
      const list = p.visibilities.map(function (v) {
        return JSON.stringify(String(v))
      })
      exprs.push('visibilities == [' + list.join(',') + ']')
    }

    if (typeof p.contentSearch === 'string' && p.contentSearch.length > 0) {
      exprs.push('content_search == [' + JSON.stringify(String(p.contentSearch)) + ']')
    }

    if (typeof p.rowStatus === 'string' && p.rowStatus.length > 0) {
      exprs.push('row_status == ' + JSON.stringify(String(p.rowStatus)))
    }

    if (Array.isArray(p.tagSearch) && p.tagSearch.length > 0) {
      const list = p.tagSearch.map(function (t) {
        return JSON.stringify(String(t).replace(/^#/, ''))
      })
      exprs.push('tag_search == [' + list.join(',') + ']')
    }

    if (typeof p.random === 'boolean') {
      exprs.push('random == ' + (p.random ? 'true' : 'false'))
    }

    if (typeof p.limit === 'number' && Number.isFinite(p.limit) && p.limit > 0) {
      exprs.push('limit == ' + String(Math.floor(p.limit)))
    }

    return exprs.join(' && ')
  }

  function extractTagsFromMemo(memo) {
    if (!memo) return []

    // v0.23: tags live in memo.property.tags
    if (memo.property && Array.isArray(memo.property.tags)) return memo.property.tags

    // Defensive: some versions/serializers may use `properties` instead of `property`.
    if (memo.properties && Array.isArray(memo.properties.tags)) return memo.properties.tags

    // Defensive: some JSON serializers may wrap repeated fields.
    if (memo.property && memo.property.tags && Array.isArray(memo.property.tags.values)) {
      return memo.property.tags.values
    }

    if (memo.properties && memo.properties.tags && Array.isArray(memo.properties.tags.values)) {
      return memo.properties.tags.values
    }

    // Fallback: parse tags from content, e.g. "#tag".
    const content = typeof memo.content === 'string' ? memo.content : ''
    if (!content) return []

    const found = []
    // Match any hashtag token; server-side parser is stricter, but we want a lenient UI fallback.
    const re = /#([^\s#]+)/g
    let m
    while ((m = re.exec(content))) {
      let tag = m[1] || ''
      // Trim trailing punctuation/brackets commonly attached in markdown.
      tag = tag.replace(/[\]\[\)\(\}\{"'.,;:!?]+$/g, '')
      tag = tag.replace(/^#+/, '')
      tag = tag.trim()
      if (!tag) continue
      if (tag.length > 64) tag = tag.slice(0, 64)
      found.push(tag)
    }

    return Array.from(new Set(found))
  }

  function listMemos(info, options, success, fail) {
    const opt = options || {}
    const pageSize = opt.pageSize && Number.isFinite(opt.pageSize) ? Math.max(1, Math.floor(opt.pageSize)) : 1000
    const filterExpr = typeof opt.filterExpr === 'string' ? opt.filterExpr : ''

    const qs =
      '?pageSize=' +
      encodeURIComponent(String(pageSize)) +
      (filterExpr ? '&filter=' + encodeURIComponent(filterExpr) : '')

    // v0.23 removed the user-scoped memos endpoint: `/api/v1/users/{id}/memos`.
    // Don't reuse fetchMemosWithFallback() because it will always emit an extra 404 first.
    global.$
      .ajax({
        url: info.apiUrl + 'api/v1/memos' + qs,
        type: 'GET',
        contentType: 'application/json',
        dataType: 'json',
        headers: { Authorization: 'Bearer ' + info.apiTokens }
      })
      .done(function (data) {
        success(data)
      })
      .fail(function (xhr) {
        if (fail) fail(xhr)
      })
  }

  function probeApiFlavor(apiUrl, apiTokens, callback) {
    const headers = { Authorization: 'Bearer ' + apiTokens }

    function looksLikeMemosListPayload(data) {
      if (!data) return false
      if (Array.isArray(data)) return true
      if (Array.isArray(data.memos)) return true
      if (data.data && Array.isArray(data.data.memos)) return true
      if (Array.isArray(data.list)) return true
      // Common JSON error shapes should not be treated as success.
      if (typeof data.error === 'string' || typeof data.message === 'string') return false
      return false
    }

    function isNotFoundLike(xhr) {
      const status = xhr && xhr.status
      return status === 404 || status === 405
    }

    // Modern-style filter probe.
    const modernQ =
      'api/v1/memos?pageSize=1&filter=' +
      encodeURIComponent('visibility in ["PUBLIC","PROTECTED"]')

    // v0.23-style filter probe.
    const v023Q =
      'api/v1/memos?pageSize=1&filter=' +
      encodeURIComponent('visibilities == ["PUBLIC","PROTECTED"]')

    // v0.20/v0.21 unified API v1 probe.
    const v1Q = 'api/v1/memo?limit=1&rowStatus=NORMAL'

    global.$
      .ajax({
        url: apiUrl + modernQ,
        method: 'GET',
        headers: headers,
        dataType: 'json'
      })
      .done(function (data) {
        if (looksLikeMemosListPayload(data)) {
          callback({ flavor: 'modern' })
          return
        }
        // Treat unexpected success payload as unknown and continue probing.
        global.$
          .ajax({
            url: apiUrl + v023Q,
            method: 'GET',
            headers: headers,
            dataType: 'json'
          })
          .done(function (data2) {
            if (looksLikeMemosListPayload(data2)) callback({ flavor: 'v023' })
            else callback({ flavor: 'unknown' })
          })
          .fail(function () {
            callback({ flavor: 'unknown' })
          })
      })
      .fail(function (xhr) {
        if (xhr && xhr.status === 400) {
          global.$
            .ajax({
              url: apiUrl + v023Q,
              method: 'GET',
              headers: headers,
              dataType: 'json'
            })
            .done(function (data2) {
              if (looksLikeMemosListPayload(data2)) callback({ flavor: 'v023' })
              else callback({ flavor: 'unknown' })
            })
            .fail(function () {
              callback({ flavor: 'unknown' })
            })
          return
        }

        // If /api/v1/memos is missing, check /api/v1/memo (v0.20/v0.21 unified).
        if (isNotFoundLike(xhr)) {
          global.$
            .ajax({
              url: apiUrl + v1Q,
              method: 'GET',
              headers: headers,
              dataType: 'json'
            })
            .done(function (data2) {
              if (looksLikeMemosListPayload(data2)) callback({ flavor: 'v1' })
              else callback({ flavor: 'unknown' })
            })
            .fail(function () {
              callback({ flavor: 'unknown' })
            })
          return
        }

        callback({ flavor: 'unknown' })
      })
  }

  global.MemosApiV023 = {
    buildFilter: buildFilter,
    listMemos: listMemos,
    extractTagsFromMemo: extractTagsFromMemo,
    probeApiFlavor: probeApiFlavor
  }
})(window)
