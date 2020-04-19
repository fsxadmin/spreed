import { createDirectoryRecursive } from '../services/filesService'

const state = {
	rootCreated: false,
	directories: {
	},
}

const getters = {
	rootCreated: (state) => () => {
		return state.rootCreated
	},

	getDirectoryForToken: (state) => (token) => {
		return state.directories[token]
	},
}

const mutations = {
	setRootCreated(state) {
		state.rootCreated = true
	},

	setDirectoryForToken(state, { token, path }) {
		state.directories[token] = path
	},
}

const actions = {
	async ensureHasTokenDirectory({ commit, getters }, { client, token, baseDirectory }) {
		const currentPath = getters.getDirectoryForToken(token)
		if (currentPath) {
			return currentPath
		}

		const rootCreated = getters.rootCreated()
		const recursiveArg = rootCreated ? [baseDirectory + '/' + token] : [baseDirectory, token]
		const result = await createDirectoryRecursive(client, recursiveArg)

		if (!rootCreated) {
			commit('setRootCreated')
		}

		commit('setDirectoryForToken', { token, path: result })

		return result
	},
}

export default { state, mutations, getters, actions }
