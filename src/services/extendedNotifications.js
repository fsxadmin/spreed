import { EventBus } from './EventBus'
import { createFaviconCounterListener } from '../utils/favicon'
import { createMessageSoundListener } from '../utils/sound'

const setupAdvancedWindowVisibilityListener = (listener) => {
	let currentVisibilityValue = true

	const updateVisibilityValue = (newValue) => {
		if (currentVisibilityValue !== newValue) {
			currentVisibilityValue = newValue
			listener(currentVisibilityValue)
			console.debug('switch visibility', newValue)
		}
	}

	const onVisibilityChange = () => {
		const isVisible = !document.hidden
		updateVisibilityValue(isVisible)
	}

	const onBlur = () => {
		updateVisibilityValue(false)
	}

	const onFocus = () => {
		updateVisibilityValue(true)
	}

	document.addEventListener('visibilitychange', onVisibilityChange)
	window.addEventListener('blur', onBlur)
	window.addEventListener('focus', onFocus)

	return {
		destroy() {
			document.removeEventListener('visibilitychange', onVisibilityChange)
			window.removeEventListener('blur', onBlur)
			window.removeEventListener('focus', onFocus)
		},
		isVisible() {
			return currentVisibilityValue
		},
	}
}

const extractStateFromMessage = (token, message, $store) => {
	if (message) {
		const currentActorIsAuthor = message.actorType === $store.getters.getActorType()
			&& message.actorId === $store.getters.getActorId()
		if (currentActorIsAuthor) {
			return { unreadMarker: -1 }
		} else {
			return {
				unreadMarker: Math.max(
					message && message.id ? message.id : 0,
					$store.getters.getLastKnownMessageId(token) ? $store.getters.getLastKnownMessageId(token) : 0,
				),
			}
		}
	}

	return { unreadMarker: 0 }
}
const initConversationsListening = ($store) => {
	console.debug('extended notification init')

	let actualState = null
	let lastStateCache = null
	let currentUnreadConversations = 0

	const notificationListeners = [
		createFaviconCounterListener(),
		createMessageSoundListener(),
	]

	const updateUnreadConversationsCount = (value) => {
		if (value === currentUnreadConversations) {
			return
		}

		notificationListeners.forEach(listener => {
			listener(value)
		})

		currentUnreadConversations = value
	}

	const getConversationsState = () => {
		const conversationList = $store.getters.conversationsList
		if (conversationList.length === 0) {
			return {}
		}

		// Copied from App.vue to avoid merging conflicts
		// FIXME Should be moved and shared
		return conversationList.reduce((result, conversation) => {
			result[conversation.token] = extractStateFromMessage(conversation.token, conversation.lastMessage, $store)
			return result
		}, {})
	}

	const refreshState = (windowIsVisible, newState) => {
		if (windowIsVisible) {
			actualState = newState
			console.debug('extended notification replace state', actualState, newState)

			updateUnreadConversationsCount(0)
		} else {
			// Copied from App.vue to avoid merging conflicts
			// FIXME Should be moved and shared
			const newUnreadConversations = Object.keys(newState).reduce((acc, token) => {
				const tokenActualState = actualState[token].unreadMarker
				const tokenNewState = newState[token].unreadMarker
				const tokenHasNewMessage = !tokenActualState // Conversation is new
					|| (tokenActualState !== tokenNewState // Last message changed
						&& tokenNewState !== -1) // But is not from the current user

				return acc + (tokenHasNewMessage ? 1 : 0)
			}, 0)

			console.debug('extended notification switch state', actualState, newState, newUnreadConversations)
			updateUnreadConversationsCount(newUnreadConversations)
		}
	}

	const visibilityListener = setupAdvancedWindowVisibilityListener((newValue) => {
		if (actualState === null) {
			// not initialized yet
			return
		}

		if (newValue) {
			refreshState(true, getConversationsState())
		}
	})

	const onConversationsReceived = () => {
		const newState = getConversationsState()

		if (actualState === null) {
			actualState = newState
		} else {
			const windowIsVisible = visibilityListener.isVisible()
			refreshState(windowIsVisible, newState)
		}

		lastStateCache = newState
	}

	const onMessageReceived = (message) => {
		if (actualState === null) {
			return
		}

		const windowIsVisible = visibilityListener.isVisible()
		const newState = { ...lastStateCache }

		newState[message.token] = extractStateFromMessage(message.token, message, $store)

		refreshState(windowIsVisible, newState)
		lastStateCache = newState
	}

	EventBus.$on('conversationsReceived', onConversationsReceived)
	EventBus.$on('messageReceived', onMessageReceived)

	return () => {
		console.debug('extended notification cleanup')

		EventBus.$off('conversationsReceived', onConversationsReceived)
		EventBus.$off('messageReceived', onMessageReceived)

		visibilityListener.destroy()
	}
}

export {
	initConversationsListening,
}
