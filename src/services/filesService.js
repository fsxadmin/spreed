/**
 * Checks if a file or directory exists
 *
 * @param {OC.Files.Client} client OC.Files client
 * @param {String} path file or directory path
 * @returns {Promise<boolean>}
 */
import { addFileNameSuffix, getFileInfo } from '../utils/path'

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

/**
 * Puts the file content making sure the name is unique. If the file
 * with the same name already exists, the suffix will be added to the
 * file name until it's unique.
 *
 * @param {OC.Files.Client} client OC.Files client
 * @param {String} base base directory to put the file
 * @param {String} fileName file name
 * @param {ArrayBuffer|String} fileContent file content
 * @returns {Promise<String>}
 */
const putUniqueFileContents = async function(client, base, fileName, fileContent) {
	const fileInfo = getFileInfo(fileName)

	let randomizationSalt = ''
	let index = 0

	while (true) {
		const fullPath = base + '/' + addFileNameSuffix(fileInfo, randomizationSalt)

		if (!await exists(client, fullPath)) {
			await client.putFileContents(fullPath, fileContent, { overwrite: false })
			return fullPath
		}

		index++
		randomizationSalt = '_' + index.toString()
	}
}

export {
	exists,
	createDirectoryRecursive,
	putUniqueFileContents
}
