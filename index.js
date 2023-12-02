const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;







app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y5comcm.mongodb.net/?retryWrites=true&w=majority`;
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

    const userCollection = client.db("employee-management").collection("users");
    const workCollection = client.db("employee-management").collection("works");
    const reviewCollection = client.db("employee-management").collection("reviews");
    const contactCollection = client.db("employee-management").collection("contacts");



    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
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



    const verifyHR = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const hr = user?.role === 'hr';
      if (!hr) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

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


    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('logging out', user);
      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })


    // main 

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'Email already in use', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });


    app.get("/users/:id" , async(req , res) => {
      const id = req.params.id;
      const query = { _id : new ObjectId(id)};
      const result = await userCollection.findOne(query);
      res.send(result);

    })

    


     // making employee verified by hr

     app.patch('/users/e/employee/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          verified: 'yes'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })



    // employee list--

    app.get('/users/e/:role', async (req, res) => {
      const role = req.params.role;
      const cursor = userCollection.find({ role });
      const result = await cursor.toArray();
      res.send(result);
    })




    app.get('/users/admin/:email', verifyToken, async (req, res) => {
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


    app.get('/users/hr/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let hr = false;
      if (user) {
        hr = user?.role === 'hr';
      }
      res.send({ hr });
    })

    app.patch('/users/hr/:id', verifyToken,  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'hr'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })


    app.patch('/users/fire/:id', verifyToken,  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          fired: 'fired'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })


   


    // work---

    app.post('/works', verifyToken, async (req, res) => {
      const work = req.body;
      const result = await workCollection.insertOne(work);
      res.send(result);
    });

    app.get('/works', async (req, res) => {
      const email = req.query.employeeEmail;
      const query = { employeeEmail: email };
      const result = await workCollection.find(query).toArray();
      res.send(result);
    });


// review--

app.get('/reviews', async (req, res) => {
  const result = await reviewCollection.find().toArray();
  res.send(result);
})

// contacts
app.post('/contacts', async (req, res) => {
  const contact = req.body;
  const result = await contactCollection.insertOne(contact);
  res.send(result);
});


app.get('/contacts', async (req, res) => {
  const result = await contactCollection.find().toArray();
  res.send(result);
})


  } finally {
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})