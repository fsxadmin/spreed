const createFaviconCounterListener = () => {
	let favicon = null
	let faviconUpdateHandle = null

	const resetTimer = () => {
		if (faviconUpdateHandle) {
			clearInterval(faviconUpdateHandle)
		}

		faviconUpdateHandle = null
	}

	const drawFavicon = (text, iterationActive) => {
		if (iterationActive) {
			const faviconSize = 16
			const fontSize = text.length === 1 ? 12 : 10

			const canvas = document.createElement('canvas')
			canvas.width = faviconSize
			canvas.height = faviconSize

			const context = canvas.getContext('2d')

			const img = document.createElement('img')
			img.src = originalHref

			img.onload = () => {
				const textSize = context.measureText(text)
				const font = context.font
				const fontArgs = font.split(' ')

				context.font = fontSize + 'px ' + fontArgs[fontArgs.length - 1]

				// Draw Original Favicon as Background
				// context.drawImage(img, 0, 0, faviconSize, faviconSize)

				// Draw Notification Circle
				context.beginPath()
				context.rect(0, 0, faviconSize, faviconSize)
				context.fillStyle = OC.getCapabilities().theming.color || '#FF0000'
				context.fill()

				context.beginPath()
				context.stroke()
				context.fillStyle = '#FFFFFF'

				context.fillText(
					text,
					(faviconSize - textSize.width) / 2, (faviconSize - fontSize) / 2 + fontSize - 1)

				context.closePath()

				// Replace favicon
				favicon.href = canvas.toDataURL('image/png')
			}
		} else {
			favicon.href = originalHref
		}

		faviconUpdateHandle = setTimeout(() => drawFavicon(text, !iterationActive), 1000)
	}

	document.getElementsByTagName('link').forEach(el => {
		if (el.getAttribute('rel') === 'icon') {
			favicon = el
		}
	})

	if (favicon === null) {
		// favicon element is not available for whatever reason
		return () => {}
	}

	const originalHref = favicon.href

	return value => {
		resetTimer()

		if (value === 0) {
			favicon.href = originalHref
		} else {
			drawFavicon(value > 9 ? '9+' : value.toString(), true)
		}
	}
}

export {
	createFaviconCounterListener,
}
