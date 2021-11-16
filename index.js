const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const admin = require('firebase-admin');
require('dotenv').config();
const ObjectId = require('mongodb').ObjectID;
const { ObjectID } = require('bson');
const fileUpload = require('express-fileupload');
const stripe = require('stripe')(process.env.SPTRIPE_SECRET);
const app = express();
const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qhwc1.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
// console.log('~ uri', uri);

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }

  next();
}
// functionality start
async function run() {
  try {
    await client.connect();
    const database = client.db('doctors_portal');
    const apppointmentsCollection = database.collection('appointments');
    const usersCollection = database.collection('users');
    const doctorsCollection = database.collection('doctors');

    //GET appointments
    app.get('/appointments', verifyToken, async (req, res) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();
      const query = { email: email, date: date };
      const cursor = apppointmentsCollection.find(query);
      const appointments = await cursor.toArray();
      res.send(appointments);
    });

    // get single appointment info
    app.get('/appointments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectID(id) };
      const result = await apppointmentsCollection.findOne(query);
      res.json(result);
    });

    // POST appointments
    app.post('/appointments', async (req, res) => {
      const appointment = req.body;
      const result = await apppointmentsCollection.insertOne(appointment);
      res.send(result);
    });

    // update appointment payment status
    app.put('/appointments/:id', async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectID(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          payment: payment,
        },
      };
      const result = await apppointmentsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    //doctors collecion post api

    app.post('/doctors', async (req, res) => {
      const name = req.body.name;
      const email = req.body.email;
      const pic = req.files.image;
      const picData = pic.data;
      const encodedPic = picData.toString('base64');
      const imageBuffer = Buffer.from(encodedPic, 'base64');
      const doctor = {
        name,
        email,
        image: imageBuffer,
      };
      const result = await doctorsCollection.insertOne(doctor);
      res.json(result);
    });

    // doctors get api call
    app.get('/doctors', async (req, res) => {
      const cursor = doctorsCollection.find({});
      const doctors = await cursor.toArray();
      res.json(doctors);
    });

    //make admin
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === 'admin') {
        isAdmin = true;
      }
      res.send({ admin: isAdmin });
    });

    // post user
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    // update user to database

    app.put('/users', async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    // make an user admin

    app.put('/users/admin', verifyToken, async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === 'admin') {
          const updateDoc = { $set: { role: 'admin' } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: 'You do not have access to make admin' });
      }
    });

    app.post('/create-payment-intent', async (req, res) => {
      const paymentInfo = req.body;
      const amount = paymentInfo.price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        payment_method_types: ['card'],
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    });
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Doctors Porter server running');
});

app.listen(port, () => {
  console.log('Running server on port', port);
});
