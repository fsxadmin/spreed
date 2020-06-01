<template>
	<transition name="incoming-call-transition">
		<div v-if="token" id="incoming-call">
			<div class="incoming-call__overlay" />
			<section class="incoming-call__main">
				<header>
					<ConversationIcon
						class="incoming-call__conversation-icon"
						:item="conversation"
						:hide-favorite="false"
						:hide-call="true" />
					<div class="conversation-display-name">
						{{ conversation.displayName }}
					</div>
				</header>
				<div class="incoming-call__buttons">
					<button :disabled="loading"
						class="top-bar__button primary"
						@click="joinCall">
						<span
							class="icon"
							:class="startCallIcon" />
						{{ startCallLabel }}
					</button>
					<span style="flex: 0 0 10px" />
					<button :disabled="loading"
						class="top-bar__button error"
						@click="rejectCall">
						<span
							class="icon icon-leave-call" />
						{{ rejectCallLabel }}
					</button>
				</div>
			</section>
		</div>
	</transition>
</template>

<script>
import { PARTICIPANT } from '../constants'
import { EventBus } from '../services/EventBus'
import ConversationIcon from './ConversationIcon'
import { startIncomingCallSound } from '../utils/sound'

export default {
	name: 'IncomingCall',
	components: { ConversationIcon },

	data() {
		return {
			loading: false,
			incomingCallTokens: [],
			skipCallTokens: [],
			callSound: null,
		}
	},

	computed: {
		token() {
			if (this.incomingCallTokens.length === 0) {
				return null
			}

			const filtered = this.incomingCallTokens.filter(t => this.skipCallTokens.indexOf(t) < 0)

			return filtered.length > 0 ? filtered[0] : null
		},

		conversation() {
			if (!this.token) {
				return null
			}

			return this.$store.getters.conversation(this.token)
		},

		startCallIcon() {
			if (this.loading) {
				return 'icon-loading-small'
			}

			return 'icon-start-call'
		},

		startCallLabel() {
			return t('spreed', 'Join call')
		},

		rejectCallLabel() {
			return t('spreed', 'Reject call')
		},
	},

	watch: {
		token(value) {
			console.debug('token change detected', value)

			const callSound = this.callSound
			const needToStopSound = callSound && value === null
			const needToStartSound = callSound === null && value

			if (needToStopSound) {
				callSound.complete()
				this.callSound = null

				console.debug('complete playing incoming call sound')
			}

			if (needToStartSound) {
				console.debug('start playing incoming call sound')
				this.callSound = startIncomingCallSound()
			}
		},
	},

	beforeMount() {
		const lastActivityDiffThreshold = 1000 * 60 * 60 * 24 // one day

		const isGhostCall = (conversation) => {
			/* Trying to detect ghost calls caused by not closed obsolete sessions
			 * For now just check for last activity date -- for fresh calls it should be
			 * close enough to the current time.
			 * This approach still can produce false-negative results as a conversation with
			 * obsolete call can have new messages so need to find a better way.
			 */
			const lastActivity = conversation.lastActivity
			if (!lastActivity) {
				return true
			}

			return new Date().getTime() - lastActivity * 1000 > lastActivityDiffThreshold
		}

		const onConversationsReceived = () => {
			const conversationList = this.$store.getters.conversationsList
			const newIncomingCallTokens = []
			const skipTokensToRemove = []

			conversationList.forEach(conversation => {
				const conversationToken = conversation.token
				if (conversation.hasCall) {
					if (!isGhostCall(conversation)) {
						newIncomingCallTokens.push(conversationToken)
					}
				} else {
					if (this.skipCallTokens.indexOf(conversationToken) >= 0) {
						skipTokensToRemove.push(conversationToken)
					}
				}
			})

			this.incomingCallTokens = newIncomingCallTokens

			if (skipTokensToRemove.length > 0) {
				console.debug('cleanup skip tokens', this.skipCallTokens, skipTokensToRemove)
				this.skipCallTokens = this.skipCallTokens.filter(t => skipTokensToRemove.indexOf(t) < 0)
				console.debug('after cleanup skip tokens', this.skipCallTokens)
			}
		}

		const onJoinCall = (tokens) => {
			const token = tokens[0]

			console.debug('joining to ' + token + ' detected')

			this.addTokenToSkipped(token)
		}

		const onMessageReceived = (message) => {
			console.debug('incoming call::message received', message)
			if (message.messageType === 'system' && message.systemMessage === 'call_started') {
				if (this.incomingCallTokens.length === 0 || this.incomingCallTokens.indexOf(message.token) < 0) {
					this.incomingCallTokens.push(message.token)
					console.debug('force call by incoming message')
				}
			}
		}

		EventBus.$on('conversationsReceived', onConversationsReceived)
		EventBus.$on('Signaling::joinCall', onJoinCall)
		EventBus.$on('messageReceived', onMessageReceived)
	},

	methods: {
		async doJoinCall(token) {
			await this.$store.dispatch('joinCall', {
				token: token,
				participantIdentifier: this.$store.getters.getParticipantIdentifier(),
				flags: PARTICIPANT.CALL_FLAG.IN_CALL, // FIXME add audio+video as per setting
			})
		},

		async joinCall() {
			const token = this.token

			console.info('Joining call', token)
			this.loading = true

			if (token === this.$store.getters.getToken()) {
				await this.doJoinCall(token)
				this.loading = false
			} else {
				this.$router.push({ name: 'conversation', params: { token: token } }, async() => {
					await this.doJoinCall(token)
					this.loading = false
				})
			}
		},

		rejectCall() {
			const token = this.token

			console.debug('rejecting ' + token + ' detected')

			this.addTokenToSkipped(token)
		},

		addTokenToSkipped(token) {
			const index = this.skipCallTokens.indexOf(token)
			if (index < 0) {
				this.skipCallTokens = [...this.skipCallTokens, token]
			}
		},
	},
}
</script>

<style lang="scss" scoped>
	#incoming-call {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		top: 0;

		z-index: 999999;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 1;

		.incoming-call__overlay {
			position: absolute;
			left: 0;
			right: 0;
			bottom: 0;
			top: 0;
			background: #000000;
			opacity: 0.5;
			z-index: 10;
			transition: opacity 0.5s;
		}

		.incoming-call__main {
			background: rgba(0, 0, 0, 0.9);
			width: 300px;
			opacity: 1;
			z-index: 100;
			transition: transform 0.5s, opacity 0.5s;

			header {
				display: flex;
				align-items: center;
				justify-content: center;
				flex-direction: row;
				padding: 20px;
				color: #FFFFFF;
				animation: pulse 2s infinite;

				.conversation-display-name {
					margin-left: 10px;
					font-weight: bold;
				}

				.incoming-call__conversation-icon {

				}
			}
		}

		.incoming-call__buttons {
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 0 20px 20px 20px;
		}
	}

	.incoming-call-transition-enter-active, .incoming-call-transition-leave-active {
		.incoming-call__overlay {
			transition: opacity 0.5s;
		}

		.incoming-call__main {
			transition: transform 0.5s, opacity 0.5s;
		}
	}

	.incoming-call-transition-enter, .incoming-call-transition-leave-to, .incoming-call-transition-leave {
		.incoming-call__overlay {
			opacity: 0 !important;
		}

		.incoming-call__main {
			opacity: 0 !important;
			transform: translateY(-30px);
		}
	}

	@keyframes pulse {
		0% {
			opacity: .5;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: .5;
		}
	}
</style>
