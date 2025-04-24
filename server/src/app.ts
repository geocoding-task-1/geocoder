
import {createServer} from './server'

createServer()
  .then(server => {
    server.listen(8080, () => {
      console.info(`Listening on http://localhost:8080`)
    })
  })
  .catch(err => {
    console.error(`Error: ${err}`)
  })