import * as dotenv from 'dotenv'
dotenv.config()
import { create } from 'ipfs-http-client'
// import { create, globSource } from 'ipfs-http-client'

const ipfs = create(process.env.IPFS_HOST) // the default API address http://localhost:5001

// Print Client Config used to connect to IPFS API
// const clientConfig = ipfs.getEndpointConfig()
// console.log(clientConfig)

// Print details about the MFS Path
const stat = async (path = '/') => {
  return await ipfs.files.stat(path)
}
// console.log(await stat())

const write = async (path = "", content) => {
  const options = {
    create: true,
    parents: true,
    rawLeaves: true,
    cidVersion: 1
    // Below options not available in Kubo
    // mode: glob.mode,
    // mtime: glob.mtime
  }
  return await ipfs.files.write(path, content, options).catch(e => e)
}
// const glob = await globSource('./package.json', '**', { preserveMode: true, preserveMtime: true
//  }).next()
// console.log(await write('/test/package.json', glob.value.content))

const ls = async (path) => {
  const files = []
  for await (const file of ipfs.files.ls(path)) {
    file.cid = file.cid.toString()
    files.push(file)
  }
  return files

  // OR simple method
  // npm i it-all
  // import { all } from 'it-all'
  // const result = await all(ipfs.files.ls('/'))
}
// console.log(await ls('/test'))

const mkdir = async (path = "") => {
  const options = {
    parents: true,
    cidVersion: 1
  }
  return await ipfs.files.mkdir(path, options).catch(e => {return e})
}
// console.log(await mkdir('/test'))

const mv = async (src = "", dst = "") => {
  return await ipfs.files.mv(src, dst).catch(e => {return e})
}
// console.log(await mv('/kubo/test', '/kubo/test2/test2'))

const cp = async (src = "", dst = "") => {
  const options = {
    parents: true,
    cidVersion: 1
  }
  return await ipfs.files.cp(src, dst, options)
}
// console.log(await cp('/kubo/test3', '/kubo/test2/test3'))

const read = async (path = "") => {
  let chunks = ""
  for await (const chunk of ipfs.files.read(path)) {
    chunks += Buffer.from(chunk, 'binary').toString()
  }
  return chunks
}
// console.log(await read('/kubo/package.json'))

const rm = async (path = "") => {
  const options = {
    recursive: true
  }
  return await ipfs.files.rm(path, options).catch(e => e)
}
// console.log(await rm('/kubo/test'))

const client = {stat, write, ls, mkdir, mv, cp, read, rm}
export default client