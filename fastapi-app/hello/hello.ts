import express from 'express';
import { randomUUID } from 'crypto';

const app = express();
app.use(express.json());

interface User {
    id: string;
    name: string;
    email: string;
    age: number;
}

const users: User[] = [];

// GET all users
app.get('/users', (req, res) => {
    res.json(users);
});

// GET user by ID
app.get('/users/:id', (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
});

// POST create new user
app.post('/users', (req, res) => {
    const { name, email, age } = req.body;
    
    if (!name || !email || !age) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const newUser: User = {
        id: randomUUID(),
        name,
        email,
        age
    };

    users.push(newUser);
    res.status(201).json(newUser);
});

// PUT update user
app.put('/users/:id', (req, res) => {
    const userIndex = users.findIndex(u => u.id === req.params.id);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    const { name, email, age } = req.body;
    users[userIndex] = {
        ...users[userIndex],
        ...(name && { name }),
        ...(email && { email }),
        ...(age && { age })
    };

    res.json(users[userIndex]);
});

// DELETE user
app.delete('/users/:id', (req, res) => {
    const userIndex = users.findIndex(u => u.id === req.params.id);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    users.splice(userIndex, 1);
    res.status(204).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
