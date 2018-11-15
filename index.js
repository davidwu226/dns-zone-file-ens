import namehash from 'eth-ens-namehash'
import jssha3 from 'js-sha3'
import fs from 'fs'
import readline from 'readline'
import moment from 'moment'
import 'moment-duration-format'

const sha3 = jssha3.keccak_256

function nameHash(name) {
  return namehash.hash(name)
}

function labelHash(name) {
  let label = namehash.normalize(name)
  if (label.endsWith('.eth')) {
    label = label.substring(0, label.length - 4)
  }
  return `0x${sha3(label)}`
}

const startTime = new Date()

const hashFile = fs.createWriteStream('hashes')
const failFile = fs.createWriteStream('fails')

const rd = readline.createInterface({
  input: fs.createReadStream('com.zone'),
  //output: process.stdout,
  console: false,
})

const status = {
  start: new Date(),
  lines: 0,
  previous: undefined,
  hashes: 0,
  dupes: 0,
  skipped: 0,
  failures: 0,
}

rd.on('line', (line) => {
  status.lines++
  const m = line.match(/(^[^$\s;@.][^\s.]*)\s+/)
  if (m) {
    const name = m[1]
    if (name !== status.previous) {
      try {
        const hash = nameHash(`${name}.eth`)
        status.hashes++
        hashFile.write(`${name} ${hash}\n`)
      } catch (err) {
        status.failures++
        failFile.write(`${name}\n`)
      }
    } else {
      status.dupes++
    }
    status.previous = name
  } else {
    status.skipped++
  }
})

rd.on('end', () => {
  hashFile.end()
  failFile.end()
  status.end = new Date()
  updateStatus()
  console.log(JSON.stringify(status, null, 2))
  })

function updateStatus() {
  status.duration = (new Date()).getTime() - status.start.getTime()
  status.elapsed = (moment.duration(status.duration, 'ms')).format("hh:mm:ss")
  status.rate = status.hashes / (status.duration / 1000)
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'c') {
    process.exit();
  } else {
    updateStatus()
    console.log(JSON.stringify(status, null, 2))
  }
});
