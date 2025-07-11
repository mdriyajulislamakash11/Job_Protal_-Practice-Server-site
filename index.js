const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Verify token middleware
// token verify
const varifyToken = (req, res, next) => {  // eta ekta middle ware verifyToken name
  console.log("inside verify token middleware"); // check korar jonno
  const token = req?.cookies?.token; // token ta ekhan theke pabo
  console.log(token);
  if (!token) {  // jodi token na thake tahole retun kore dibe
    // varify kortese
    return res.status(401).send({ message: "unAuthorized access" });
  }
  jwt.verify(token, process.env.USER_SECRET_KEY, (error, decoded) => { // jodi thake tahole varify kore nibe
    // mukh kaj

    if (error) { // error asle ar token set hobe na
      // arror asle error dibe
      return res.status(401).send({ message: "unAuthorized access" });
    }
    req.user = decoded;  // jodi na ase tahole eta ke decode kore dibe 
    next(); 
  });
};
// mongoDB server side code
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zchez.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const jobCollections = client.db("job_protal_DB").collection("jobs");
    const jobApplicationsCollection = client
      .db("job_protal_DB")
      .collection("job-Applications");

    // JWT Authentication || jwt sobar prothom etar kaj
    app.post("/jwt", (req, res) => {  // jwt token bananor kaj
      const user = req.body;
      const token = jwt.sign(user, process.env.USER_SECRET_KEY, {
        expiresIn: "4h",
      });
      res
        .cookie("token", token, {  // eta diye browser er cookie te token set kortese
          httpOnly: true,           // sudhu http only support korbe
          secure: false,
          sameSite: "lax",
        })
        .send({ success: true });
    });

    // JWT Logout   || eta hocche jodi user log out hoy tahole token remove hoye
    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {  // eta diye token clear kortese cokkie theke remove kortese
          httpOnly: true,
          secure: false,
          sameSite: "lax",
        })
        .send({ success: true });
    });

    // All Job APIs
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

    // Job Applications APIs
    app.get("/job-application", varifyToken, async (req, res) => {  // eije ekhane verify token er mul kaj hocche
      const email = req.query.email;
      const query = { applicant_email: email };

    if(req.user.email !== req.query.email){  // eije eta hocche khub importent kaj
      return res.status(403).send({message: "forbidden"})  // user er email ar query er email jodi thik na hoy tahole retun kore dibe
    };


      const applications = await jobApplicationsCollection
        .find(query)
        .toArray();

      for (const application of applications) {
        const job = await jobCollections.findOne({
          _id: new ObjectId(application.job_id),
        });
        if (job) {
          application.title = job.title;
          application.company = job.company;
          application.company_logo = job.company_logo;
          application.category = job.category;
        }
      }
      res.send(applications);
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

      const jobId = application.job_id;
      const job = await jobCollections.findOne({ _id: new ObjectId(jobId) });

      let newCount = 0;
      if (job?.applicationCount) {
        newCount = job.applicationCount + 1;
      } else {
        newCount = 1;
      }

      await jobCollections.updateOne(
        { _id: new ObjectId(jobId) },
        { $set: { applicationCount: newCount } }
      );

      res.send(result);
    });

    app.patch("/job-applications/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const updatedDoc = { $set: { status: data.status } };
      const result = await jobApplicationsCollection.updateOne(
        { _id: new ObjectId(id) },
        updatedDoc
      );
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // do not close connection
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Job Protal Server");
});

app.listen(port, () => {
  console.log(`Job Protal server running on port: ${port}`);
});
