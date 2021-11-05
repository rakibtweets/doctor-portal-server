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

    // POST appointments

    app.post('/appointments', async (req, res) => {
      const appointment = req.body;
      const result = await apppointmentsCollection.insertOne(appointment);
      res.send(result);
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
