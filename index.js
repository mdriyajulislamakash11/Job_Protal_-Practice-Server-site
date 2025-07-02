const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

// midle ware
app.use(cors());
app.use(express.json());

// mongoDB server site Code:

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zchez.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const jobCollections = client.db("job_protal_DB").collection("jobs");
    const jobApplicationsCollection = client.db("job_protal_DB").collection("job-Applications");

    // all Job Apis
    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {}
      if(email) {
        query = {hr_email: email};
      }

      const cursor = jobCollections.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollections.findOne(query);
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobCollections.insertOne(newJob);
      res.send(result)
    })


    // Job Applications Apis: 
    app.get("/job-application", async (req, res) => {
      const email = req.query.email;
      const query = {applicant_email: email}
      const result = await jobApplicationsCollection.find(query).toArray()
      

      // ekahne ami jobCollection theke kichu data job applicationCollection er moddhe pathabo
      for(const application of result) {
        const query1 = {_id: new ObjectId(application.job_id)}
        const job = await jobCollections.findOne(query1);

        // 
        if(job){
          application.title = job.title;
          application.company = job.company
          application.company_logo = job.company_logo;
          application.category= job.category;
        }
      }
      res.send(result)
    })

    app.post("/job-applications", async (req, res) => {
      const application = req.body;
      const result = await jobApplicationsCollection.insertOne(application);
      res.send(result)
    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Job Protal Server");
});

app.listen(port, () => {
  console.log(`Job Protal server site running on Port: ${port}`);
});
