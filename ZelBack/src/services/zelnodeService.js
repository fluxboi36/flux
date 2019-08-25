const mongodb = require('mongodb')
const config = require('config')
const cmd = require('node-cmd')
const path = require('path')
const userconfig = require('../../../config/userconfig')
const log = require('../lib/log')
const MongoClient = mongodb.MongoClient
const mongoUrl = 'mongodb://' + config.database.url + ':' + config.database.port + '/'
const goodchars = /^[1-9a-km-zA-HJ-NP-Z]+$/
const bitcoinMessage = require('bitcoinjs-message')
const qs = require('qs')

function updateFlux(req, res) {
  
  verifyZelTeamSession(req.headers, function (error, authorized) {
    if (error) {
      return res.json(error)
    }
    if (authorized === true) {
      const zelnodedpath = path.join(__dirname, '../../../')
      const exec = `cd ${zelnodedpath} && npm run updateflux`
      cmd.get(exec, (err) => {
        if (err) {
          const errMessage = {
            status: 'error',
            data: {
              message: 'Error updating Flux' + err
            }
          }
          return res.json(errMessage)
        } else {
          const message = {
            status: 'success',
            data: {
              message: 'Flux successfully updated'
            }
          }
          return res.json(message)
        }
      })
    } else {
      const errMessage = {
        status: 'error',
        data: {
          message: 'Unauthorized. Access denied.'
        }
      }
      return res.json(errMessage)
    }
  })
}

// Verification functions

function verifyAdminSession(headers, callback) {
  if (headers && headers.zelidauth) {
    const auth = qs.parse(headers.zelidauth)
    console.log(auth)
    if (auth.zelid && auth.signature) {
      console.log(auth.zelid)
      console.log(auth.signature)
      console.log(userconfig.initial.zelid)
      if (auth.zelid === userconfig.initial.zelid) {
        connectMongoDb(mongoUrl, function (err, db) {
          if (err) {
            log.error('Cannot reach MongoDB')
            log.error(err)
            callback(null, false)
          }
          const database = db.db(config.database.local.database)
          const collection = config.database.local.collections.loggedUsers
          const query = { $and: [{ signature: auth.signature }, { zelid: auth.zelid }] }
          const projection = {}
          findOneInDatabase(database, collection, query, projection, function (err, result) {
            if (err) {
              log.error('Error accessing local zelID collection')
              log.error(err)
              db.close()
              callback(null, false)
            }
            const loggedUser = result
            // console.log(result)
            db.close()
            if (loggedUser) {
              // check if signature corresponds to message with that zelid
              let valid = false
              try {
                valid = bitcoinMessage.verify(loggedUser.loginPhrase, auth.zelid, auth.signature)
              } catch (error) {
                callback(null, false)
              }
              // console.log(valid)
              if (valid) {
                // now we know this is indeed a logged admin
                // console.log('here')
                callback(null, true)
              }
            } else {
              callback(null, false)
            }
          })
        })
      } else {
        callback(null, false)
      }
    } else {
      callback(null, false)
    }
  } else {
    callback(null, false)
  }
}

function verifyUserSession(headers, callback) {
  if (headers && headers.zelidauth) {
    const auth = qs.parse(headers.zelidauth)
    console.log(auth)
    if (auth.zelid && auth.signature) {
      connectMongoDb(mongoUrl, function (err, db) {
        if (err) {
          log.error('Cannot reach MongoDB')
          log.error(err)
          callback(null, false)
        }
        const database = db.db(config.database.local.database)
        const collection = config.database.local.collections.loggedUsers
        const query = { $and: [{ signature: auth.signature }, { zelid: auth.zelid }] }
        const projection = {}
        findOneInDatabase(database, collection, query, projection, function (err, result) {
          if (err) {
            log.error('Error accessing local zelID collection')
            log.error(err)
            db.close()
            callback(null, false)
          }
          const loggedUser = result
          // console.log(result)
          db.close()
          if (loggedUser) {
            // check if signature corresponds to message with that zelid
            let valid = false
            try {
              valid = bitcoinMessage.verify(loggedUser.loginPhrase, auth.zelid, auth.signature)
            } catch (error) {
              callback(null, false)
            }
            // console.log(valid)
            if (valid) {
              // now we know this is indeed a logged admin
              // console.log('here')
              callback(null, true)
            }
          } else {
            callback(null, false)
          }
        })
      })
    } else {
      callback(null, false)
    }
  } else {
    callback(null, false)
  }
}

function verifyZelTeamSession(headers, callback) {
  if (headers && headers.zelidauth) {
    const auth = qs.parse(headers.zelidauth)
    console.log(auth)
    if (auth.zelid && auth.signature) {
      if (auth.zelid === config.zelTeamZelId || auth.zelid === userconfig.initial.zelid) { // admin is considered as zelTeam
        connectMongoDb(mongoUrl, function (err, db) {
          if (err) {
            log.error('Cannot reach MongoDB')
            log.error(err)
            callback(null, false)
          }
          const database = db.db(config.database.local.database)
          const collection = config.database.local.collections.loggedUsers
          const query = { $and: [{ signature: auth.signature }, { zelid: auth.zelid }] }
          const projection = {}
          findOneInDatabase(database, collection, query, projection, function (err, result) {
            if (err) {
              log.error('Error accessing local zelID collection')
              log.error(err)
              db.close()
              callback(null, false)
            }
            const loggedUser = result
            // console.log(result)
            db.close()
            if (loggedUser) {
              // check if signature corresponds to message with that zelid
              let valid = false
              try {
                valid = bitcoinMessage.verify(loggedUser.loginPhrase, auth.zelid, auth.signature)
              } catch (error) {
                callback(null, false)
              }
              // console.log(valid)
              if (valid) {
                // now we know this is indeed a logged admin
                // console.log('here')
                callback(null, true)
              }
            } else {
              callback(null, false)
            }
          })
        })
      } else {
        callback(null, false)
      }
    } else {
      callback(null, false)
    }
  } else {
    callback(null, false)
  }
}

// MongoDB functions
function connectMongoDb(url, callback) {
  MongoClient.connect(url, function (err, db) {
    if (err) {
      callback(err)
    } else {
      callback(null, db)
    }
  })
}

function findInDatabase(database, collection, query, projection, callback) {
  database.collection(collection).find(query, projection)
    .toArray(function (err, results) {
      if (err) {
        callback(err)
      } else {
        callback(null, results)
      }
    })
}

function findOneInDatabase(database, collection, query, projection, callback) {
  database.collection(collection).findOne(query, projection, function (err, result) {
    if (err) {
      callback(err)
    } else {
      callback(null, result)
    }
  })
}

function insertOneToDatabase(database, collection, value, callback) {
  database.collection(collection).insertOne(value, function (err, result) {
    if (err) {
      callback(err)
    } else {
      callback(null, result)
    }
  })
}

function findOneAndDeleteInDatabase(database, collection, query, projection, callback) {
  database.collection(collection).findOneAndDelete(query, projection, function (err, result) {
    if (err) {
      callback(err)
    } else {
      callback(null, result)
    }
  })
}

function removeDocumentsFromCollection(database, collection, query, callback) {
  // to remove all documents from collection, the query is just {}
  database.collection(collection).remove(query, function (err, result) {
    if (err) {
      callback(err)
    } else {
      callback(null, result)
    }
  })
}

module.exports = {
  updateFlux
}