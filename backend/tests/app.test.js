const request = require('supertest');
const { app, server } = require('../server');

describe('API Health Check', () => {
  afterAll((done) => {
    server.close(done);
  });

  it('GET /health should return 200 and status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('timestamp');
  });
});
