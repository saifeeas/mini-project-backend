import { Router } from 'express'
import { checkOrCreateKeys } from '../middleware/middlewares.js'
const router = Router()

router.get('/info', (req, res, next) => {
  res.status(200).json(req.auth)
});

router.get('/setup', async (req, res, next) => {
  await checkOrCreateKeys(req.auth.payload.sub)
  .then(status => res.status(200).json({msg: status}),
  error => res.status(200).json({error: error.message}))
})

export default router