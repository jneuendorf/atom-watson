'use babel'

import path from 'path'
import {exec} from 'child_process'
import os from 'os'

import fs from 'fs-extra'


const getProjectName = () => {
    return (
        atom.project.getPaths()
        .map(projectPath => path.basename(projectPath))
        .join('__')
    )
}


export const getTimeracerConfig = async () => {
    const projectPaths = atom.project.getPaths()
    const results = await Promise.all(
        projectPaths
        .map(projectPath => {
            const configFile = path.join(projectPath, '.timetracer.config.js')
            return (
                fs.pathExists(configFile)
                .then(exists => [exists, configFile])
            )
        })
    )
    const positives = results.filter(([exists, _]) => exists)
    if (positives.length > 1) {
        throw new Error('Multiple config files found...')
    }

    const defaultConfig = {
        name: getProjectName(),
        tags: '',
    }
    if (positives.length === 0) {
        console.log('using NO config file...')
        return defaultConfig
    }

    let config
    try {
        const [_, configFile] = positives[0]
        console.log('using', configFile)
        config = {
            ...defaultConfig,
            ...require(configFile),
        }
    }
    catch (error) {
        console.log('using default config because of error')
        console.error(error.message)
        config = defaultConfig
    }
    return config
}

export const replacePlaceholders = (str, replacements) => {
    return str.replace(/((%project)|(%tags)|(%files)|(%branches)|(%path))/g, match => {
        return replacements[match]
    })
}

// TODO: Use https://atom.io/docs/api/v1.28.2/BufferedProcess ?
export const runCommand = command => {
    return new Promise((resolve, reject) => {
        console.log('running', command)
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error)
            }
            else {
                resolve({stdout, stderr})
            }
        })
    })
}

const WINDOW_ID_FILENAME = path.join(
    os.tmpdir(),
    'time-tracer',
    'focused_window_id.txt',
)
console.log('using', WINDOW_ID_FILENAME)
export const getWindowId = async () => {
    if (await fs.pathExists(WINDOW_ID_FILENAME)) {
        const content = await fs.readFile(WINDOW_ID_FILENAME, 'utf8')
        return parseInt(content.trim(), 10)
    }
    else {
        return null
    }
}

export const setWindowId = async id => {
    await fs.ensureDir(path.dirname(WINDOW_ID_FILENAME))
    await fs.writeFile(WINDOW_ID_FILENAME, `${id}`)
}

export const setMinus = (setA, setB) => {
    const diff = new Set(setA)
    for (const elem of setB) {
        diff.delete(elem)
    }
    return diff
}

// Returns a random integer between min (inclusive) and max (inclusive).
// https://stackoverflow.com/a/1527820/6928824
const randomInt = (max, min=0) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// https://stackoverflow.com/a/43235/6928824
const generateRandomColor = ([mixRed, mixGreen, mixBlue]) => {
    let red = randomInt(255)
    let green = randomInt(255)
    let blue = randomInt(255)
    // mix the color
    red = (red + mixRed) / 2
    green = (green + mixGreen) / 2
    blue = (blue + mixBlue) / 2
    return [red, green, blue].map(Math.floor)
}

let getTagColorCache = {}
export const getTagColor = tag => {
    if (!getTagColorCache[tag]) {
        getTagColorCache[tag] = generateRandomColor([178, 240, 129])
    }
    return `rgb(${getTagColorCache[tag].join(',')})`
}
