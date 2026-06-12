/* globals process */
/* eslint-disable no-console */

import { generateKeyPairSync } from 'node:crypto'

import cors from 'cors'
import express from 'express'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const projectId = 'demo-briskine-development'
const devUserId = 'dev-user-1'
const devCustomerId = 'dev-customer-1'
const devEmail = 'dev@briskine.test'
const devPassword = 'dev123456'

process.env.GCLOUD_PROJECT ||= projectId
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= 'localhost:9099'
process.env.FIRESTORE_EMULATOR_HOST ||= 'localhost:5002'

function initializeFirebaseAdmin () {
  if (getApps().length) {
    return
  }

  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  })

  initializeApp({
    projectId,
    credential: cert({
      projectId,
      clientEmail: `firebase-adminsdk-dev@${projectId}.iam.gserviceaccount.com`,
      privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    }),
  })
}

initializeFirebaseAdmin()

const auth = getAuth()
const db = getFirestore()
const app = express()

app.use(cors())
app.use(express.json())

async function ensureDevUser () {
  try {
    await auth.getUser(devUserId)
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      throw err
    }

    await auth.createUser({
      uid: devUserId,
      email: devEmail,
      password: devPassword,
      displayName: 'Dev User',
      emailVerified: true,
    })
  }

  await db.collection('users').doc(devUserId).set({
    email: devEmail,
    full_name: 'Dev User',
    customers: [devCustomerId],
    settings: {},
  }, { merge: true })

  await db.collection('customers').doc(devCustomerId).set({
    name: 'Dev Customer',
    members: [devUserId],
    subscription: {
      plan: 'free',
    },
  }, { merge: true })
}

async function createDevToken () {
  await ensureDevUser()
  return auth.createCustomToken(devUserId)
}

app.post('/api/1/login', async (req, res) => {
  try {
    const token = await createDevToken()
    res.json({ token })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

app.get('/api/1/session', async (req, res) => {
  try {
    const authorization = req.get('Authorization')
    if (authorization?.startsWith('Bearer ')) {
      await auth.verifyIdToken(authorization.slice('Bearer '.length))
      res.json({})
      return
    }

    const token = await createDevToken()
    res.json({ token })
  } catch (err) {
    res.status(401).json({ message: err.message })
  }
})

app.post('/api/1/logout', (req, res) => {
  res.json({})
})

const port = process.env.PORT || 5000
app.listen(port, () => {
  console.log(`Local Briskine API listening on http://localhost:${port}`)
})
