require('dotenv/config');
const express = require('express');

const db = require('./database');
const ClientError = require('./client-error');
const staticMiddleware = require('./static-middleware');
const sessionMiddleware = require('./session-middleware');

const app = express();

app.use(staticMiddleware);
app.use(sessionMiddleware);

app.use(express.json());

app.get('/api/health-check', (req, res, next) => {
  db.query('select \'successfully connected\' as "message"')
    .then(result => res.json(result.rows[0]))
    .catch(err => next(err));
});

app.get('/api/products', (req, res, next) => {
  const sql = `
  SELECT "productId",
          "name",
          "price",
          "image",
          "shortDescription"
  FROM "products"
  `;
  db.query(sql)
    .then(result => {
      res.json(result.rows);
    }).catch(err => next(err));
});

app.get('/api/products/:productId', (req, res, next) => {
  const productId = req.params.productId;
  const sql = `
  SELECT *
  FROM "products"
  WHERE "productId" = $1
  `;
  if (productId < 0) {
    next(new ClientError(`${productId} is not a valid Product ID`, 400));
  } else {
    db.query(sql, [productId])
      .then(result => {
        const productDetails = result.rows[0];
        if (!productDetails) {
          next(new ClientError(`Cannot ${req.method} Product with ID: ${productId}`, 404));
        } else {
          res.status(200).json(productDetails);
        }
      }).catch(err => next(err));
  }
});

app.get('/api/cart', (req, res, next) => {
  const sqlExist = `
  SELECT "cartItems"."cartItemId",
          "cartItems"."price",
          "products"."productId",
          "products"."image",
          "products"."name",
          "products"."shortDescription",
          "cartItems"."quantity",
          "cartItems"."totalprice"
  FROM "cartItems"
  JOIN "products" USING ("productId")
  WHERE "cartItems"."cartId" = $1
  `;

  if (!req.session.cartId) {
    return res.json([]);
  } else {
    return (
      db.query(sqlExist, [req.session.cartId])
        .then(result => {
          const cartContent = result.rows;
          res.status(200).json(cartContent);
        })
    );
  }
});

app.put('/api/cart', (req, res, next) => {
  const cartId = req.session.cartId;
  const productId = req.body.productId;
  const newQuantity = req.body.newQuantity;
  const newTotalPrice = req.body.newTotalPrice;
  const sql = `
  UPDATE "cartItems"
  SET "quantity" = $1,
      "totalprice" = $2
  WHERE "cartId" = $3 AND "productId" = $4
  RETURNING *
  `;

  db.query(sql, [newQuantity, newTotalPrice, cartId, productId])
    .then(result => {
      res.status(201).json(result.rows[0]);
    })
    .catch(err => next(err));
});

app.post('/api/cart', (req, res, next) => {
  const productId = req.body.productId;
  const sql = `
  SELECT "price"
  FROM "products"
  WHERE "productId" = $1
  `;
  if (parseInt(productId) < 0 || !productId) {
    next(new ClientError(`${productId} is not a Valid Product ID`, 400));
  } else {
    db.query(sql, [productId])
      .then(result => {
        const productIdCheck = result.rows;
        if (!productIdCheck) {
          throw new ClientError('That is an invalid request');
        } else {
          const insertNewCartSQL = `
              INSERT INTO "carts" ("cartId", "createdAt")
              VALUES (default, default)
              RETURNING "cartId"
            `;
          if (!req.session.cartId) {
            return (
              db.query(insertNewCartSQL)
                .then(result => {
                  return (
                    {
                      cartId: result.rows[0].cartId,
                      price: productIdCheck[0].price
                    }
                  );
                })
            );
          } else {
            return (
              {
                cartId: req.session.cartId,
                price: productIdCheck[0].price
              }
            );
          }
        }
      })
      .then(result => {
        const quantity = req.body.quantity;
        const resultCartID = result.cartId;
        const resultPrice = result.price;
        req.session.cartId = resultCartID;
        const insertCartItemsSQL = `
          INSERT INTO "cartItems" ("cartId", "productId", "price", "quantity", "totalprice")
          VALUES ($1, $2, $3, $4, $5)
          RETURNING "cartItemId"
        `;
        return (
          db.query(insertCartItemsSQL, [resultCartID, productId, resultPrice, quantity, (quantity * resultPrice)])
            .then(result => {
              return (result.rows[0].cartItemId);
            })
        );
      })
      .then(result => {
        const cartItemId = result;
        const cartItemInformationSQL = `
        SELECT "cartItems"."cartItemId",
                "cartItems"."price",
                "products"."productId",
                "products"."image",
                "products"."name",
                "products"."shortDescription",
                "cartItems"."quantity",
                "cartItems"."totalprice"
        FROM "cartItems"
        JOIN "products" USING ("productId")
        WHERE "cartItems"."cartItemId" = $1
        `;
        return (
          db.query(cartItemInformationSQL, [cartItemId])
            .then(result => {
              const cartItemInformation = result.rows[0];
              res.status(201).json(cartItemInformation);
            }));
      })
      .catch(err => next(err));
  }
});

