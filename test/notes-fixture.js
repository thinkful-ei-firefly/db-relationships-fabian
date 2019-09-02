const notesData = [{
  id: 1,
  name:'Note 1',
  modified: '2100-05-22T11:28:32.615Z',
  content: 'COnteeeen 1',
  folder_id: 1
},{
  id: 2,
  name:'Note 2',
  modified: '2100-05-22T12:28:32.615Z',
  content: 'COnteeeen 3',
  folder_id: 3
},{
  id: 3,
  name:'Note 3',
  modified: '2100-05-22T13:28:32.615Z',
  content: 'COnteeeen 3',
  folder_id: 3
},{
  id: 4,
  name:'Note 4',
  modified: '2100-05-22T14:28:32.615Z',
  content: 'COnteeeen 4',
  folder_id: 2
},{
  id: 5,
  name:'Note 5',
  modified: '2100-05-22T15:28:32.615Z',
  content: 'COnteeeen 5',
  folder_id: 2
},{
  id: 6,
  name:'Note 6',
  modified: '2100-05-22T16:28:32.615Z',
  content: 'COnteeeen 6',
  folder_id: 3
},{
  id: 7,
  name:'Note 7',
  modified: '2100-05-22T17:28:32.615Z',
  content: 'COnteeeen 7',
  folder_id: 1
},{
  id: 8,
  name:'Note 8',
  modified: '2100-05-22T18:28:32.615Z',
  content: 'COnteeeen 8',
  folder_id: 1
}]

const maliciousNote = {
  id:1,
  name: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
  modified: '2100-05-22T11:28:32.615Z',
  content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
  folder_id: 1
}
const expectedNote = {
  ...maliciousNote,
  name: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`,
  content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`,
  folder_id: 1
}

module.exports = { notesData, maliciousNote, expectedNote }
