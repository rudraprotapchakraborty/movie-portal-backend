require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y7jbt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();

    const movieCollection = client.db('movieDB').collection('movie');
    const userCollection = client.db('movieDB').collection('users');
    const favoritesCollection = client.db('movieDB').collection('favorites');

    // Fetch all movies
    app.get('/movie', async (req, res) => {
      const cursor = movieCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Fetch a specific movie by ID
    app.get('/movie/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await movieCollection.findOne(query);
      if (!result) {
        return res.status(404).json({ message: "Movie not found" });
      }
      res.send(result);
    });

    // Fetch top-rated movies
    app.get('/movies/top-rated', async (req, res) => {
      try {
        const cursor = movieCollection.find().sort({ rating: -1 }).limit(6);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch top-rated movies", error });
      }
    });

    // Fetch all favorite movies of a specific user
    app.get('/favorites/:userId', async (req, res) => {
      const { userId } = req.params;
      const favorites = await favoritesCollection
        .find({ userId })
        .toArray();
    
      const movieIds = favorites.map(fav => fav.movieId);
      const movies = await movieCollection
        .find({ _id: { $in: movieIds } })
        .toArray();
    
      res.send(movies);
    });

    // Add a new movie
    app.post('/movie', async (req, res) => {
      const newMovie = req.body;
      const result = await movieCollection.insertOne(newMovie);
      res.send(result);
    });

    // Add a movie to a user's favorites
    app.post('/favorites', async (req, res) => {
      const { userId, movieId } = req.body;
      const result = await favoritesCollection.insertOne({
        userId,
        movieId: new ObjectId(movieId),
        addedAt: new Date(),
      });
      res.send(result);
    });

    // Delete a movie by ID
    app.delete('/movie/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await movieCollection.deleteOne(query);
      res.send(result);
    });

    // Remove a movie from a user's favorites
    app.delete('/favorites/:userId/:movieId', async (req, res) => {
      const { userId, movieId } = req.params;
      const result = await favoritesCollection.deleteOne({
        userId,
        movieId: new ObjectId(movieId),
      });

      if (result.deletedCount === 0) {
        return res.status(404).send({ message: 'Favorite movie not found' });
      }

      res.send({ message: 'Movie removed from favorites' });
    });

    // Fetch all users
    app.get('/users', async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Fetch a specific user by email
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User is not found" });
      }
      res.send(user);
    });

    // Create a new user
    app.post('/users', async (req, res) => {
      const newUser = req.body;

      // Check if user already exists
      const existingUser = await userCollection.findOne({ email: newUser.email });
      if (existingUser) {
        return res.status(400).send({ message: "User already exists" });
      }

      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    // Update user's last sign-in time
    app.patch('/users', async (req, res) => {
      const { email, lastSignInTime } = req.body;
      const filter = { email };
      const updatedDoc = {
        $set: {
          lastSignInTime,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Delete a user by ID
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("Movie app server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
