<!--
  - @copyright Copyright (c) 2019, Daniel Calviño Sánchez (danxuliu@gmail.com)
  -
  - @license GNU AGPL version 3 or any later version
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as
  - published by the Free Software Foundation, either version 3 of the
  - License, or (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program. If not, see <http://www.gnu.org/licenses/>.
  -
  -->

<template>
	<div class="chatView"
		:class='{ "filesDragging": filesDragging }'
		@drag.prevent
		@dragstart.prevent
		@dragover.prevent="handleDragIn()"
		@dragenter.prevent.self="handleDragIn()"
		@dragleave.prevent.self="handleDragOut()"
		@dragend.prevent="handleDragOut()"
		@drop.prevent="handleDrop">
		<transition name="fade" mode="in-out">
			<div v-if="filesDragging" class="drag-indicator"></div>
		</transition>
		<MessagesList :token="token" />
		<NewMessageForm
			:blockMessage="formBlockMessage"
			@files-pasted="handleFilesPasting" />
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'
import MessagesList from './MessagesList/MessagesList'
import NewMessageForm from './NewMessageForm/NewMessageForm'
import { putUniqueFileContents } from '../services/filesService'
import { randomizeFileName } from '../utils/path'

const DEFAULT_TALK_FILES_DIRECTORY = '/Talk files'
const RANDOMIZE_CLIPBOARD_FILENAMES = true

export default {

	name: 'ChatView',

	components: {
		MessagesList,
		NewMessageForm,
	},

	props: {
		token: {
			type: String,
			required: true,
		},
	},

	data: function() {
		return {
			filesDragging: false,
			formBlockMessage: null
		}
	},

	methods: {
		/**
		 * Reacts to start dragging files over the chat area.
		 */
		handleDragIn() {
			this.filesDragging = true
		},

		/**
		 * Reacts to end dragging files over the chat area.
		 */
		handleDragOut() {
			this.filesDragging = false
		},

		/**
		 * Reacts to dropping the files into the chat area.
		 *
		 * @param {DragEvent} event native drag even
		 */
		handleDrop(event) {
			this.handleDragOut()

			const files = event.dataTransfer.files

			// Fix token here to make sure it does not
			// change during async operations.
			const token = this.token

			this.sendFiles(files, token, false)
		},

		/**
		 * Sends an array of files to the chat room.
		 *
		 * @param {File[]} files an array of files to send
		 * @param {String} token current room token
		 * @param {boolean} randomizeNames the flag indicating whether the names should be randomized
		 */
		async sendFiles(files, token, randomizeNames) {
			this.formBlockMessage = '...'

			const client = OC.Files.getClient()
			const basePath = await this.$store.dispatch(
				'ensureHasTokenDirectory',
				{ client, token, baseDirectory: DEFAULT_TALK_FILES_DIRECTORY })

			for (let i = 0; i < files.length; i++) {
				try {
					const originalName = files[i].name
					const fileName = randomizeNames ? randomizeFileName(originalName, 5) : originalName

					this.formBlockMessage = t('spreed', 'Uploading file') + ' ' + fileName + '...'

					await this.sendSingleFile(basePath, files[i], fileName, token)
				} catch (error) {
					if (error.response
							&& error.response.data
							&& error.response.data.ocs
							&& error.response.data.ocs.meta
							&& error.response.data.ocs.meta.message) {
						console.error(`Error while sharing file: ${error.response.data.ocs.meta.message || 'Unknown error'}`)
						OCP.Toast.error(error.response.data.ocs.meta.message)
					} else {
						console.error(`Error while sharing file: Unknown error`)
						OCP.Toast.error(t('files', 'Error while sharing file'))
					}
				}
			}

			this.formBlockMessage = null
		},

		/**
		 * Sends a file to the chat room.
		 *
		 * @param {String} base base directory path
		 * @param {File} file the file object
		 * @param {String} fileName the name of the file
		 * @param {String} token current room token
		 */
		async sendSingleFile(base, file, fileName, token) {
			// Step 1 - Upload the file to a shared directory.
			const fullPath = await putUniqueFileContents(OC.Files.getClient(), base, fileName, file)

			try {
				// Step 2 - share uploaded file with the chat room.
				// FIXME move to service
				await axios.post(
					generateOcsUrl('apps/files_sharing/api/v1', 2) + 'shares',
					{
						shareType: 10, // OC.Share.SHARE_TYPE_ROOM,
						path: fullPath,
						shareWith: token,
					}
				)
			} catch (error) {
				const isShareDuplicatedError = error
						&& error.response
						&& error.response.data
						&& error.response.data.ocs
						&& error.response.data.ocs.meta
						&& error.response.data.ocs.meta.statuscode === 403

				if (!isShareDuplicatedError) {
					throw error
				}
			}
		},

		async handleFilesPasting(files) {
			this.sendFiles(files, this.token, RANDOMIZE_CLIPBOARD_FILENAMES)
		},
	},
}
</script>

<style lang="scss">
.chatView.filesDragging * {
	pointer-events: none;
}
</style>

<style lang="scss" scoped>
.chatView {
	height: 100%;

	display: flex;
	flex-direction: column;
	flex-grow: 1;

	.drag-indicator {
		background: var(--color-primary-light);
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 20;
		opacity: 0.8;
		pointer-events: none;

		&::after {
			content: '';
			position: absolute;
			top: 20px;
			bottom: 20px;
			left: 20px;
			right: 20px;
			pointer-events: none;
			border: 2px dashed var(--color-border-dark);
		}
	}
}

.fade-enter-active, .fade-leave-active {
	transition: opacity .2s;
}

.fade-enter, .fade-leave-to {
	opacity: 0 !important;
}
</style>