app.post('/api/orders', (req, res, next) => {
  const customerCartId = req.session.cartId;
  const customerName = req.body.name;
  const customerEmail = req.body.email;
  const customerPhoneNumber = req.body.phonenumber;
  const customerAddress = req.body.shippingAddress;
  const customerCity = req.body.city;
  const customerState = req.body.state;
  const customerZip = req.body.zip;
  const customerCreditCard = req.body.creditCard;
  const customerCreditCardMonth = req.body.expiremonth;
  const customerCreditCardYear = req.body.expireyear;
  const customerCreditCardCvv = req.body.cvv;
  if (!customerCartId) {
    next(new ClientError('Cart ID is Invalid', 400));
  } else if (!customerName) {
    next(new ClientError('Please Enter A Name.', 400));
  } else if (!customerCreditCard) {
    next(new ClientError('Please Enter A Valid Credit Card'), 400);
  } else if (!customerAddress) {
    next(new ClientError('Please enter A Valid Address'), 400);
  } else {
    const customerInfoSQL = `
    INSERT INTO "orders" ("cartId", "name", "email", "phonenumber", "shippingAddress", "city", "state", "zip", "creditCard", "expiremonth", "expireyear", "cvv")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
    `;
    return (
      db.query(customerInfoSQL, [customerCartId, customerName, customerEmail, customerPhoneNumber, customerAddress, customerCity, customerState, customerZip, customerCreditCard, customerCreditCardMonth, customerCreditCardYear, customerCreditCardCvv])
        .then(result => {
          const customerInfo = result.rows[0];
          delete req.session.cartId;
          return (
            res.status(201).json(customerInfo)
          );
        }).catch(err => next(err))
    );
  }
});

app.put('/api/cart/:cartItemId', (req, res, next) => {
  const cartItemId = req.params.cartItemId;
  const newQuantity = req.body.quantity;
  const newTotalPrice = req.body.newTotalPrice;
  const updateSQL = `
  UPDATE "cartItems"
  SET "quantity" = $1,
      "totalprice" = $2
  WHERE "cartItemId" = $3
  RETURNING *
  `;

  db.query(updateSQL, [newQuantity, newTotalPrice, cartItemId])
    .then(result => {
      res.status(201).json(result.rows[0]);
    })
    .catch(err => next(err));
});

app.delete('/api/cart/:cartItemId', (req, res, next) => {
  const cartItemId = req.params.cartItemId;
  const cartId = req.session.cartId;
  const deleteSQL = `
  DELETE FROM "cartItems"
  WHERE "cartItemId" = $1
  AND "cartId" = $2
  RETURNING *
  `;

  db.query(deleteSQL, [cartItemId, cartId])
    .then(result => {
      if (!result.rows[0]) {
        res.status(404).json(`Cannot find Cart Item with ID: ${cartItemId}`);
      } else if (!cartId) {
        res.status(404).json(`Cannot find Cart with ID: ${cartId}`);
      } else {
        res.status(204).json(`Item with cart item ID ,${cartItemId}, has been deleted`);
      }
    })
    .catch(err => next(err));
});

app.use('/api', (req, res, next) => {
  next(new ClientError(`cannot ${req.method} ${req.originalUrl}`, 404));
});

app.use((err, req, res, next) => {
  if (err instanceof ClientError) {
    res.status(err.status).json({ error: err.message });
  } else {
    console.error(err);
    res.status(500).json({
      error: 'an unexpected error occurred'
    });
  }
});

app.listen(process.env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log('Listening on port', process.env.PORT);
});
