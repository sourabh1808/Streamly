import express from 'express';
import passport from 'passport';
import {register, login, googleCallback, getMe} from '../controllers/auth.controller.js';

const router = express.Router();

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  googleCallback
);

router.post('/register', register);
router.post('/login', login);
router.get('/me', getMe);

export default router;
