;(function () {
	const STYLE_ID = 'view-image-style'
	const STYLE_TEXT = `
		.view-image{position:fixed;inset:0;z-index:500;padding:1rem;display:flex;flex-direction:column;animation:view-image-in 300ms;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
		.view-image__out{animation:view-image-out 300ms}
		@keyframes view-image-in{0%{opacity:0}}
		@keyframes view-image-out{100%{opacity:0}}
		.view-image-btn{width:32px;height:32px;display:flex;justify-content:center;align-items:center;cursor:pointer;border-radius:3px;background-color:rgba(255,255,255,0.2);color:#fff;font-size:20px;line-height:1}
		.view-image-btn:hover{background-color:rgba(255,255,255,0.5)}
		.view-image-close__full{position:absolute;inset:0;background-color:rgba(48,55,66,0.3);cursor:zoom-out;margin:0}
		.view-image-container{height:0;flex:1;display:flex;align-items:center;justify-content:center}
		.view-image-lead{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;max-width:100%;max-height:100%}
		.view-image-lead img{max-width:100%;max-height:100%;object-fit:contain;border-radius:3px}
		.view-image-lead__in img{animation:view-image-lead-in 300ms}
		.view-image-lead__out img{animation:view-image-lead-out 300ms forwards}
		@keyframes view-image-lead-in{0%{opacity:0;transform:translateY(-20px)}}
		@keyframes view-image-lead-out{100%{opacity:0;transform:translateY(20px)}}
		[class*=__out] ~ .view-image-loading{display:block}
		.view-image-loading{position:absolute;inset:50%;width:8rem;height:2rem;color:#aab2bd;overflow:hidden;text-align:center;margin:-1rem -4rem;z-index:1;display:none}
		.view-image-loading::after{content:"";position:absolute;inset:50% 0;width:100%;height:3px;background:rgba(255,255,255,0.5);transform:translateX(-100%) translateY(-50%);animation:view-image-loading 800ms -100ms ease-in-out infinite}
		@keyframes view-image-loading{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
		.view-image-tools{position:absolute;bottom:5%;left:1rem;right:1rem;display:flex;justify-content:space-between;align-content:center;color:#fff;max-width:600px;backdrop-filter:blur(10px);margin:0 auto;padding:10px;border-radius:5px;background:rgba(0,0,0,0.1);margin-bottom:constant(safe-area-inset-bottom);margin-bottom:env(safe-area-inset-bottom);z-index:1}
		.view-image-tools__count{width:60px;display:flex;align-items:center;justify-content:center}
		.view-image-tools__flip{display:flex;gap:10px}
		.view-image-tools [class*=-close]{margin:0 10px}
	`

	function ensureStyle() {
		if (document.getElementById(STYLE_ID)) return
		const style = document.createElement('style')
		style.id = STYLE_ID
		style.textContent = STYLE_TEXT
		document.head.appendChild(style)
	}

	function createButton(className, label, ariaLabel) {
		const button = document.createElement('button')
		button.type = 'button'
		button.className = className
		button.setAttribute('aria-label', ariaLabel)
		button.textContent = label
		return button
	}

	window.ViewImage = new (function () {
		const api = this
		api.target = '[view-image] img'
		api.listener = function (event) {
			if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
			const selector = String(
				api.target
					.split(',')
					.map(function (item) {
						return item.trim() + ':not([no-view])'
					})
					.join(',')
			)
			const current = event.target.closest(selector)
			if (!current) return
			const root = current.closest('[view-image]') || document.body
			const sources = Array.from(root.querySelectorAll(selector)).map(function (item) {
				return item.href || item.src
			})
			api.display(sources, current.href || current.src)
			event.stopPropagation()
			event.preventDefault()
		}

		api.init = function (target) {
			if (target) api.target = target
			document.removeEventListener('click', api.listener, false)
			document.addEventListener('click', api.listener, false)
		}

		api.display = function (sources, currentSrc) {
			ensureStyle()

			let currentIndex = Math.max(0, sources.indexOf(currentSrc))
			const overlay = document.createElement('div')
			overlay.className = 'view-image'

			const container = document.createElement('div')
			container.className = 'view-image-container'

			const lead = document.createElement('div')
			lead.className = 'view-image-lead'

			const loading = document.createElement('div')
			loading.className = 'view-image-loading'

			const backdrop = document.createElement('div')
			backdrop.className = 'view-image-close view-image-close__full'

			container.appendChild(lead)
			container.appendChild(loading)
			container.appendChild(backdrop)

			const tools = document.createElement('div')
			tools.className = 'view-image-tools'

			const count = document.createElement('div')
			count.className = 'view-image-tools__count'
			const countText = document.createElement('span')
			count.appendChild(countText)

			const flips = document.createElement('div')
			flips.className = 'view-image-tools__flip'
			const prev = createButton('view-image-btn view-image-tools__flip-prev', '‹', 'Previous image')
			const next = createButton('view-image-btn view-image-tools__flip-next', '›', 'Next image')
			flips.appendChild(prev)
			flips.appendChild(next)

			const close = createButton('view-image-btn view-image-close', '×', 'Close image viewer')

			tools.appendChild(count)
			tools.appendChild(flips)
			tools.appendChild(close)

			overlay.appendChild(container)
			overlay.appendChild(tools)

			function render() {
				countText.textContent = `${currentIndex + 1}/${sources.length}`
				lead.className = 'view-image-lead view-image-lead__out'

				window.setTimeout(function () {
					const image = document.createElement('img')
					image.alt = 'ViewImage'
					image.setAttribute('no-view', '')
					image.addEventListener('load', function () {
						window.setTimeout(function () {
							lead.replaceChildren(image)
							lead.className = 'view-image-lead view-image-lead__in'
						}, 100)
					})
					image.src = sources[currentIndex]
				}, 300)
			}

			function closeViewer() {
				window.removeEventListener('keydown', onKeyDown)
				overlay.classList.add('view-image__out')
				window.setTimeout(function () {
					overlay.remove()
				}, 290)
			}

			function onKeyDown(event) {
				if (event.key === 'Escape') closeViewer()
				if (event.key === 'ArrowLeft') prev.click()
				if (event.key === 'ArrowRight') next.click()
			}

			prev.addEventListener('click', function () {
				currentIndex = currentIndex === 0 ? sources.length - 1 : currentIndex - 1
				render()
			})

			next.addEventListener('click', function () {
				currentIndex = currentIndex === sources.length - 1 ? 0 : currentIndex + 1
				render()
			})

			backdrop.addEventListener('click', closeViewer)
			close.addEventListener('click', closeViewer)

			document.body.appendChild(overlay)
			window.addEventListener('keydown', onKeyDown)
			render()
		}
	})()
})()
