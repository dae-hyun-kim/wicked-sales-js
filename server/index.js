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