const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.izczxgs.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // user 
    const userCollection = client.db('FitFormaFusionDB').collection('user');

    const FeaturesCollection = client.db('FitFormaFusionDB').collection('features');

    const SuccessStoriesCollection = client.db("FitFormaFusionDB").collection("SuccessStories");

    const latestArticlesCollection = client.db("FitFormaFusionDB").collection("latestArticles");

    const NewsletterCollection = client.db("FitFormaFusionDB").collection("newsletterInfo");
    const trainerCollection = client.db("FitFormaFusionDB").collection("trainer");

    const BecomeTrainerCollection = client.db("FitFormaFusionDB").collection("becomeTrainer");

    const PhotoCollection = client.db("FitFormaFusionDB").collection("photo");
    // weeklySchedule
    const weeklyScheduleCollection = client.db("FitFormaFusionDB").collection("weeklySchedule");


    // features
    app.get('/features', async (req, res) => {
        const cursor = FeaturesCollection.find();
        const features = await cursor.toArray();
        res.send(features);
    })
    // SuccessStories
    app.get('/SuccessStories', async(req, res) =>{
        const result = await SuccessStoriesCollection.find().toArray();
        res.send(result);
    })
     // latestArticles
     app.get('/latestArticles', async(req, res) =>{
        const result = await latestArticlesCollection.find().toArray();
        res.send(result);
    })
    // newsletterInfo
    app.post('/newsletterInfo', async (req, res) => {
        const SubscribeUser = req.body;
        console.log(SubscribeUser);
        const result = await NewsletterCollection.insertOne(SubscribeUser);
        res.send(result);
    });
    // trainer
    app.get('/trainer', async(req, res) =>{
        const result = await trainerCollection.find().toArray();
        res.send(result);
    })

    app.get('/trainer/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await trainerCollection.findOne(query);
      res.send(result);
  })
      // becomeTrainer
      app.post('/becomeTrainer', async (req, res) => {
        const FormData = req.body;
        console.log(FormData);
        const result = await BecomeTrainerCollection.insertOne(FormData);
        res.send(result);
    });

    // photo
    app.get('/photo', async(req, res) =>{
        const result = await PhotoCollection.find().toArray();
        res.send(result);
    })
    // weeklySchedule
    app.get('/weeklySchedule', async(req, res) =>{
        const result = await weeklyScheduleCollection.find().toArray();
        res.send(result);
    })


   

    // user api
    app.get('/user', async (req, res) => {
        const cursor = userCollection.find();
        const users = await cursor.toArray();
        res.send(users);
    })
    
    app.post('/user', async (req, res) => {
        const user = req.body;
        console.log(user);
        const result = await userCollection.insertOne(user);
        res.send(result);
    });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('server is running')
})

app.listen(port, () => {
    console.log(`  server is running on port ${port}`);
})