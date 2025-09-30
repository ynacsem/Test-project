const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');
const cors = require("cors");

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

function sanitizeText(t) {
  if (t == null) return null;
  return String(t).replace(/[\0\x08\x09\x1a\n\r"'\\\%<>\x00]/g, '').trim();
}

function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid.trim());
}

app.get('/api/diagnoses', async (req, res) => {
  const { pool } = require('./db');
  try {
    const { rows } = await pool.query(
      'SELECT * FROM diagnoses ORDER BY predicted_date DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('DB error', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/diagnoses/:clientId', async (req, res) => {
  const { pool } = require('./db');
  const clientId = req.params.clientId;
  
  if (!isValidUUID(clientId)) {
    return res.status(400).json({ error: 'invalid clientId - must be a valid UUID' });
  }

  try {
    const { rows } = await pool.query(
        `SELECT * FROM diagnoses 
        WHERE client_id = $1
        ORDER BY predicted_date DESC
        LIMIT 1`,
        [clientId]
        );
    if (rows.length === 0) return res.status(404).json({ error: 'diagnosis not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('DB error', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/diagnoses/:clientId', async (req, res) => {
  const { pool } = require('./db');
  const clientId = req.params.clientId;
  
  if (!isValidUUID(clientId)) {
    return res.status(400).json({ error: 'invalid clientId - must be a valid UUID' });
  }

  const diagnosis_name = sanitizeText(req.body.diagnosis_name);
  const justification = sanitizeText(req.body.justification);
  const challenged_diagnosis = sanitizeText(req.body.challenged_diagnosis);
  const challenged_justification = sanitizeText(req.body.challenged_justification);

  if (!diagnosis_name || diagnosis_name.trim() === '' || !justification || justification.trim() === '') {
    return res.status(400).json({ error: 'diagnosis_name and justification are required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO diagnoses
        (client_id, diagnosis_name, justification, challenged_diagnosis, challenged_justification, predicted_date)
       VALUES ($1,$2,$3,$4,$5, now())
       RETURNING *`,
      [clientId, diagnosis_name, justification, challenged_diagnosis, challenged_justification]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('DB error', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

app.put('/api/diagnoses/:id', async (req, res) => {
  const { pool } = require('./db');
  const id = req.params.id; 

  const diagnosis_name = req.body.hasOwnProperty('diagnosis_name') ? sanitizeText(req.body.diagnosis_name) : null;
  const justification = req.body.hasOwnProperty('justification') ? sanitizeText(req.body.justification) : null;
  const challenged_diagnosis = req.body.hasOwnProperty('challenged_diagnosis') ? sanitizeText(req.body.challenged_diagnosis) : null;
  const challenged_justification = req.body.hasOwnProperty('challenged_justification') ? sanitizeText(req.body.challenged_justification) : null;

  if (!req.body.hasOwnProperty('diagnosis_name') && !req.body.hasOwnProperty('justification') && 
      !req.body.hasOwnProperty('challenged_diagnosis') && !req.body.hasOwnProperty('challenged_justification')) {
    return res.status(400).json({ error: 'nothing to update' });
  }

  try {
    let setClause = [];
    let values = [];
    let paramIndex = 1;

    if (req.body.hasOwnProperty('diagnosis_name')) {
      setClause.push(`diagnosis_name = $${paramIndex++}`);
      values.push(diagnosis_name);
    }
    if (req.body.hasOwnProperty('justification')) {
      setClause.push(`justification = $${paramIndex++}`);
      values.push(justification);
    }
    if (req.body.hasOwnProperty('challenged_diagnosis')) {
      setClause.push(`challenged_diagnosis = $${paramIndex++}`);
      values.push(challenged_diagnosis);
    }
    if (req.body.hasOwnProperty('challenged_justification')) {
      setClause.push(`challenged_justification = $${paramIndex++}`);
      values.push(challenged_justification);
    }

    setClause.push(`updated_at = now()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE diagnoses SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (rows.length === 0) return res.status(404).json({ error: 'diagnosis not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('DB error', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = app;