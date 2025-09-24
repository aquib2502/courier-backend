import express from 'express'
import { Router } from 'express'
import { checkStatus, rechargeWallet } from '../controllers/walletController.js'
const router = Router()

router.post('/recharge-wallet', rechargeWallet)

router.get('/check-status', checkStatus)

export default router

