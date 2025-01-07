# Movie Portal - Server

This is the backend API for the Movie Portal application, which serves as the engine for managing movies, user favorites, and handling CRUD (Create, Read, Update, Delete) operations. It provides all the necessary endpoints for the frontend to interact with the movie data and user-specific actions.

## Live Site URL
https://movie-portal-server-two-pink.vercel.app/

## Features
- **Manage Movies:** Admins can add, delete, and update movie entries.
- **User Favorites:** Users can add movies to their favorites list and retrieve their list of favorites.
- **Authentication:** Secure login system for users to manage their accounts and favorites.
- **RESTful API Endpoints:** A simple and clean REST API for interacting with the server.
- **MongoDB Database Support:** This backend is compatible with MongoDB for NoSQL or MySQL/PostgreSQL for SQL databases.

---

## API Endpoints

### **Movies**
- **GET** `/movies`: Retrieve a list of all movies.
  - Response: A list of movies with details like title, description, and ratings.
  
- **GET** `/movie/{id}`: Retrieve detailed information about a specific movie.
  - URL Params: `id` (The unique movie identifier)
  - Response: Detailed information about the movie.
  
- **POST** `/movie`: Add a new movie to the database.
  - Body: JSON with movie details (e.g., title, description, genre, etc.)
  - Example: 
    ```json
    {
      "title": "Inception",
      "description": "A mind-bending thriller about dreams within dreams.",
      "genre": "Sci-Fi",
      "releaseDate": "2010-07-16"
    }
    ```
  
- **DELETE** `/movie/{id}`: Delete a movie from the database.
  - URL Params: `id` (The movie identifier to delete)

### **Favorites**
- **POST** `/favorites`: Add a movie to the user's favorites.
  - Body: JSON with the user ID and movie ID to add to favorites.
  - Example:
    ```json
    {
      "userId": "12345",
      "movieId": "67890"
    }
    ```

- **GET** `/favorites/{userId}`: Retrieve all the movies from a user's favorite list.
  - URL Params: `userId` (The user identifier to fetch favorites for)
  - Response: A list of movies that are marked as favorites.

---

## Tech Stack

- **Node.js** and **Express.js** for building the backend server and API endpoints.
- **MongoDB**  for database management (use MongoDB for NoSQL or MySQL/PostgreSQL for relational databases).

---