import { Router } from 'express';
import multer from 'multer'
import { signEncryptStore, listUserFiles, readDecryptVerify, deleteFile, shareFile } from '../middleware/middlewares.js'

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fields: 5, // No of text fields (which get populated in req.body)
    fileSize: 1024 * 1024 * 5,  // Max file size: 5 MB
    files: 5, // No of file fields (which get populated in req.files)
    headerPairs: 50 // No of headers to parse
  },
  preservePath: true
})

router.get('/', listUserFiles, async (req, res) => {
  // let files = fs.readdirSync('./uploads', {
  //   encoding: 'binary',
  //   withFileTypes: true
  // })
  // files = files.map((file) => {
  //   file.path = 'uploads/' + file.name
  //   return file
  // })

  res.status(200).json(await req.ipfs.files)
})

const mds = [upload.array('uploaded_files'), signEncryptStore]

router.post('/', mds, (req, res) => {
  const msg = "Files successfully uploaded!"
  res.status(200).json({msg})
})

router.get('/data/:userID/data/:filePath', readDecryptVerify, async (req, res) => {
  res.status(200).send(await req.ipfs.file)
})

router.delete('/data/:userID/data/:filePath', deleteFile, async (req, res) => {
  const file = req.params.filePath
  const msg = `File '${file}' successfully deleted!`
  res.status(200).json({msg})
})

router.post('/share/data/:userID/data/:filePath', shareFile, (req, res) => {
  const file = req.params.filePath
  const msg = `File '${file}' successfully shared with user "${req.body.recipient}"!`
  res.status(200).json({msg})
})

export default router