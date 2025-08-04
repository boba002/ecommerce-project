CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Store hashed passwords
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE products (
    uniq_id VARCHAR(50) PRIMARY KEY, -- Use uniq_id as the primary key
    product_name TEXT NOT NULL,
    retail_price NUMERIC(10, 2),
    discounted_price NUMERIC(10, 2),
    image TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE wishlist (
    wishlist_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    uniq_id VARCHAR(50) NOT NULL REFERENCES products(uniq_id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, uniq_id) -- Ensure no duplicate entries
);


CREATE TABLE cart (
    cart_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    uniq_id VARCHAR(50) NOT NULL REFERENCES products(uniq_id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, uniq_id) -- Ensure one product per user in the cart
);


CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL,
    order_status VARCHAR(50) DEFAULT 'Pending', -- e.g., Pending, Completed, Cancelled
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    uniq_id VARCHAR(50) NOT NULL REFERENCES products(uniq_id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    price_per_unit NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL
);