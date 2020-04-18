/**
 * Checks if a file or directory exists
 *
 * @param {OC.Files.Client} client OC.Files client
 * @param {String} path file or directory path
 * @returns {Promise<boolean>}
 */
const exists = async function(client, path) {
	try {
		await client.getFileInfo(path)
		return true
	} catch (error) {
		if (error === 404) {
			return false
		}

		throw error
	}
}

/**
 * Creates directories if they do not exist
 *
 * @param {OC.Files.Client} client OC.Files client
 * @param {String[]} pathComponents an array of directory names
 * @returns {Promise<String>}
 */
const createDirectoryRecursive = async function(client, pathComponents) {
	const currentPath = []
	let path = ''
	for (let i = 0; i < pathComponents.length; i++) {
		currentPath.push(pathComponents[i])

		path = currentPath.join('/')
		if (!await exists(client, path)) {
			await client.createDirectory(path)
		}
	}

	return path
}

export {
	exists,
	createDirectoryRecursive,
}
