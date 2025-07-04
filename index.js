const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

// midle ware
app.use(
  cors({
    origin: `http://localhost:5173`,
    credentials: true,
  })
);
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
    const jobApplicationsCollection = client
      .db("job_protal_DB")
      .collection("job-Applications");

    // JWT Authentication: ------------------------------------>JWT
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, "secret", { expiresIn: "4h" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    // token Verify:
    const varifyToke = (req, res, next) => {
      const token = req.cookies?.token;

      if (!token) {
        return res.status(401).send({ message: "unAuthorize" });
      }

      jwi.verify(token, process.env.USER_SECRET_KEY, (error, deCode) => {
        if (error) {
          return res.status(401).send({ message: "unAuthorize" });
        }

        req.user = deCode;
        next();
      });
    };

    // all Job Apis----------------------------------------------------> All JOB
    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
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
      res.send(result);
    });

    // Job Applications Apis:

    app.get("/job-application", varifyToke, async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };
      const result = await jobApplicationsCollection.find(query).toArray();

      // ekahne ami jobCollection theke kichu data job applicationCollection er moddhe pathabo
      for (const application of result) {
        const query1 = { _id: new ObjectId(application.job_id) };
        const job = await jobCollections.findOne(query1);

        //
        if (job) {
          application.title = job.title;
          application.company = job.company;
          application.company_logo = job.company_logo;
          application.category = job.category;
        }
      }
      res.send(result);
    });

    app.get("/job-applications/jobs/:job_id", async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId };
      const result = await jobApplicationsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/job-applications", async (req, res) => {
      const application = req.body;
      const result = await jobApplicationsCollection.insertOne(application);

      // application count er kaj
      const id = application.job_id;
      const query = { _id: new ObjectId(id) };
      const job = await jobCollections.findOne(query);

      let newCount = 0;
      if (job.applicationCount) {
        newCount = job.applicationCount + 1;
      } else {
        newCount = 1;
      }

      const filter = { _id: new ObjectId(id) };
      const updateCount = {
        $set: {
          applicationCount: newCount,
        },
      };
      const updatedResult = await jobCollections.updateOne(filter, updateCount);
      res.send(result);
    });

    app.patch("/job-applications/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const data = req.body;
      const updatedDoc = {
        $set: {
          status: data.status,
        },
      };
      const result = await jobApplicationsCollection.updateOne(
        query,
        updatedDoc
      );
      res.send(result);
    });

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
