const knex = require('knex')
const app = require('../src/app')
const { foldersData } = require('./folders-fixture');
const { notesData, maliciousNote, expectedNote } = require('./notes-fixture');

describe('Notes Endpoints', function() {
  let db

  before('make knex instance', () => {

    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)

  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () => db.raw('TRUNCATE notes, folders RESTART IDENTITY CASCADE'))

  afterEach('cleanup',() => db.raw('TRUNCATE notes, folders RESTART IDENTITY CASCADE'))

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
        .delete('/api/notes/5')
        .expect(401, { error: 'Unauthorized request' })
    })

    it('/PATCH unauthorized', () => {
      return supertest(app)
        .patch('/api/notes/2')
        .send({id: 1, name: 'Folder 1'})
        .expect(401, { error: 'Unauthorized request' })
    })
  })

  describe(`GET /api/notes`, () => {
    context(`Given no notes`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/notes')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, [])
      })
    })

    context('Given there are notes in the database', () => {

      beforeEach('insert notes', () => {
        return db
          .into('folders')
          .insert(foldersData)
          .then(() => {
            return db
              .into('notes')
              .insert(notesData)
          })
      })

      it('responds with 200 and all of the notes', () => {
        return supertest(app)
          .get('/api/notes')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, notesData)
      })
    })

    context(`Given an XSS attack note`, () => {

      beforeEach('insert malicious note', () => {
        return db
          .into('folders')
          .insert(foldersData)
          .then(() => {
            return db
              .into('notes')
              .insert([ maliciousNote ])
          })
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/notes`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedNote.title)
            expect(res.body[0].content).to.eql(expectedNote.content)
          })
      })
    })
  })

  describe(`GET /api/notes/:note_id`, () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `note Not Found` } })
      })
    })

    context('Given there are notes in the database', () => {

      beforeEach('insert notes', () => {
        return db
          .into('folders')
          .insert(foldersData)
          .then(() => {
            return db
              .into('notes')
              .insert(notesData)
          })
      })

      it('responds with 200 and the specified note', () => {
        const noteId = 2
        const expectedNote = notesData[noteId - 1]
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedNote)
      })
    })

    context(`Given an XSS attack note`, () => {

      beforeEach('insert malicious note', () => {
        return db
          .into('folders')
          .insert(foldersData)
          .then(() => {
            return db
              .into('notes')
              .insert([ maliciousNote ])
          })
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/notes/${maliciousNote.id}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body.name).to.eql(expectedNote.name)
            expect(res.body.content).to.eql(expectedNote.content)
          })
      })
    })
  })

  describe(`POST /api/notes`, () => {

    beforeEach('insert malicious note', () => {
      return db
        .into('folders')
        .insert(foldersData)
    })

    it(`creates an note, responding with 201 and the new note`, () => {
      const newNote = {
        name:'Note 9',
        content: 'COnteeeen 9',
        folder_id: 3
      }
      return supertest(app)
        .post('/api/notes')
        .send(newNote)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.eql(newNote.name)
          expect(res.body.content).to.eql(newNote.content)
          expect(res.body.folder_id).to.eql(newNote.folder_id)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`)
          const expected = new Intl.DateTimeFormat('en-US').format(new Date())
          const actual = new Intl.DateTimeFormat('en-US').format(new Date(res.body.modified))
          expect(actual).to.eql(expected)
        })
        .then(res =>
          supertest(app)
            .get(`/api/notes/${res.body.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(res.body)
        )
    })

    const requiredFields = ['name', 'folder_id', 'content']

    requiredFields.forEach(field => {
      const newNote = {
        name:'Note 19',
        content: 'COnteeeen 19',
        folder_id: 3
      }

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newNote[field]

        return supertest(app)
          .post('/api/notes')
          .send(newNote)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(400, {
            error: { message: `${field}' is required` }
          })
      })
    })

    it('removes XSS attack content from response', () => {
      return supertest(app)
        .post(`/api/notes`)
        .send(maliciousNote)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedNote.title)
          expect(res.body.content).to.eql(expectedNote.content)
        })
    })
  })

  describe(`DELETE /api/notes/:note_id`, () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456
        return supertest(app)
          .delete(`/api/notes/${noteId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `note Not Found` } })
      })
    })

    context('Given there are notes in the database', () => {

      beforeEach('insert notes', () => {
        return db
          .into('folders')
          .insert(foldersData)
          .then(() => {
            return db
              .into('notes')
              .insert(notesData)
          })
      })

      it('responds with 204 and removes the note', () => {
        const idToRemove = 2
        const expectedNotes = notesData.filter(note => note.id !== idToRemove)
        return supertest(app)
          .delete(`/api/notes/${idToRemove}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedNotes)
          )
      })
    })
  })

  describe(`PATCH /api/notes/:note_id`, () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456
        return supertest(app)
          .delete(`/api/notes/${noteId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `note Not Found` } })
      })
    })

    context('Given there are notes in the database', () => {

      beforeEach('insert notes', () => {
        return db
          .into('folders')
          .insert(foldersData)
          .then(() => {
            return db
              .into('notes')
              .insert(notesData)
          })
      })

      it('responds with 204 and updates the note', () => {
        const idToUpdate = 2
        const updateNote = {
          name: 'updated note title',
          folder_id: 1,
          content: 'updated note content',
        }
        const expectedNote = {
          ...notesData[idToUpdate - 1],
          ...updateNote
        }
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send(updateNote)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(res => {
                expect(res.body.name).to.eql(updateNote.name)
                expect(res.body.content).to.eql(updateNote.content)
                expect(res.body.folder_id).to.eql(updateNote.folder_id)
                expect(res.body).to.have.property('id')
                const expected = new Intl.DateTimeFormat('en-US').format(new Date())
                const actual = new Intl.DateTimeFormat('en-US').format(new Date(res.body.modified))
                expect(actual).to.eql(expected)
              })
          )
      })

      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({ irrelevantField: 'foo' })
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(400, {
            error: {
              message: `Request body must content either 'name', 'content' or 'folder_id'`
            }
          })
      })

      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2
        const updateNote = {
          name: 'updated note title',
        }
        const expectedNote = {
          ...notesData[idToUpdate - 1],
          ...updateNote
        }

        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({
            ...updateNote,
            fieldToIgnore: 'should not be in GET response'
          })
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(res => {
                expect(res.body.name).to.eql(expectedNote.name)
                expect(res.body.content).to.eql(expectedNote.content)
                expect(res.body.folder_id).to.eql(expectedNote.folder_id)
                expect(res.body).to.have.property('id')
                const expected = new Intl.DateTimeFormat('en-US').format(new Date())
                const actual = new Intl.DateTimeFormat('en-US').format(new Date(res.body.modified))
                expect(actual).to.eql(expected)
              })
          )
      })

      it('removes XSS attack content from response', () => {
        const idToModify = 2
        return supertest(app)
          .patch(`/api/notes/${idToModify}`)
          .send(maliciousNote)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes/${idToModify}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .then(res => {
                expect(expectedNote.name).to.eq(res.body.name);
                expect(expectedNote.content).to.eq(res.body.content);
              })
          )
      })
    })
  })
})
