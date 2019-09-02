const app = require('../src/app');
const { foldersData, maliciousFolder, expectedFolder } = require('./folders-fixture');

describe('Folders Test', () => {
  let db;

  before('Connect DB', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('Disconnect DB', () => {
    return db.destroy();
  })

  afterEach('Truncate DB', () => {
    return db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE');
  })

  describe('Unauthorized', () => {
    it('/GET unauthorized', () => {
      return supertest(app)
        .get('/api/folders')
        .expect(401, { error: 'Unauthorized request' })
    })

    it('/POST unauthorized', () => {
      return supertest(app)
        .post('/api/folders')
        .send({id: 1, name: 'Folder 1'})
        .expect(401, { error: 'Unauthorized request' })
    })

    it('/DELETE unauthorized', () => {
      return supertest(app)
        .delete('/api/folders/5')
        .expect(401, { error: 'Unauthorized request' })
    })

    it('/PATCH unauthorized', () => {
      return supertest(app)
        .patch('/api/folders/2')
        .send({id: 1, name: 'Folder 1'})
        .expect(401, { error: 'Unauthorized request' })
    })
  })

  describe('GET /', () => {
    it ('GET / get empty folders', () => {
      return supertest(app)
        .get('/api/folders')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(200, [])
    })

    context('With Data', () => {
      beforeEach('Fill table', () => {
        return db.into('folders')
          .insert(foldersData);
      })

      afterEach('truncate table', () => {
        return db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE');
      })

      it ('GET / get all folders', () => {
        return supertest(app)
          .get('/api/folders')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, foldersData)
      })

      it('With XSS',() => {
        return supertest(app)
          .get('/api/folders')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, foldersData);
      })
    })
  })

  describe('POST /', () => {
    afterEach('Clean table', () => {
      return db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE');
    })

    it('Save invalid data', () => {
      const newData = {
        name: ''
      };
      return supertest(app)
        .post('/api/folders')
        .send(newData)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {"error":"name incorrect format"});
    })

    it('Save valid data', () => {
      const newData = {
        name: 'Folder 4'
      };
      return supertest(app)
        .post('/api/folders')
        .send(newData)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(folderSaved => {
          expect(folderSaved.body.name).to.eql(newData.name);
        })
        .then(folderSaved =>
          supertest(app)
            .get(`/api/folders/${folderSaved.body.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(folderSaved.body)
        )
    })

    it('with XSS', () => {
      return supertest(app)
        .post('/api/folders')
        .send(maliciousFolder)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.eql(expectedFolder.name)
        })
    })
  })

  describe('DELETE /folders/:id', () => {
    it(`folder doesn't exist`, () => {
      return supertest(app)
        .delete(`/api/folders/123`)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(404, {
          error: { message: `folder Not Found` }
        })
    })

    context('Given there are folders in the database', () => {

      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(foldersData)
      })

      it('removes the folder by ID from the store', () => {
        const idToRemove = 2
        const expectedFolders = foldersData.filter(bm => bm.id !== idToRemove)
        return supertest(app)
          .delete(`/api/folders/${idToRemove}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(() =>
            supertest(app)
              .get('/api/folders')
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedFolders)
          )
      })
    })
  })

  describe('PATCH /folders/:id', () => {
    it(`responds 404 whe folder doesn't exist`, () => {
      return supertest(app)
        .patch(`/api/folders/123`)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(404, {
          error: { message: `folder Not Found` }
        })
    })

    context('When folder is finded', () => {
      beforeEach('Filling data', () => {
        return db
        .into('folders')
        .insert(foldersData);
      })

      afterEach('Truncate data', () => {
        return db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE');
      })

      it(`responds with 400 missing nothing if supplied`, () => {
        const idToModify = 2
        const folderToBeModified = {}
        return supertest(app)
          .patch(`/api/folders/${idToModify}`)
          .send(folderToBeModified)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(400, { error: 'name incorrect format' })
      })

      it(`responds with 400 invalid 'rating' if not between 0 and 5`, () => {
        const idToModify = 2
        const newFolderInvalidRating = {
          name: ''
        }
        return supertest(app)
          .patch(`/api/folders/${idToModify}`)
          .send(newFolderInvalidRating)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(400, { error: 'name incorrect format' })
      })

      it(`responds with 204 when updating`, () => {
        //const testFolders = fixtures.makeFoldersArray()
        const idToModify = 2
        const updateFolder = {
          name: 'updated article title',
        }
        const expectedFolder = {
          ...foldersData[idToModify - 1],
          ...updateFolder
        }

        return supertest(app)
          .patch(`/api/folders/${idToModify}`)
          .send({
            ...updateFolder,
            fieldToIgnore: 'should not be in GET response'
          })
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders/${idToModify}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedFolder)
            )
      })

      it('removes XSS attack content from response', () => {
        const idToModify = 2
        return supertest(app)
          .patch(`/api/folders/${idToModify}`)
          .send(maliciousFolder)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders/${idToModify}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .then(res => {
                expect(expectedFolder.name).to.eq(res.body.name);
              })
          )
      })
    })

  })

})
