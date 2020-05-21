<template>
	<div id="incoming-call" v-if="token">
		<section class="incoming-call__main">
			<header>
				<ConversationIcon
					class="incoming-call__conversation-icon"
					:item="conversation"
					:hide-favorite="false"
					:hide-call="true" />
				<div class="conversation-display-name">{{ conversation.displayName }}</div>
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
				<span style="flex: 0 0 10px"></span>
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
			callSound: null
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
			this.incomingCallTokens = conversationList
				.filter(x => x.hasCall && !isGhostCall(x))
				.map(x => x.token)
		}

		const onJoinCall = (tokens) => {
			const token = tokens[0]

			console.debug('joining to ' + token + ' detected')

			this.addTokenToSkipped(token)
		}

		EventBus.$on('conversationsReceived', onConversationsReceived)
		EventBus.$on('Signaling::joinCall', onJoinCall)
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
		background: rgba(0, 0, 0, 0.5);
		z-index: 999999;
		display: flex;
		align-items: center;
		justify-content: center;

		.incoming-call__main {
			background: rgba(0, 0, 0, 0.9);
			width: 300px;

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
