const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL connection setup
const pool = new Pool({
    user: 'postgres', // Replace with your PostgreSQL username
    host: 'localhost',
    database: 'project', // Use the correct database name
    password: '1234', // Replace with your PostgreSQL password
    port: 5432,
});

// Serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the registration page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Serve the login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle user registration
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if the username already exists
        const checkUsernameQuery = 'SELECT * FROM users WHERE username = $1';
        const usernameResult = await pool.query(checkUsernameQuery, [username]);

        if (usernameResult.rows.length > 0) {
            return res.status(400).send('Username already taken. Please choose another one.');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        const query = `
            INSERT INTO users (username, email, password)
            VALUES ($1, $2, $3)
        `;
        await pool.query(query, [username, email, hashedPassword]);

        // Redirect to the products page with the username in the query parameters
        res.redirect(`/products.html?username=${encodeURIComponent(username)}`);
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Error registering user.');
    }
});


// Handle user login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const query = 'SELECT * FROM users WHERE username = $1';
        const result = await pool.query(query, [username]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                // Pass username to the products page via query parameters
                res.redirect(`/products.html?username=${encodeURIComponent(username)}`);
            } else {
                res.status(401).send('Invalid credentials.');
            }
        } else {
            res.status(404).send('No user found with that username.');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Internal Server Error.');
    }
});



// Serve the products page
app.get('/products', async (req, res) => {
    try {
        const query = `
            SELECT uniq_id, product_name, retail_price, discounted_price, image, description 
            FROM products;
        `;
        const products = await pool.query(query);

        const formattedProducts = products.rows.map(product => {
            let imageArray = [];
            try {
                // Parse the stringified JSON array if the image column is a string
                imageArray = JSON.parse(product.image || '[]');
            } catch (error) {
                console.error("Error parsing image JSON:", error);
            }

            // Get the first image from the array (or use a fallback image)
            const image = imageArray[0] || 'path/to/default-image.jpg';

            return {
                id: product.uniq_id,
                name: product.product_name,
                retailPrice: parseFloat(product.retail_price).toFixed(2),
                discountedPrice: parseFloat(product.discounted_price).toFixed(2),
                description: product.description,
                image: image, // Use the first image
            };
        });

        res.json(formattedProducts); // Send formatted products data to frontend
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/add-to-wishlist/:productId', async (req, res) => {
    const { productId } = req.params;
    const username = req.query.username; // Extract username from query parameters

    if (!username) {
        return res.status(401).json({ error: 'User not logged in.' });
    }

    try {
        const query = `
            INSERT INTO wishlist (username, uniq_id)
            VALUES ($1, $2)
            ON CONFLICT (username, uniq_id) DO NOTHING;
        `;
        await pool.query(query, [username, productId]);

        res.json({ message: 'Product added to wishlist successfully!' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ error: 'Failed to add product to wishlist.' });
    }
});

app.post('/add-to-cart/:productId', async (req, res) => {
    const { productId } = req.params;
    const username = req.query.username; // Extract username from query parameters

    if (!username) {
        return res.status(401).json({ error: 'User not logged in.' });
    }

    try {
        const query = `
            INSERT INTO cart (username, uniq_id, quantity)
            VALUES ($1, $2, 1)
            ON CONFLICT (username, uniq_id)
            DO UPDATE SET quantity = cart.quantity + 1;
        `;
        await pool.query(query, [username, productId]);

        res.json({ message: 'Product added to cart successfully!' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Failed to add product to cart.' });
    }
});
// Fetch products in the user's wishlist
app.get('/wishlist', async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(401).json({ error: 'User not logged in.' });
    }

    try {
        const query = `
            SELECT p.* FROM products p
            JOIN wishlist w ON p.uniq_id = w.uniq_id
            WHERE w.username = $1;
        `;
        const result = await pool.query(query, [username]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ error: 'Failed to fetch wishlist.' });
    }
});

// Fetch products in the user's cart
app.get('/cart', async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(401).json({ error: 'User not logged in.' });
    }

    try {
        const query = `
            SELECT p.*, c.quantity FROM products p
            JOIN cart c ON p.uniq_id = c.uniq_id
            WHERE c.username = $1;
        `;
        const result = await pool.query(query, [username]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Failed to fetch cart.' });
    }
});
// Place the order for the user
app.post('/buy-now', async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(401).json({ error: 'User not logged in.' });
    }

    try {
        // Create the order
        const orderQuery = 'INSERT INTO orders (username, total_amount) VALUES ($1, 0) RETURNING order_id';
        const orderResult = await pool.query(orderQuery, [username]);
        const orderId = orderResult.rows[0].order_id;

        // Fetch cart items and insert them into the order_items table
        const cartQuery = `
            SELECT c.uniq_id, c.quantity, p.discounted_price
            FROM cart c
            JOIN products p ON c.uniq_id = p.uniq_id
            WHERE c.username = $1;
        `;
        const cartResult = await pool.query(cartQuery, [username]);

        let totalAmount = 0;
        for (const item of cartResult.rows) {
            const totalPrice = item.discounted_price * item.quantity;
            totalAmount += totalPrice;

            const orderItemQuery = `
                INSERT INTO order_items (order_id, uniq_id, quantity, price_per_unit, total_price)
                VALUES ($1, $2, $3, $4, $5);
            `;
            await pool.query(orderItemQuery, [orderId, item.uniq_id, item.quantity, item.discounted_price, totalPrice]);
        }

        // Update order total amount
        await pool.query('UPDATE orders SET total_amount = $1 WHERE order_id = $2', [totalAmount, orderId]);

        // Clear the cart
        await pool.query('DELETE FROM cart WHERE username = $1', [username]);

        res.json({ message: 'Order placed successfully!' });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ error: 'Failed to place order.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
