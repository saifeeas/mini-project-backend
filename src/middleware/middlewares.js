import * as dotenv from 'dotenv'
dotenv.config()

import fetch from 'node-fetch'
import vault from '../utils/vault.js'
import ipfs from '../utils/ipfs.js'
import createError from 'http-errors'
// import fs from 'fs'

// Get Access Token from Auth0
const getToken = async () => {
  const options = {
    method: 'POST',
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      audience: process.env.ISSUER_BASE_URL + "/api/v2/",
      grant_type: "client_credentials"
    })
  }

  return await fetch('https://asaifee02.us.auth0.com/oauth/token', options)
    .then((res) => res.json())
    .then((json) => json.token_type + " " + json.access_token)
}

const getAppMetadata = async (token = "", user_id = "") => {
  const options = {
    method: 'GET',
    headers: {
      "Authorization": token
    }
  }
  
  return await fetch(`${process.env.ISSUER_BASE_URL}/api/v2/users/${user_id}?fields=app_metadata&include_fields=true`, options)
  .then(res => res.json())
  .then(json => Object.keys(json).length > 0 ? json.app_metadata.keysCreated === true ? true : false : false )
}

const updateAppMetadata = async (token = "", user_id = "") => {
  const options = {
    method: 'PATCH',
    headers: {
      "content-type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      app_metadata: { keysCreated: true }
    })
  }

  return await fetch(`${process.env.ISSUER_BASE_URL}/api/v2/users/${user_id}`, options)
    .then(res => res.json())
    .then(json => json.app_metadata.keysCreated)
}

// const token = await getToken()
// const hasKey = await getAppMetadata(token, 'auth0|634533525615e6a1bdb52285')
// if(!hasKey) {
//   const result = await updateAppMetadata(token, 'auth0|634533525615e6a1bdb52285')
//   console.log(result)
// }

export const checkOrCreateKeys = async (user_id) => {
  console.log('👉 checkOrCreateKeys called ...')
  const user = user_id.replace(/.*\|/,'')
  const token = await getToken()
  const hasKey = await getAppMetadata(token, user_id)

  if(!hasKey) {
    console.log('👉 Creating keys ...')
    await vault.createKeys(user).catch(e => {throw e})
    const result = await vault.listKeys().then(keys => {
      return keys.find(value => value.includes(user))
    })

    if(!result) throw new Error('Failed to create cryptographic keys for the user.')
    
    const updated = await updateAppMetadata(token, user_id)
    if(!updated) throw new Error('Failed to create keys for the user.')
    console.log('👉 Updated user\'s app metadata ...')
  }

  return true
}

export const signEncryptStore = async (req, res, next) => {
  const key = req.auth.payload.sub.replace('/.*\|/','')
  
  const sign_input = req.files.map(file => {
    return {
      input: Buffer.from(file.buffer, 'binary').toString('base64')
    }
  })
  const encrypt_input = req.files.map(file => {
    return {
      plaintext: Buffer.from(file.buffer, 'binary').toString('base64')
    }
  })

  const signs = await vault.sign(key, sign_input)
  const encrypts = await vault.encrypt(key, encrypt_input)

  for await (const file of req.files) {
    const index = req.files.indexOf(file)
    await ipfs.write(`/data/${key}/data/${file.originalname}`, encrypts[index].ciphertext)
    await ipfs.write(`/data/${key}/sign/${file.originalname}.sha`, signs[index].signature)
  }

  next()
}

export const listUserFiles = async (req, res, next) => {
  const key = req.auth.payload.sub.replace('/.*\|/','')
  const allFiles = []

  const listFiles = async (path = '') => {
    const files = await ipfs.ls(path).catch(e => {
      console.log(e.message)
      return []
    })

    for await (const file of files) {
      if (file.type === 'directory') await listFiles(path + '/' + file.name)
      else {
        file.name = path + '/' + file.name
        allFiles.push(file)
      }
    }
  }
  
  await listFiles(`/data/${key}/data`)
  req.ipfs = {files: allFiles}
  next()
}

export const readDecryptVerify = async (req, res, next) => {
  const uid = req.params.userID
  if ('auth0|' + uid !== req.auth.payload.sub) next(createError(401))

  const filePath = '/data/' + uid + '/data/' + req.params.filePath
  const signPath = '/data/' + uid + '/sign/' + req.params.filePath + '.sha'

  const fileFromIPFS = await ipfs.read(filePath).catch(e => next(e))
  const signFromIPFS = await ipfs.read(signPath).catch(e => next(e))

  const file = await vault.decrypt(uid, fileFromIPFS).catch(e => next(e))
  const valid = await vault.verify(uid, file, signFromIPFS).catch(e => next(e))

  if (!valid) {
    const e = new Error('Digital Signature for the file ' + req.params.filePath + ' could not be verified.')
    e.status = 500
    next(e)
  }

  req.ipfs = {file: Buffer.from(file, 'binary')}
  next()
}

export const deleteFile = async (req, res, next) => {
  const uid = req.params.userID
  if ('auth0|' + uid !== req.auth.payload.sub) next(createError(401))

  const filePath = '/data/' + uid + '/data/' + req.params.filePath
  const signPath = '/data/' + uid + '/sign/' + req.params.filePath + '.sha'

  await ipfs.rm(filePath).catch(e => next(e))
  await ipfs.rm(signPath).catch(e => next(e))

  next()
}

export const shareFile = async (req, res, next) => {
  const uid = req.params.userID
  if ('auth0|' + uid !== req.auth.payload.sub) next(createError(401))
  const ruid = req.body.recipient

  // Get the file
  const filePath = '/data/' + uid + '/data/' + req.params.filePath
  const signPath = '/data/' + uid + '/sign/' + req.params.filePath + '.sha'

  const fileFromIPFS = await ipfs.read(filePath).catch(e => next(e))
  const signFromIPFS = await ipfs.read(signPath).catch(e => next(e))

  const file = await vault.decrypt(uid, fileFromIPFS).catch(e => next(e))
  const valid = await vault.verify(uid, file, signFromIPFS).catch(e => next(e))

  if (!valid) {
    const e = new Error('Digital Signature for the file ' + req.params.filePath + ' could not be verified.')
    e.status = 500
    next(e)
  }

  const data = Buffer.from(file, 'binary')

  // Share file
  const sign_input = [{
      input: data.toString('base64')
    }]

  const encrypt_input = [{
      plaintext: data.toString('base64')
    }]

  const signs = await vault.sign(ruid, sign_input)
  const encrypts = await vault.encrypt(ruid, encrypt_input)

  await ipfs.write(`/data/${ruid}/data/${req.params.filePath}`, encrypts[0].ciphertext)
  await ipfs.write(`/data/${ruid}/sign/${req.params.filePath}.sha`, signs[0].signature)

  next()
}