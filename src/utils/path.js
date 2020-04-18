/**
 * @typedef {Object} FileInfo
 * @property {String | null} extension file extension including dot
 * @property {String} nameWithoutExtension file name without extension
 */

/**
 * Gets file info for a path.
 *
 * @param {String} path file path
 * @returns {FileInfo}
 */
const getFileInfo = function(path) {
	const lastDotFileNameIndex = path.lastIndexOf('.')
	if (lastDotFileNameIndex < 0) {
		return { extension: null, nameWithoutExtension: path }
	}

	const fileNameWithoutExtension = path.substring(0, lastDotFileNameIndex)
	const extension = path.substring(lastDotFileNameIndex, path.length)

	return { extension: extension, nameWithoutExtension: fileNameWithoutExtension }
}

/**
 * Adds a suffix to the file name.
 *
 * @param {FileInfo} fileInfo file info object
 * @param {String} suffix suffix to add
 * @returns {String}
 */
const addFileNameSuffix = function(fileInfo, suffix) {
	return fileInfo.nameWithoutExtension + suffix + fileInfo.extension
}

/**
 * Inserts random salt to the file name.
 *
 * @param {String} path file path
 * @param {number} saltLength the amount of random characters to add
 * @returns {String}
 */
const randomizeFileName = function(path, saltLength) {
	const fileInfo = getFileInfo(path)
	const salt = generateRandomString(saltLength)

	return addFileNameSuffix(fileInfo, '-' + salt)
}
/**
 * Generate random string.
 *
 * @param {number} length the size of string to generate
 * @returns {string}
 */
const generateRandomString = function(length) {
	let result = ''
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	const charactersLength = characters.length

	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength))
	}

	return result
}

export {
	getFileInfo,
	generateRandomString,
	addFileNameSuffix,
	randomizeFileName,
}
