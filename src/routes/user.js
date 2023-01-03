import { Router } from 'express'
const router = Router()

router.get('/info', (req, res, next) => {
  // res.render('home', {
  //   userProfile: JSON.stringify(req.oidc.user, null, 2)
  // });
  // const user = {
  //   "nickname": "test",
  //   "name": "test@example.com",
  //   "picture": "https://s.gravatar.com/avatar/55502f40dc8b7c769880b10874abc9d0?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fte.png",
  //   "updated_at": "2023-01-02T10:33:11.920Z",
  //   "email": "test@example.com",
  //   "email_verified": false,
  //   "sub": "auth0|634533525615e6a1bdb52285",
  //   "sid": "_1-HuToKKNhJtnHYDXy8_7jEvqFBL3su"
  // }
  console.log(req.auth)
  res.status(200).json(req.auth)
});

export default router