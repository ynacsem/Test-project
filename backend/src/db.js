const {Pool} = require('pg');
require('dotenv').config();
const fs = require('fs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
})

async function initializeDb(){
    const schema = fs.readFileSync('./schema.sql', 'utf-8');
    try {
        await pool.query(schema);
    } catch (error) {
        console.error('Error initializing database:', error);
    }
    console.log('connected')
} 


module.exports = {pool , initializeDb}