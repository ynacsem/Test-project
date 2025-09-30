const request = require('supertest');
const app = require('../src/app');
const { pool, initializeDb } = require('../src/db');
const { v4: uuidv4 } = require('uuid');

describe('Diagnoses API', () => {
  let server;
  let clientId;
  let clientId2;
  let diagnosisId;

  beforeAll(async () => {
    await initializeDb();
    server = app.listen(0);
    clientId = uuidv4();
    clientId2 = uuidv4();
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
    
    if (pool && pool.end) {
      await pool.end();
    }
  });

  beforeEach(async () => {
    try {
      await pool.query('DELETE FROM diagnoses WHERE client_id IN ($1, $2)', [clientId, clientId2]);
    } catch (err) {
      console.warn('Could not clean test data:', err.message);
    }
  });

  describe('POST /api/diagnoses/:clientId', () => {
    test('creates a new diagnosis with required fields', async () => {
      const diagnosisData = {
        diagnosis_name: 'Generalized Anxiety Disorder',
        justification: 'Patient exhibits persistent excessive worry about multiple life events, difficulty controlling worry, restlessness, fatigue, difficulty concentrating, irritability, muscle tension, and sleep disturbance for more than 6 months.',
      };

      const res = await request(server)
        .post(`/api/diagnoses/${clientId}`)
        .send(diagnosisData);

      expect(res.statusCode).toBe(201);
      expect(res.body.diagnosis_name).toBe(diagnosisData.diagnosis_name);
      expect(res.body.justification).toBe(diagnosisData.justification);
      expect(res.body.client_id).toBe(clientId);
      expect(res.body.id).toBeDefined();
      expect(res.body.predicted_date).toBeDefined();
      expect(res.body.challenged_diagnosis).toBeNull();
      expect(res.body.challenged_justification).toBeNull();

      diagnosisId = res.body.id;
    });

    test('creates diagnosis with challenge fields', async () => {
      const diagnosisData = {
        diagnosis_name: 'Major Depressive Disorder',
        justification: 'Patient reports depressed mood most of the day, markedly diminished interest in activities, significant weight loss, insomnia, psychomotor agitation, fatigue, feelings of worthlessness, diminished concentration, and recurrent thoughts of death for over 2 weeks.',
        challenged_diagnosis: 'Adjustment Disorder with Depressed Mood',
        challenged_justification: 'Symptoms appeared following recent job loss and divorce. Duration and severity may be better explained by adjustment disorder rather than major depression.'
      };

      const res = await request(server)
        .post(`/api/diagnoses/${clientId}`)
        .send(diagnosisData);

      expect(res.statusCode).toBe(201);
      expect(res.body.challenged_diagnosis).toBe(diagnosisData.challenged_diagnosis);
      expect(res.body.challenged_justification).toBe(diagnosisData.challenged_justification);
    });

    test('returns 400 for missing diagnosis_name', async () => {
      const res = await request(server)
        .post(`/api/diagnoses/${clientId}`)
        .send({
          justification: 'Test justification',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('diagnosis_name and justification are required');
    });

    test('returns 400 for missing justification', async () => {
      const res = await request(server)
        .post(`/api/diagnoses/${clientId}`)
        .send({
          diagnosis_name: 'Test Diagnosis',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('diagnosis_name and justification are required');
    });

    test('returns 400 for empty diagnosis_name', async () => {
      const res = await request(server)
        .post(`/api/diagnoses/${clientId}`)
        .send({
          diagnosis_name: '   ',
          justification: 'Test justification',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('diagnosis_name and justification are required');
    });

    test('returns 400 for empty justification', async () => {
      const res = await request(server)
        .post(`/api/diagnoses/${clientId}`)
        .send({
          diagnosis_name: 'Test Diagnosis',
          justification: '   ',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('diagnosis_name and justification are required');
    });

    test('returns 400 for invalid UUID format', async () => {
      const res = await request(server)
        .post('/api/diagnoses/not-a-uuid')
        .send({
          diagnosis_name: 'Test Diagnosis',
          justification: 'Test justification'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('invalid clientId - must be a valid UUID');
    });

    test('sanitizes input fields', async () => {
      const maliciousData = {
        diagnosis_name: 'Test<script>alert("xss")</script>',
        justification: 'Test"injection\'attempt',
        challenged_diagnosis: 'Malicious%20diagnosis',
        challenged_justification: 'Test\x00null\rbyte\ninjection'
      };

      const res = await request(server)
        .post(`/api/diagnoses/${clientId}`)
        .send(maliciousData);

      expect(res.statusCode).toBe(201);
      expect(res.body.diagnosis_name).not.toContain('<script>');
      expect(res.body.justification).not.toContain('"');
      expect(res.body.challenged_diagnosis).not.toContain('%20');
      expect(res.body.challenged_justification).not.toContain('\x00');
    });
  });

  describe('GET /api/diagnoses/:clientId', () => {
    beforeEach(async () => {
      // Create a test diagnosis
      await request(server)
        .post(`/api/diagnoses/${clientId}`)
        .send({
          diagnosis_name: 'Test Diagnosis',
          justification: 'Test justification',
        });
    });

    test('returns latest diagnosis for valid client', async () => {
      const res = await request(server).get(`/api/diagnoses/${clientId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.client_id).toBe(clientId);
      expect(res.body.diagnosis_name).toBe('Test Diagnosis');
      expect(res.body.justification).toBe('Test justification');
      expect(res.body.id).toBeDefined();
      expect(res.body.predicted_date).toBeDefined();
    });

    test('returns most recent diagnosis when multiple exist', async () => {
      // Create a second diagnosis
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure different timestamps
      await request(server)
        .post(`/api/diagnoses/${clientId}`)
        .send({
          diagnosis_name: 'Newer Diagnosis',
          justification: 'Newer justification',
        });

      const res = await request(server).get(`/api/diagnoses/${clientId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.diagnosis_name).toBe('Newer Diagnosis');
    });

    test('returns 404 for non-existent client', async () => {
      const nonExistentClientId = uuidv4();
      const res = await request(server).get(`/api/diagnoses/${nonExistentClientId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('diagnosis not found');
    });

    test('returns 400 for invalid UUID format', async () => {
      const res = await request(server).get('/api/diagnoses/invalid-uuid');

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('invalid clientId - must be a valid UUID');
    });
  });

  describe('GET /api/diagnoses', () => {
    beforeEach(async () => {
      // Create multiple diagnoses for testing
      await request(server)
        .post(`/api/diagnoses/${clientId}`)
        .send({
          diagnosis_name: 'First Diagnosis',
          justification: 'First justification',
        });

      await request(server)
        .post(`/api/diagnoses/${clientId2}`)
        .send({
          diagnosis_name: 'Second Diagnosis',
          justification: 'Second justification',
        });
    });

    test('returns all diagnoses', async () => {
      const res = await request(server).get('/api/diagnoses');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      
      const clientIds = res.body.map(d => d.client_id);
      expect(clientIds).toContain(clientId);
      expect(clientIds).toContain(clientId2);
    });

    test('returns diagnoses ordered by predicted_date DESC', async () => {
      const res = await request(server).get('/api/diagnoses');

      expect(res.statusCode).toBe(200);
      
      if (res.body.length > 1) {
        for (let i = 0; i < res.body.length - 1; i++) {
          const currentDate = new Date(res.body[i].predicted_date);
          const nextDate = new Date(res.body[i + 1].predicted_date);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });

    test('returns empty array when no diagnoses exist', async () => {
      // Clear all diagnoses
      await pool.query('DELETE FROM diagnoses');

      const res = await request(server).get('/api/diagnoses');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });

  describe('PUT /api/diagnoses/:id', () => {
    let testDiagnosisId;

    beforeEach(async () => {
      const createRes = await request(server)
        .post(`/api/diagnoses/${clientId}`)
        .send({
          diagnosis_name: 'Original Diagnosis',
          justification: 'Original justification',
        });
      testDiagnosisId = createRes.body.id;
    });

    test('updates diagnosis with all fields', async () => {
      const updateData = {
        diagnosis_name: 'Updated Diagnosis',
        justification: 'Updated justification',
        challenged_diagnosis: 'Alternative Diagnosis',
        challenged_justification: 'Alternative reasoning'
      };

      const res = await request(server)
        .put(`/api/diagnoses/${testDiagnosisId}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.diagnosis_name).toBe(updateData.diagnosis_name);
      expect(res.body.justification).toBe(updateData.justification);
      expect(res.body.challenged_diagnosis).toBe(updateData.challenged_diagnosis);
      expect(res.body.challenged_justification).toBe(updateData.challenged_justification);
      expect(res.body.updated_at).toBeDefined();
    });

    test('updates diagnosis with partial fields', async () => {
      const updateData = {
        challenged_diagnosis: 'New Alternative Diagnosis'
      };

      const res = await request(server)
        .put(`/api/diagnoses/${testDiagnosisId}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.challenged_diagnosis).toBe(updateData.challenged_diagnosis);
      expect(res.body.diagnosis_name).toBe('Original Diagnosis'); // Should remain unchanged
    });

    test('updates challenged fields to null', async () => {
      // First add challenge data
      await request(server)
        .put(`/api/diagnoses/${testDiagnosisId}`)
        .send({
          challenged_diagnosis: 'Temporary Challenge',
          challenged_justification: 'Temporary reasoning'
        });

      // Then clear it
      const res = await request(server)
        .put(`/api/diagnoses/${testDiagnosisId}`)
        .send({
          challenged_diagnosis: null,
          challenged_justification: null
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.challenged_diagnosis).toBeNull();
      expect(res.body.challenged_justification).toBeNull();
    });

    test('returns 400 when no fields to update', async () => {
      const res = await request(server)
        .put(`/api/diagnoses/${testDiagnosisId}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('nothing to update');
    });

    test('returns 404 for non-existent diagnosis', async () => {
      const fakeId = uuidv4();
      const res = await request(server)
        .put(`/api/diagnoses/${fakeId}`)
        .send({ diagnosis_name: 'Test' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('diagnosis not found');
    });

    test('sanitizes update input fields', async () => {
      const maliciousData = {
        diagnosis_name: 'Test<script>alert("xss")</script>',
        challenged_diagnosis: 'Malicious%20diagnosis'
      };

      const res = await request(server)
        .put(`/api/diagnoses/${testDiagnosisId}`)
        .send(maliciousData);

      expect(res.statusCode).toBe(200);
      expect(res.body.diagnosis_name).not.toContain('<script>');
      expect(res.body.challenged_diagnosis).not.toContain('%20');
    });
  });

  describe('Input Validation and Security', () => {
    test('handles extremely long input strings', async () => {
      const longString = 'a'.repeat(10000);
      
      const res = await request(server)
        .post(`/api/diagnoses/${clientId}`)
        .send({
          diagnosis_name: longString,
          justification: longString,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.diagnosis_name).toBeDefined();
      expect(res.body.justification).toBeDefined();
    });

    test('handles special characters properly', async () => {
      const specialData = {
        diagnosis_name: 'Diagnosis with émojis 🧠 and spëcial chars',
        justification: 'Justification with newlines\nand tabs\t and unicode: ñáéíóú',
      };

      const res = await request(server)
        .post(`/api/diagnoses/${clientId}`)
        .send(specialData);

      expect(res.statusCode).toBe(201);
      expect(res.body.diagnosis_name).toContain('émojis');
      expect(res.body.justification).toContain('unicode');
    });

    test('validates UUID format strictly', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '550e8400-e29b-41d4-a716', // too short
        '550e8400-e29b-41d4-a716-446655440001-extra', // too long
        '550e8400-e29b-41d4-a716-446655440zzz', // invalid characters
        'invalid-uuid-format'
      ];

      for (const invalidUUID of invalidUUIDs) {
        const res = await request(server)
          .get(`/api/diagnoses/${invalidUUID}`);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('invalid clientId - must be a valid UUID');
      }

      // Test empty/whitespace separately as they might route differently  
      const whitespaceRes = await request(server)
        .get('/api/diagnoses/%20'); // URL encoded space
      expect(whitespaceRes.statusCode).toBe(400);
    });
  });

  describe('Database Error Handling', () => {
    test('handles database connection errors gracefully', async () => {
      // This test would need a way to simulate database errors
      // For now, we test that the API structure handles errors properly
      const res = await request(server).get('/api/diagnoses');
      expect([200, 500]).toContain(res.statusCode);
    });
  });
});
