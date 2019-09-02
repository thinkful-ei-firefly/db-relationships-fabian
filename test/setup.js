process.env.TZ = 'UTC';
require('dotenv').config();
const { expect } = require('chai');
const supertest = require('supertest');
const knex = require('knex');

global.expect = expect;
global.supertest = supertest;
global.knex = knex;
