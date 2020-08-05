const express = require('express');
const router = express.Router();
const { signUp, activateAccount, sighIn, forgotPassword, resetPassword } = require('../controllers/auth.controllers')

router.post('/signup', signUp);

router.post('/account-activation', activateAccount);

router.post('/signin', sighIn);

router.post('/forgot-password', forgotPassword);

router.post('/reset-password', resetPassword);

module.exports = router;