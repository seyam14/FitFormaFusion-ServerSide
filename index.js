const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    // await client.connect();

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
    // posts
    const postsCollection = client.db("FitFormaFusionDB").collection("posts");
    const balancesCollection = client.db("FitFormaFusionDB").collection("balances");

    const paymentHistory = [];
     
    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })
      

    // middlewares 
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);

      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }
      // use verify admin after verifyToken
      const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        const isAdmin = user?.role === 'admin';
        if (!isAdmin) {
          return res.status(403).send({ message: 'forbidden access' });
        }
        next();
      }
    

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

    app.get('/newsletterInfo', async(req, res) =>{
      const result = await NewsletterCollection.find().toArray();
      res.send(result);
  })
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
      app.get('/becomeTrainer', async(req, res) =>{
        const result = await BecomeTrainerCollection.find().toArray();
        res.send(result);
    })

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

    // POSTS
      app.get("/posts", async (req, res) => {
      try {
        const posts = await postsCollection.find().sort({ _id: -1 }).toArray();
        res.send({ posts });
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch posts" });
      }
    });

    app.post("/posts", verifyToken, async (req, res) => {
      const { title, content } = req.body;
      if (!title || !content) return res.status(400).send({ message: "Title and content required" });

      const newPost = {
        title,
        content,
        upvotes: 0,
        downvotes: 0,
        comments: [],
        createdAt: new Date(),
      };

      const result = await postsCollection.insertOne(newPost);
      res.send({ message: "Post created", insertedId: result.insertedId });
    });

    app.post("/posts/:id/upvote", verifyToken, async (req, res) => {
      try {
        const postId = req.params.id;
        const result = await postsCollection.findOneAndUpdate(
          { _id: new ObjectId(postId) },
          { $inc: { upvotes: 1 } },
          { returnDocument: "after" }
        );
        res.send({ updatedUpvotes: result.value.upvotes });
      } catch {
        res.status(400).send({ error: "Invalid post ID" });
      }
    });

    app.post("/posts/:id/downvote", verifyToken, async (req, res) => {
      try {
        const postId = req.params.id;
        const result = await postsCollection.findOneAndUpdate(
          { _id: new ObjectId(postId) },
          { $inc: { downvotes: 1 } },
          { returnDocument: "after" }
        );
        res.send({ updatedDownvotes: result.value.downvotes });
      } catch {
        res.status(400).send({ error: "Invalid post ID" });
      }
    });

    app.post("/posts/:id/comment", verifyToken, async (req, res) => {
      const postId = req.params.id;
      const { commentText } = req.body;
      if (!commentText) return res.status(400).send({ error: "Comment text required" });

      const comment = {
        text: commentText,
        createdAt: new Date(),
      };

      const result = await postsCollection.findOneAndUpdate(
        { _id: new ObjectId(postId) },
        { $push: { comments: comment } },
        { returnDocument: "after" }
      );

      res.send({ message: "Comment added", comments: result.value.comments });
    });
    
    // balances api
     // 🟢 Get all balances
    app.get("/balances", async (req, res) => {
      try {
        const balances = await balancesCollection.find().toArray();
        res.json(balances);
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch balances" });
      }
    });

    // 🔵 Get a single balance
    app.get("/balances/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const balance = await balancesCollection.findOne({ _id: new ObjectId(id) });
        res.json(balance);
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch balance" });
      }
    });

    // 🟡 Create new balance
    app.post("/balances", async (req, res) => {
      try {
        const data = req.body;
        const result = await balancesCollection.insertOne(data);
        res.json({ message: "Balance added", result });
      } catch (err) {
        res.status(500).json({ error: "Failed to add balance" });
      }
    });

    // 🟠 Update balance
    app.put("/balances/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateDoc = { $set: req.body };
        const result = await balancesCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
        res.json({ message: "Balance updated", result });
      } catch (err) {
        res.status(500).json({ error: "Failed to update balance" });
      }
    });

    // 🔴 Delete balance
    app.delete("/balances/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await balancesCollection.deleteOne({ _id: new ObjectId(id) });
        res.json({ message: "Balance deleted", result });
      } catch (err) {
        res.status(500).json({ error: "Failed to delete balance" });
      }
    });
    

    // user api
    app.get('/user', verifyToken, verifyAdmin, async (req, res) => {
        const cursor = userCollection.find();
        const users = await cursor.toArray();
        res.send(users);
    })

    //  
    
    app.get('/user/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
    
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
    
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.get('/user/trainer/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
    
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
    
      const query = { email: email };
      const user = await trainerCollection.findOne(query);
      let trainer = false;
      if (user) {
       trainer = user?.role === 'trainer';
      }
      res.send({trainer });
    })

    // 
    app.patch('/user/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // Update user's name if provided in the request
      const updateUser = {
        $set: {
        name : req.body.name,
        },
      };
    
      const result = await userCollection.updateOne(filter, updateUser);
        res.send(result);
          });
    

    // updatedUse
    
    app.post('/user', async (req, res) => {
        const user = req.body;
        console.log(user);
        // 
        const query = { email: user.email }
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: 'user already exists', insertedId: null })
        }

        // 
        const result = await userCollection.insertOne(user);
        res.send(result);
    });

    
    app.patch('/user/admin/:id',verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })
   
    app.delete('/user/:id', verifyToken, verifyAdmin,  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })



      // payment intent
      app.post('/create-payment-intent', async (req, res) => {
        try {
            const { price, trainerId } = req.body;
            const amount = parseInt(price * 100);
            const userId = trainerId
            console.log(trainerId); 
    
            
            const lastPayment = paymentHistory.find(payment => {
                return (
                    payment.userId === userId &&
                    new Date(payment.timestamp).getMonth() === new Date().getMonth()
                );
            });
    
            if (lastPayment) {
                // User has already made a payment in the current month
                return res.status(400).send({ error: 'User has already made a payment this month' });
            }
    
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
    
            
            paymentHistory.push({
                userId: userId,
                timestamp: new Date().toISOString(),
                amount: amount
            });
    
            res.send({
                clientSecret: paymentIntent.client_secret
            });
        } catch (error) {
            console.error('Error creating payment intent:', error);
            res.status(500).send({ error: 'Error creating payment intent' });
        }
    });


      // becomeTrainer post
      app.patch('/becomeTrainer/:Id', async(req, res) =>{
        try {
          const id = req.params.Id;
          const filter = { _id: new ObjectId(id) };
          const updateDoc = {
            $set: { role: "trainer" },
        
          };
          const trainer = await BecomeTrainerCollection.findOne(filter)
          trainer.role = "trainer";
          delete trainer._id
          const result = await trainerCollection.insertOne(trainer)
          const deleted = await BecomeTrainerCollection.deleteOne(filter);
        
          res.send(result);
        
        } catch (error) {
          res
            .status(500)
            .send({error: true, message: "server side error"});
        }
        
        
        })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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