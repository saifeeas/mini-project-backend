import * as dotenv from 'dotenv'
dotenv.config()
import NodeVault from 'node-vault'
// const fs = require('fs')

// Options for connecting to Vault
const options = {
  apiVersion: 'v1', // default
  endpoint: process.env.VAULT_HOST, // Vault URL
  token: process.env.VAULT_TOKEN // client token
}

// Create a vault client with the options
const vault = NodeVault(options)

// App Role Login
// vault.approleLogin({ role_id: process.env.VAULT_ROLE_ID, secret_id: process.env.VAULT_SECRET_ID })
// .then(res => console.log('Vault Token:', res.auth.client_token)).catch(e => console.log(e))

// Key types that will be used for cryptographic operations
const keyTypes = {
  symmetric: 'aes256-gcm96',
  asymmetric: 'ecdsa-p521'
}

// Hashing Algorithm to use
const hash_algorithm = 'sha2-512'
const marshaling_algorithm = 'asn1'


// #--------------------------------------------------------# //
// #----------# MANAGE VAULT TRANSIT ENGINE KEYS #----------# //
// #--------------------------------------------------------# //

// Keys Creation
const createKeys = async(name = "") => {
  const options = {
    path: '',
    method: 'POST',
    json: {
      type: '',
      allow_plaintext_backup: true,
      exportable: true    
    }
  }

  for await (const key of Object.values(keyTypes)){
    options.path = `/transit/keys/${name}-${key}`
    options.json.type = key

    await vault.request(options).catch(e => {throw e})
    await vault.request({
      path: `${options.path}/config`,
      method: options.method,
      json: {deletion_allowed: true}
    }).catch(e => {throw e})
  }
}

// console.log(await createKeys('test')) // Undefined

const listKeys = async () => {
  return await vault.request({method: 'LIST', path: '/transit/keys'}).then(({data: {keys}}) => keys)
  .catch(e => {throw e})
}

// console.log(await listKeys())

// Keys Deletion
const deleteKeys = async (name = "") => {
  for await (const key of Object.values(keyTypes)){
    await vault.request({
      method: 'DELETE',
      path: `/transit/keys/${name}-${key}`
    }).catch(e => {throw e})
  }
}

// console.log(await deleteKeys('auth0-634533525615e6a1bdb52285')) // Undefined


// #-------------------------------------------------# //
// #----------# ENCRYPTION AND DECRYPTION #----------# //
// #-------------------------------------------------# //

// Encryption Function
const encrypt = async (key = "", batch_input = [{}]) => {
  // const base64_content = Buffer.from(content, 'binary').toString('base64')

  const keyName = key + '-' + keyTypes.symmetric

  return await vault.encryptData({
    name: keyName,
    batch_input
  }).then(({data: {batch_results}}) => batch_results)
  .catch(e => {throw e})
}

// const file = fs.readFileSync('./hello.txt', { encoding: 'binary' })
// const ciphertext = await encrypt('test', [ { plaintext: 'YnVmZmVyMQ==' }, { plaintext: 'YnVmZmVyMg==' } ])
// console.log(ciphertext)

/* Testing how file read and write works
const file = fs.readFileSync('./hello.txt', { encoding: 'binary' })
const buf = Buffer.from(file, 'binary').toString('base64')
const res = Buffer.from(buf, 'base64').toString('binary')
fs.writeFileSync('./test2.tgz', res, { encoding: 'binary' })
*/

// Decryption Function
const decrypt = async (key = "", ciphertext = "") => {
  const keyName = key + '-' + keyTypes.symmetric

  const base64_data = await vault.decryptData({
    name: keyName,
    ciphertext
  }).then(({data: {plaintext: data}}) => data)
  .catch(e => {throw e})

  return Buffer.from(base64_data, 'base64').toString('binary')
}

// const data = await decrypt('test', ciphertext)
// fs.writeFileSync('./hello2.txt', data, { encoding: 'binary' })


// #-----------------------------------------# //
// #----------# DIGITAL SIGNATURE #----------# //
// #-----------------------------------------# //


// Digital Signature Function
const sign = async (key = "", batch_input = [{}]) => {
  const keyName = key + '-' + keyTypes.asymmetric
  const options = {
    path: `/transit/sign/${keyName}/${hash_algorithm}`,
    method: 'POST',
    json: {
      batch_input,
      marshaling_algorithm
    }
  }

  return await vault.request(options).then(({data: {batch_results}}) => batch_results)
  .catch(e => {throw e})
}

// const signatures = await sign('test', [ { input: 'YnVmZmVyMQ==' }, { input: 'YnVmZmVyMg==' } ])
// console.log(signatures)

// Digital Signature Verification Funtion
const verify = async (key = "", content = "", signature = "") => {
  const keyName = key + '-' + keyTypes.asymmetric
  const options = {
    path: `/transit/verify/${keyName}/${hash_algorithm}`,
    method: 'POST',
    json: {
      input: Buffer.from(content, 'binary').toString('base64'),
      signature: signature,
      marshaling_algorithm: marshaling_algorithm
    }
  }

  return await vault.request(options).then(({data: {valid}}) => valid)
  .catch(e => {throw e})
}

// const valid = await verify('test', 'Hello World!', signature)
// console.log(valid)

const client = { createKeys, listKeys, deleteKeys, encrypt, decrypt, sign, verify }
export default client