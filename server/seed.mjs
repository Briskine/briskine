/* globals process */
/* eslint-disable no-console */

import { generateKeyPairSync } from 'node:crypto'

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'

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

const tags = [
  ['tag-0', { title: 'en', color: 'blue', customer: devCustomerId }],
  ['tag-1', { title: 'greetings', color: 'green', customer: devCustomerId }],
  ['tag-2', { title: 'followup', customer: devCustomerId }],
  ['tag-3', { title: 'closing', customer: devCustomerId }],
  ['tag-4', { title: 'personal', customer: devCustomerId }],
]

const templates = [
  {
    title: 'Say Hello',
    shortcut: 'h',
    subject: '',
    tags: ['tag-0', 'tag-1'],
    body: '<div>Hello {{to.first_name}},</div><div></div>',
  },
  {
    title: 'Nice talking to you',
    shortcut: 'nic',
    subject: '',
    tags: ['tag-0', 'tag-2'],
    body: '<div>It was nice talking to you.</div>',
  },
  {
    title: 'Kind Regards',
    shortcut: 'kr',
    subject: '',
    tags: ['tag-0', 'tag-3'],
    body: '<div>Kind regards,</div><div>{{from.first_name}}.</div>',
  },
  {
    title: 'My email',
    shortcut: 'e',
    subject: '',
    tags: ['tag-0', 'tag-4'],
    body: '<div>{{from.email}}</div>',
  },
  {
    title: 'Follow up tomorrow',
    shortcut: 'fut',
    subject: 'Following up',
    tags: ['tag-0', 'tag-2'],
    body: '<div>Hi {{to.first_name}},</div><div></div><div>I wanted to follow up on this tomorrow.</div>',
  },
]

async function seedAuthUser () {
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
}

async function seedFirestore () {
  const batch = db.batch()

  batch.set(db.collection('users').doc(devUserId), {
    email: devEmail,
    full_name: 'Dev User',
    customers: [devCustomerId],
    settings: {},
  })

  batch.set(db.collection('customers').doc(devCustomerId), {
    name: 'Dev Customer',
    members: [devUserId],
    subscription: {
      plan: 'free',
    },
  })

  tags.forEach(([id, tag]) => {
    batch.set(db.collection('tags').doc(id), tag)
  })

  templates.forEach((template, index) => {
    batch.set(db.collection('templates').doc(`template-${index}`), {
      ...template,
      customer: devCustomerId,
      owner: devUserId,
      sharing: 'everyone',
      deleted_datetime: null,
      created_datetime: Timestamp.fromMillis(Date.UTC(2026, 0, index + 1)),
    })
  })

  await batch.commit()
}

await seedAuthUser()
await seedFirestore()

console.log(`Seeded Firebase emulators for ${devEmail}`)
