const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qhwc1.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
// console.log('~ uri', uri);

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    const database = client.db('doctors_portal');
    const apppointmentsCollection = database.collection('appointments');
    const usersCollection = database.collection('users');

    //GET appointments
    app.get('/appointments', async (req, res) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();
      const query = { email: email, date: date };
      const cursor = apppointmentsCollection.find(query);
      const appointments = await cursor.toArray();
      res.send(appointments);
    });

    // POST appointments

    app.post('/appointments', async (req, res) => {
      const appointment = req.body;
      const result = await apppointmentsCollection.insertOne(appointment);
      res.send(result);
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

    app.put('/users/admin', async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const updateDoc = { $set: { role: 'admin' } };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.json(result);
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
