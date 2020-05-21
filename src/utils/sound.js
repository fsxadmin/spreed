const messageSoundPath = '/sounds/message.mp3'
const incomingCallPhase1SoundPath = '/sounds/incoming-call-pahes1.mp3'
const incomingCallPhase2SoundPath = '/sounds/incoming-call-pahes2.mp3'

const play = (soundPath, onComplete) => {
	const audio = new Audio(OC.appswebroots.spreed + soundPath)
	if (onComplete) {
		audio.addEventListener('ended', onComplete)
	}

	return audio.play()
}

const createMessageSoundListener = () => {
	return value => {
		if (value > 0) {
			play(messageSoundPath)
		}
	}
}

const startIncomingCallSound = () => {
	let complete = false
	let timerRef = null

	playIncomingCall(true, ref => { timerRef = ref }, () => complete)

	return {
		complete: () => {
			if (timerRef) {
				clearTimeout(timerRef)
			}

			complete = true
		},
	}
}

const playIncomingCall = (phase, timerHandleListener, completeChecker) => {
	play(
		phase ? incomingCallPhase1SoundPath : incomingCallPhase2SoundPath,
		() => {
			if (!completeChecker()) {
				const timerHandle = setTimeout(() => {
					playIncomingCall(!phase, timerHandleListener, completeChecker)
				}, phase ? 10 : 500)

				timerHandleListener(timerHandle)
			}
		})
}

export {
	createMessageSoundListener,
	startIncomingCallSound,
}
