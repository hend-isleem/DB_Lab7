# MySQL + Node.js lab7 — Setup & Testing Guide

This guide walks you through:
1) Building and running the Node.js API and connecting to MySQL  
2) Understanding the two lab7 tables (`users`, `posts`) and exercises to add more  
3) Testing the APIs with **curl** and **Postman**

---

## 0) Prerequisites

- **Node.js** 18+ and **npm**
- **MySQL** 8.x (or 5.7+) running locally
- Basic terminal access

---

## 1) Project Setup & DB Connection

### 1.1 Clone / Create the project folder
Put the project files (`package.json`, `index.js`, `.env`) in a folder, e.g. `mysql-express-lab7`.

### 1.2 Install dependencies
```bash
npm install
```

### 1.3 Configure environment
Create a `.env` file in the project root (adjust values as needed):
```ini
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=lab7_db
PORT=3000
```

### 1.4 Ensure MySQL is running
Verify MySQL is up and accepting connections on the host/port above.

### 1.5 Start the API
```bash
npm start
```
If successful, you’ll see:
```
Database initialized and tables ready.
API listening on http://localhost:3000
```

### 1.6 About table creation
In `index.js`, the lab7 app creates tables on boot:

```js
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_posts_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;
`);
```

---

## 2) Tables Overview & Exercises

### 2.1 `users`
Holds people who can author posts.
| Column      | Type           | Notes                                 |
|-------------|----------------|----------------------------------------|
| `id`        | INT PK AI      | Unique user ID                         |
| `name`      | VARCHAR(100)   | Required                                |
| `email`     | VARCHAR(191)   | Required, **UNIQUE**                    |
| `created_at`| TIMESTAMP      | Defaults to current timestamp           |

### 2.2 `posts`
Holds posts written by users.
| Column       | Type           | Notes                                                      |
|--------------|----------------|-----------------------------------------------------------|
| `id`         | INT PK AI      | Unique post ID                                            |
| `user_id`    | INT            | FK → `users.id` (**ON DELETE CASCADE**)                   |
| `title`      | VARCHAR(200)   | Required                                                  |
| `body`       | TEXT           | Optional                                                  |
| `created_at` | TIMESTAMP      | Defaults to current timestamp                             |

> **Cascade delete**: removing a user will delete their posts automatically.

---

## 2.3 Exercise A — Add a `comments` table (third table)
**Goal:** Allow comments on posts from users.

**Suggested schema:**
```sql
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_posts FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_comments_post_id (post_id),
  INDEX idx_comments_user_id (user_id)
) ENGINE=InnoDB;
```

**Stretch API ideas:**
- `POST /comments` → `{ post_id, user_id, body }`
- `GET /posts/:id/comments` → list comments for a post


---

## 2.4 Exercise B — Add a `likes` table (fourth table)
**Goal:** Track which user liked which post (one like per user per post).

**Suggested schema:**
```sql
CREATE TABLE IF NOT EXISTS likes (
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  CONSTRAINT fk_likes_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_likes_posts FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_likes_post_id (post_id)
) ENGINE=InnoDB;
```

**Stretch API ideas:**
- `POST /posts/:id/like` → likes a post as a given `user_id`
- `DELETE /posts/:id/like` → unlikes
- `GET /posts/:id/likes` → list users who liked the post
- `GET /posts?include_like_counts=true` → join + aggregate

> Tip: For uniqueness, the composite primary key `(user_id, post_id)` prevents duplicate likes.

---

## 3) Test the APIs

### 3.1 With browser

**Health**
```bash
http://localhost:3000/health
```

**List users**
```bash
http://localhost:3000/users
```

**List posts**
```bash
http://localhost:3000/posts
```

---

### 3.2 With Postman

Set `{{base_url}}` to `http://localhost:3000` (already defaulted in the collection).

**Option B — Create requests manually:**
- `GET {{base_url}}/health`
- `POST {{base_url}}/users` with JSON body `{ "name": "...", "email": "..." }`
- `GET {{base_url}}/users`
- `POST {{base_url}}/posts` with JSON body `{ "user_id": 1, "title": "Hello", "body": "..." }`
- `GET {{base_url}}/posts`
- `GET {{base_url}}/posts?user_id=1`
- `GET {{base_url}}/users/1/posts`


---
